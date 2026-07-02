"use client";

/**
 * A live, ChatGPT-style equalizer waveform used to signal that voice
 * transcription is actively running. Purely decorative (CSS-driven) — the bars
 * bounce on staggered delays rather than reflecting real amplitude.
 */

// Per-bar timing so the wave looks organic instead of marching in lockstep.
const BARS = [
  { delay: "0s" },
  { delay: "0.06s" },
  { delay: "0.12s" },
  { delay: "0.18s" },
  { delay: "0.24s" },
  { delay: "0.3s" },
  { delay: "0.36s" },
  { delay: "0.42s" },
  { delay: "0.48s" },
  { delay: "0.54s" },
  { delay: "0.6s" },
  { delay: "0.66s" },
  { delay: "0.72s" },
  { delay: "0.78s" },
  { delay: "0.84s" },
];

interface VoiceWaveformProps {
  className?: string;
}

export function VoiceWaveform({ className = "" }: VoiceWaveformProps) {
  return (
    <div className={`flex h-10 items-end gap-[5px] ${className}`} aria-hidden="true">
      {BARS.map((bar, i) => (
        <span
          key={i}
          className="voice-wave-bar h-8 w-[2px] rounded-full bg-gradient-to-t from-ember to-gold-bright"
          style={{ animationDelay: bar.delay }}
        />
      ))}
    </div>
  );
}
