"use client";

/**
 * A live, ChatGPT-style equalizer waveform used to signal that voice
 * transcription is actively running. Purely decorative (CSS-driven) — the bars
 * bounce on staggered delays rather than reflecting real amplitude.
 */

// Per-bar timing so the wave looks organic instead of marching in lockstep.
const BARS = [
  { delay: "0s", duration: "0.8s" },
  { delay: "0.18s", duration: "1s" },
  { delay: "0.36s", duration: "0.7s" },
  { delay: "0.1s", duration: "0.95s" },
  { delay: "0.28s", duration: "0.75s" },
  { delay: "0.42s", duration: "0.9s" },
  { delay: "0.06s", duration: "0.82s" },
];

interface VoiceWaveformProps {
  className?: string;
}

export function VoiceWaveform({ className = "" }: VoiceWaveformProps) {
  return (
    <div
      className={`flex h-4 items-center gap-[3px] ${className}`}
      aria-hidden="true"
    >
      {BARS.map((bar, i) => (
        <span
          key={i}
          className="voice-wave-bar h-full w-[3px] rounded-full bg-gradient-to-t from-ember to-gold-bright"
          style={{ animationDelay: bar.delay, animationDuration: bar.duration }}
        />
      ))}
    </div>
  );
}
