"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
  /** Cumulative spin count — bumped each roll so the die spins forward. */
  spin: number;
  rolling: boolean;
  onToggle: () => void;
}

const DIE_SRC: Record<DieProps["sides"], string> = {
  20: "/logos/d20_empty.png",
  100: "/logos/d100.png",
};

/** Roll spin settle time (seconds); the roll timeout below mirrors it in ms. */
const SPIN_DURATION = 2.2;

function Die({ sides, armed, result, spin, rolling, onToggle }: DieProps) {
  // While rolling, flicker a random face; settle on the real result after.
  const [tick, setTick] = useState<number | null>(null);
  useEffect(() => {
    if (!rolling || !armed) {
      setTick(null);
      return;
    }
    const id = setInterval(() => setTick(rollDie(sides)), 70);
    return () => clearInterval(id);
  }, [rolling, armed, sides]);

  const active = rolling && armed;
  const shownNumber = armed ? (active ? tick : result) ?? "–" : "";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={armed ? `Disarm d${sides}` : `Arm d${sides}`}
      aria-pressed={armed}
      className={`relative flex h-16 w-16 items-center justify-center transition-all duration-700 ease-out ${armed ? "opacity-100" : "opacity-45 grayscale hover:opacity-75"
        }`}
    >
      {/* Icon spins forward each roll and eases slowly to a settle. Rotation is
          independent of arming, so toggling a die only fades — never spins. */}
      <motion.img
        src={DIE_SRC[sides]}
        alt={`d${sides}`}
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-contain"
        animate={{ rotate: spin * 720 }}
        transition={{ duration: SPIN_DURATION, ease: "easeOut" }}
      />
      {/* Final number, kept upright, overlaid in the icon's centre */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className={`font-display font-bold leading-none ${sides === 100 ? "text-[16px]" : "text-lg"
            } ${active ? "text-gold" : "text-gold-bright"}`}
        >
          {shownNumber}
        </span>
      </span>
    </button>
  );
}

/**
 * Arm d20 / d100 (either or both), then Roll. The results are reported up so the
 * composer can fold them into the next command.
 */
export function DiceTray({ rolls, onRoll, disabled }: DiceTrayProps) {
  const [armed, setArmed] = useState<{ d20: boolean; d100: boolean }>({
    d20: true,
    d100: false,
  });
  // Per-die spin counts — only the armed dice advance on a roll, so a disarmed
  // die never spins (and toggling a die never spins it, since it only changes
  // on a roll).
  const [spins, setSpins] = useState<{ d20: number; d100: number }>({ d20: 0, d100: 0 });
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (disabled || rolling || (!armed.d20 && !armed.d100)) return;
    onRoll({
      d20: armed.d20 ? rollDie(20) : null,
      d100: armed.d100 ? rollDie(100) : null,
    });
    setSpins((s) => ({
      d20: armed.d20 ? s.d20 + 1 : s.d20,
      d100: armed.d100 ? s.d100 + 1 : s.d100,
    }));
    setRolling(true);
    // Match the icon's settle duration (see Die transition).
    window.setTimeout(() => setRolling(false), SPIN_DURATION * 1000);
  };

  return (
    <div className="flex items-center gap-3">
      <Die
        sides={20}
        armed={armed.d20}
        result={rolls.d20}
        spin={spins.d20}
        rolling={rolling}
        onToggle={() => setArmed((a) => ({ ...a, d20: !a.d20 }))}
      />
      <Die
        sides={100}
        armed={armed.d100}
        result={rolls.d100}
        spin={spins.d100}
        rolling={rolling}
        onToggle={() => setArmed((a) => ({ ...a, d100: !a.d100 }))}
      />
      <button
        type="button"
        onClick={roll}
        disabled={disabled || rolling || (!armed.d20 && !armed.d100)}
        className="h-14 rounded-card border border-gold/40 bg-stone px-4 font-display text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Roll
        {/* {rolling ? "Rolling…" : "Roll"} */}
      </button>
    </div>
  );
}
