"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { getLiveToken } from "@/lib/api";

// Gemini Live returns 24 kHz mono PCM audio.
const OUTPUT_SAMPLE_RATE = 24000;
// Max characters per generated chunk. Long single turns make the native-audio
// model stall or close with 1011, so we split into sentence-sized pieces,
// generate them in parallel, and stitch the audio back together.
const CHUNK_MAX_CHARS = 180;
// Hard cap so a wedged chunk session can't hang the whole playback forever.
const CHUNK_TIMEOUT_MS = 30_000;

export type TtsStatus = "idle" | "loading" | "playing";

/**
 * Module-level cache of the fully-decoded PCM for a line (one merged Float32
 * buffer) keyed by caller-supplied key (session + turn + line). Replaying a
 * cached line never re-invokes the API and plays as a single node. Lives for
 * the page lifetime, shared across every hook instance.
 */
const ttsCache = new Map<string, Float32Array>();

// 1/32768 — a power of two, so the int16→float scale is exact and branch-free.
const INV_INT16 = 1 / 0x8000;

// One shared 24 kHz context for playback (browsers cap the number of contexts).
// A *running* context keeps a real-time audio thread awake and burns CPU even
// while idle, so we suspend it whenever nothing is scheduled and resume on play.
let sharedCtx: AudioContext | null = null;
let activeSources = 0;

function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new AC({ sampleRate: OUTPUT_SAMPLE_RATE });
  }
  return sharedCtx;
}

/** Suspend the shared context once no sources are playing (stops CPU wakeups). */
function suspendContextIfIdle() {
  if (activeSources <= 0 && sharedCtx && sharedCtx.state === "running") {
    activeSources = 0;
    void sharedCtx.suspend();
  }
}

/** Decode a base64 PCM16 chunk into a Float32 sample buffer (-1..1). */
function base64PcmToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  // View the bytes as int16 and scale in a single pass (multiply, not divide).
  const pcm16 = new Int16Array(bytes.buffer, 0, len >> 1);
  const n = pcm16.length;
  const f32 = new Float32Array(n);
  for (let i = 0; i < n; i++) f32[i] = pcm16[i] * INV_INT16;
  return f32;
}

/** Concatenate audio buffers into one contiguous buffer (for stitch/caching). */
function concatFloat32(chunks: Float32Array[]): Float32Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Split text into speakable chunks (≤ CHUNK_MAX_CHARS), preferring sentence
 * boundaries and falling back to word boundaries for very long sentences.
 */
function chunkText(text: string, maxLen = CHUNK_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean ? [clean] : [];

  const sentences = clean.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = "";
  };

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > maxLen) {
      flush();
      // Hard-split an over-long sentence on word boundaries.
      let piece = "";
      for (const word of s.split(" ")) {
        if ((`${piece} ${word}`).trim().length > maxLen) {
          if (piece) chunks.push(piece.trim());
          piece = word;
        } else {
          piece = piece ? `${piece} ${word}` : word;
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
    } else if ((`${cur} ${s}`).trim().length > maxLen) {
      flush();
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  flush();
  return chunks;
}

interface UseTextToSpeech {
  /** The cache key currently loading/playing, or null when idle. */
  activeKey: string | null;
  status: TtsStatus;
  error: string | null;
  /** Play the line for `key`; clicking the same key again stops it. */
  toggle: (
    key: string,
    text: string,
    emotion?: string,
    voiceName?: string,
  ) => void;
  stop: () => void;
}

/**
 * Speaks a line of text via the Gemini Live API (AUDIO output). Long lines are
 * split into sentence-sized chunks generated in parallel and stitched together
 * (each chunk gets its own single-use token/session), which avoids the stalls /
 * 1011 closes that long single turns hit. One line plays at a time; results are
 * cached per key so repeat plays are instant and free.
 */
export function useTextToSpeech(): UseTextToSpeech {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const sessionsRef = useRef<Session[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartRef = useRef(0);
  const streamDoneRef = useRef(false);
  const activeKeyRef = useRef<string | null>(null);
  // Bumped on every stop/new toggle; in-flight generation checks it to abort.
  const runIdRef = useRef(0);

  const stop = useCallback(() => {
    runIdRef.current++; // invalidate any in-flight chunk generation
    for (const src of sourcesRef.current) {
      try {
        src.onended = null;
        src.stop();
        activeSources--;
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
    suspendContextIfIdle();
    for (const s of sessionsRef.current) {
      try {
        s.close();
      } catch {
        /* already closed */
      }
    }
    sessionsRef.current = [];
    nextStartRef.current = 0;
    streamDoneRef.current = false;
    activeKeyRef.current = null;
    setActiveKey(null);
    setStatus("idle");
  }, []);

  /** Schedule one PCM buffer for gapless playback; drive idle on completion. */
  const scheduleChunk = useCallback((f32: Float32Array, key: string) => {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(1, f32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(f32);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextStartRef.current);
    src.start(startAt);
    nextStartRef.current = startAt + buffer.duration;

    sourcesRef.current.push(src);
    activeSources++;
    src.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
      activeSources--;
      suspendContextIfIdle();
      if (
        streamDoneRef.current &&
        sourcesRef.current.length === 0 &&
        activeKeyRef.current === key
      ) {
        activeKeyRef.current = null;
        setActiveKey(null);
        setStatus("idle");
      }
    };
  }, []);

  const playMerged = useCallback(
    (key: string, merged: Float32Array) => {
      if (merged.length === 0) {
        stop();
        return;
      }
      setStatus("playing");
      streamDoneRef.current = true; // we already have every sample
      scheduleChunk(merged, key); // one node for the whole line
    },
    [scheduleChunk, stop],
  );

  /** Generate the spoken audio for a single chunk (its own token + session). */
  const generateChunk = useCallback(
    (text: string, emotion: string | undefined, voiceName: string | undefined, runId: number) =>
      new Promise<Float32Array>((resolve, reject) => {
        let settled = false;
        let session: Session | null = null;
        const collected: Float32Array[] = [];

        const cleanup = () => {
          if (session) {
            try {
              session.close();
            } catch {
              /* noop */
            }
            sessionsRef.current = sessionsRef.current.filter((s) => s !== session);
          }
        };
        const done = (v: Float32Array) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          resolve(v);
        };
        const fail = (e: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          reject(e);
        };
        const timer = setTimeout(
          () => fail(new Error("Voice chunk timed out")),
          CHUNK_TIMEOUT_MS,
        );

        getLiveToken({ type: "audio", emotion, voiceName })
          .then(({ token, model }) => {
            if (runIdRef.current !== runId) {
              fail(new Error("aborted"));
              return null;
            }
            const ai = new GoogleGenAI({
              apiKey: token,
              httpOptions: { apiVersion: "v1alpha" },
            });
            return ai.live.connect({
              model,
              callbacks: {
                onmessage: (msg: LiveServerMessage) => {
                  for (const part of msg.serverContent?.modelTurn?.parts ?? []) {
                    const inline = part.inlineData;
                    if (inline?.data && inline.mimeType?.startsWith("audio/pcm")) {
                      collected.push(base64PcmToFloat32(inline.data));
                    }
                  }
                  if (msg.serverContent?.turnComplete) {
                    // An empty turn means the model produced no audio — treat it
                    // as a failure so the retry re-requests it instead of
                    // silently dropping the chunk from the stitched line.
                    if (collected.length) done(concatFloat32(collected));
                    else fail(new Error("Voice chunk produced no audio"));
                  }
                },
                onerror: (e) => fail(new Error(e?.message ?? "Voice chunk error")),
                onclose: (e) => {
                  // Closed before turnComplete: keep partial audio if any,
                  // otherwise surface so the retry can kick in.
                  if (collected.length) done(concatFloat32(collected));
                  else fail(new Error(`Voice chunk closed (${e?.code ?? "?"})`));
                },
              },
            });
          })
          .then((s) => {
            if (!s) return;
            session = s;
            sessionsRef.current.push(s);
            if (runIdRef.current !== runId) {
              fail(new Error("aborted"));
              return;
            }
            s.sendClientContent({
              turns: [{ role: "user", parts: [{ text }] }],
              turnComplete: true,
            });
          })
          .catch((e) => fail(e instanceof Error ? e : new Error(String(e))));
      }),
    [],
  );

  const playLive = useCallback(
    async (key: string, text: string, emotion?: string, voiceName?: string) => {
      const runId = runIdRef.current;
      const chunks = chunkText(text);
      if (chunks.length === 0) {
        stop();
        return;
      }

      // One retry per chunk to ride out transient 1011 / timeout closes.
      const genWithRetry = async (chunk: string): Promise<Float32Array> => {
        try {
          return await generateChunk(chunk, emotion, voiceName, runId);
        } catch (e) {
          if ((e as Error).message === "aborted") throw e;
          return generateChunk(chunk, emotion, voiceName, runId);
        }
      };

      try {
        // Generate every chunk in parallel; wall-time ≈ the slowest chunk.
        const audios = await Promise.all(chunks.map(genWithRetry));
        if (runIdRef.current !== runId) return; // superseded / stopped

        const merged = concatFloat32(audios.filter((a) => a.length > 0));
        if (merged.length === 0) {
          stop();
          return;
        }
        ttsCache.set(key, merged);
        playMerged(key, merged);
      } catch (err) {
        if ((err as Error).message === "aborted") return;
        if (runIdRef.current === runId) {
          setError(err instanceof Error ? err.message : "Could not start playback");
          stop();
        }
      }
    },
    [generateChunk, playMerged, stop],
  );

  const toggle = useCallback(
    (key: string, text: string, emotion?: string, voiceName?: string) => {
      // Second click on the same line stops it.
      if (activeKeyRef.current === key) {
        stop();
        return;
      }
      stop(); // stop whatever else is playing first (also bumps runId)
      setError(null);

      // Resume the (gesture-created) context so scheduling starts immediately.
      void getAudioContext().resume();

      activeKeyRef.current = key;
      setActiveKey(key);
      nextStartRef.current = 0;
      streamDoneRef.current = false;

      const cached = ttsCache.get(key);
      if (cached) {
        playMerged(key, cached);
      } else {
        setStatus("loading");
        void playLive(key, text, emotion, voiceName);
      }
    },
    [playLive, playMerged, stop],
  );

  // Stop playback / close the sockets if the component unmounts.
  useEffect(() => stop, [stop]);

  return { activeKey, status, error, toggle, stop };
}
