"use client";

import { Button } from "@/components/ui/Button";

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
  return (
    <div className="flex flex-1 gap-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
        rows={2}
        placeholder={placeholder}
        className="scroll-thin min-h-[3rem] w-full resize-none rounded-card border border-stone-2 bg-obsidian-2 px-4 py-3 font-body text-parchment outline-none transition-colors placeholder:text-parchment-dim/60 focus:border-gold/60"
      />
      <Button onClick={onSubmit} disabled={disabled || !value.trim()} className="shrink-0">
        Send
      </Button>
    </div>
  );
}
