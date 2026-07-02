"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { getLiveToken } from "@/lib/api";

// Gemini Live expects 16 kHz mono little-endian PCM.
const SAMPLE_RATE = 16000;
// Samples to accumulate before flushing a chunk (~128 ms at 16 kHz). Small
// enough to stream with low latency, large enough to avoid tiny WS frames.
const FLUSH_SAMPLES = 2048;

// AudioWorklet module: runs on the audio thread. It accumulates input frames,
// converts Float32 → 16-bit PCM there (off the main thread), and posts the raw
// buffer to the main thread as a transferable (zero-copy). Kept as a string so
// we don't need a separate public asset — loaded via a blob URL.
const PCM_WORKLET_SRC = `
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._pending = [];
    this._len = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      // slice() copies: the input buffer is reused across render quanta.
      this._pending.push(ch.slice(0));
      this._len += ch.length;
      if (this._len >= ${FLUSH_SAMPLES}) {
        const merged = new Float32Array(this._len);
        let offset = 0;
        for (const b of this._pending) { merged.set(b, offset); offset += b.length; }
        this._pending = [];
        this._len = 0;
        const pcm = new Int16Array(merged.length);
        for (let i = 0; i < merged.length; i++) {
          const s = merged[i] < -1 ? -1 : merged[i] > 1 ? 1 : merged[i];
          pcm[i] = s * 0x7fff;
        }
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
      }
    }
    return true;
  }
}
registerProcessor("pcm-worklet", PcmWorklet);
`;

interface UseVoiceTranscriptionOptions {
  /** Called with each chunk of transcribed text as it arrives from Gemini. */
  onTranscript: (text: string) => void;
}

interface UseVoiceTranscription {
  listening: boolean;
  /** True between clicking start and the session being ready. */
  connecting: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Base64-encode a PCM buffer. Uses chunked `String.fromCharCode.apply` instead
 * of a per-byte `+=` loop — an order of magnitude faster for kilobyte frames,
 * while staying under the argument-count limit that a full spread would hit.
 */
function pcmBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(binary);
}

/**
 * Streams microphone audio directly to the Gemini Live API and reports the
 * transcribed text via `onTranscript`. Uses a backend-minted ephemeral token
 * so the real API key never reaches the browser (see /api/live-token).
 */
export function useVoiceTranscription({
  onTranscript,
}: UseVoiceTranscriptionOptions): UseVoiceTranscription {
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback without forcing start/stop to be re-created.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stop = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      sessionRef.current?.close();
    } catch {
      /* already closed */
    }
    sessionRef.current = null;

    setListening(false);
    setConnecting(false);
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current || connecting) return;
    setError(null);
    setConnecting(true);

    try {
      const { token, model } = await getLiveToken();

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const session = await ai.live.connect({
        model,
        // Config is locked by the backend token constraints; don't re-send it.
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            const sc = msg.serverContent;
            // The recognized text can arrive as a model text turn OR via the
            // (interim/final) input/output transcription fields, depending on
            // the model. Emit whatever text we find.
            for (const part of sc?.modelTurn?.parts ?? []) {
              if (part.text) onTranscriptRef.current(part.text);
            }
            const t =
              sc?.outputTranscription?.text ??
              sc?.inputTranscription?.text ??
              sc?.interimInputTranscription?.text;
            if (t) onTranscriptRef.current(t);
          },
          onerror: (e) => {
            setError(e?.message ?? "Voice connection error");
            stop();
          },
          onclose: (e) => {
            // A clean end-of-turn closes with code 1000; anything else is a
            // real failure (bad model, expired/invalid token, quota) that would
            // otherwise be invisible.
            if (e && e.code !== 1000) {
              setError(
                `Voice connection closed (${e.code}): ${e.reason || "unknown reason"}`,
              );
            }
            setListening(false);
          },
        },
      });
      sessionRef.current = session;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;
      // A context created inside a gesture may still start suspended; without a
      // running context the worklet never runs (so no audio is ever sent).
      if (audioCtx.state === "suspended") await audioCtx.resume();

      // Load the PCM worklet from an inline blob module.
      const moduleUrl = URL.createObjectURL(
        new Blob([PCM_WORKLET_SRC], { type: "application/javascript" }),
      );
      try {
        await audioCtx.audioWorklet.addModule(moduleUrl);
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const worklet = new AudioWorkletNode(audioCtx, "pcm-worklet");
      workletRef.current = worklet;
      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (!sessionRef.current) return;
        sessionRef.current.sendRealtimeInput({
          media: {
            data: pcmBufferToBase64(e.data),
            mimeType: `audio/pcm;rate=${SAMPLE_RATE}`,
          },
        });
      };

      source.connect(worklet);
      // Keep the node in the graph; it writes no output so it stays silent.
      worklet.connect(audioCtx.destination);

      setConnecting(false);
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start voice input");
      stop();
    }
  }, [connecting, stop]);

  // Release the mic / socket if the component unmounts mid-session.
  useEffect(() => stop, [stop]);

  return { listening, connecting, error, start, stop };
}
