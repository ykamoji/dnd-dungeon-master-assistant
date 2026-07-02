"use client";

import type { TtsStatus } from "@/hooks/useTextToSpeech";

interface SpeakButtonProps {
  /** Playback status of the line this button controls. */
  status: TtsStatus;
  disabled?: boolean;
}

function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      {/* Sound waves grow when actively speaking. */}
      <path d="M15.5 8.5a5 5 0 0 1 0 7" opacity={playing ? 1 : 0.55} />
      {playing && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

/**
 * Inline speaker toggle placed after a dialogue line. Idle: dim speaker that
 * warms to gold on hover. Loading: spinner. Playing: glowing gold speaker with
 * animated waves (click again to stop).
 */
export function SpeakButton({ status, disabled }: SpeakButtonProps) {
  const playing = status === "playing";
  const loading = status === "loading";
  const label = playing
    ? "Stop voice"
    : loading
      ? "Loading voice…"
      : "Play voice";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        "ml-1.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        playing
          ? "animate-pulse bg-gold/15 text-gold-bright"
          : "text-parchment-dim hover:bg-gold/10 hover:text-gold-bright",
      ].join(" ")}
    >
      {loading ? <Spinner /> : <SpeakerIcon playing={playing} />}
    </button>
  );
}
