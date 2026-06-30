"use client";

import { useState } from "react";
import type { DiceRolls } from "../ConsoleProvider";

/** Dummy RNG — the real animated dice roller is a later task. */
export const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;

interface DiceTrayProps {
  rolls: DiceRolls;
  onRoll: (rolls: DiceRolls) => void;
  disabled?: boolean;
}

interface DieProps {
  sides: 20 | 100;
  armed: boolean;
  result: number | null | undefined;
  onToggle: () => void;
}

function Die({ sides, armed, result, onToggle }: DieProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Arm d${sides}`}
      className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-card border text-center transition-colors ${armed
        ? "border-gold bg-gold/15 text-gold-bright"
        : "border-stone-2 bg-obsidian-2 text-parchment-dim hover:border-gold/40"
        }`}
    >
      <span className="font-display text-[10px] uppercase tracking-widest">d{sides}</span>
      <span className="font-display text-lg leading-none text-parchment">
        {result ?? "–"}
      </span>
    </button>
  );
}

/**
 * Arm d20 / d100 (either or both), then Roll. The results are reported up so the
 * composer can fold them into the next command. Visual stub for now.
 */
export function DiceTray({ rolls, onRoll, disabled }: DiceTrayProps) {
  const [armed, setArmed] = useState<{ d20: boolean; d100: boolean }>({
    d20: true,
    d100: false,
  });

  const roll = () => {
    if (disabled || (!armed.d20 && !armed.d100)) return;
    onRoll({
      d20: armed.d20 ? rollDie(20) : null,
      d100: armed.d100 ? rollDie(100) : null,
    });
  };

  return (
    <div className="flex items-center gap-3 mt-4">
      <Die
        sides={20}
        armed={armed.d20}
        result={rolls.d20}
        onToggle={() => setArmed((a) => ({ ...a, d20: !a.d20 }))}
      />
      <Die
        sides={100}
        armed={armed.d100}
        result={rolls.d100}
        onToggle={() => setArmed((a) => ({ ...a, d100: !a.d100 }))}
      />
      <button
        type="button"
        onClick={roll}
        disabled={disabled || (!armed.d20 && !armed.d100)}
        className="h-14 rounded-card border border-gold/40 bg-stone px-4 font-display text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Roll
      </button>
    </div>
  );
}
