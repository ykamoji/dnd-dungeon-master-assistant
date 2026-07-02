"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { MicButton } from "@/components/voice/MicButton";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";

interface CommandComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/** The GM's command/question input. Enter submits; Shift+Enter adds a newline. */
export function CommandComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "What do you do? (e.g. “I attack the goblin with my longsword”)",
}: CommandComposerProps) {
  // Append each transcribed chunk to the current draft.
  const handleTranscript = useCallback(
    (text: string) => {
      const chunk = text.trim();
      if (!chunk) return;
      onChange(value ? `${value.trimEnd()} ${chunk}` : chunk);
    },
    [value, onChange],
  );

  const { listening, connecting, error, start, stop } = useVoiceTranscription({
    onTranscript: handleTranscript,
  });

  const toggleVoice = () => {
    if (listening || connecting) stop();
    else void start();
  };

  const voiceActive = listening || connecting;

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex flex-1 gap-3">
        <div className="relative flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!disabled && value.trim()) onSubmit();
              }
            }}
            rows={2}
            placeholder={placeholder}
            className={`scroll-thin min-h-[3rem] w-full resize-none rounded-card border bg-obsidian-2 px-4 py-3 font-body text-parchment outline-none transition-colors placeholder:text-parchment-dim/60 ${voiceActive
              ? "border-gold-bright/70 shadow-[0_0_0_1px_rgba(230,195,115,0.25),0_0_18px_-4px_rgba(217,119,6,0.5)]"
              : "border-stone-2 focus:border-gold/60"
              }`}
          />
          {voiceActive && (
            <div className="pointer-events-none absolute right-3 top-2.5 flex items-center gap-2 rounded-full border border-gold-bright/40 bg-obsidian/75 px-2.5 py-1 backdrop-blur-sm">
              <VoiceWaveform />
              <span className="font-display text-[7px] uppercase tracking-[0.25em] text-gold-bright">
                {connecting ? "Connecting" : "Listening"}
              </span>
            </div>
          )}
        </div>
        <MicButton
          listening={listening}
          connecting={connecting}
          disabled={disabled}
          onClick={toggleVoice}
        />
        <Button onClick={onSubmit} disabled={disabled || !value.trim()} size="md" className="h-18 shrink-0" >
          Send
        </Button>
      </div>
      {error && (
        <p className="px-1 font-body text-sm text-blood-bright">{error}</p>
      )}
    </div>
  );
}
