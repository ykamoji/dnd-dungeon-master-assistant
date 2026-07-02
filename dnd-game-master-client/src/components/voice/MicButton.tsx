"use client";

import { Button } from "@/components/ui/Button";

interface MicButtonProps {
  listening: boolean;
  connecting?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** Solid stop-square shown while listening. */
function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}

/** Microphone glyph shown when idle / connecting. */
function MicIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

/**
 * Toggle button that starts/stops voice transcription. Built on the shared
 * `Button` (secondary variant) for app-wide consistency: idle is a themed
 * gold-on-hover mic; active (listening) layers a vibrant gold→ember gradient
 * with a pulsing ring and a stop-square glyph. Presentational only — capture
 * logic lives in the useVoiceTranscription hook.
 */
export function MicButton({
  listening,
  connecting,
  disabled,
  onClick,
}: MicButtonProps) {
  const active = listening || connecting;
  const label = connecting
    ? "Connecting microphone…"
    : listening
      ? "Stop voice input"
      : "Start voice input";

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={listening}
      title={label}
      size="md"
      className={[
        // Square icon button (override the variant's default padding/size).
        "cursor-pointer h-14 w-14 mt-[6px] !rounded-full",
        active
          ? "bg-gradient-to-br from-gold-bright via-gold to-ember !border-gold-bright/60 !text-obsidian"
          : "hover:-translate-y-0.5 hover:shadow-[0_0_16px_-2px_rgba(200,161,74,0.45)]",
        listening ? "animate-mic-ring scale-105" : "",
        connecting && !listening ? "animate-pulse" : "",
      ].join(" ")}
    >
      {listening ? <StopIcon /> : <MicIcon />}
    </Button>
  );
}
