"use client";

import { motion } from "framer-motion";

/** Landing hero: niche-font intro to the D&D Game Master. */
export function Hero() {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-rune text-sm uppercase tracking-[0.4em] text-gold"
      >
        Roll the dice to an epic adventure
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="text-gilded mt-4 font-display text-5xl font-black leading-tight tracking-wide sm:text-6xl md:text-7xl"
      >
        The Game Master
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-6 max-w-3xl font-rune text-lg leading-relaxed bg-obsidian/80 p-5 text-parchment-dim sm:text-xl"
      >
        An ever-watchful AI Dungeon Master for your table. It weaves the
        narrative, voices every NPC, arbitrates the dice, and remembers your saga
        — so you can simply <span className="text-gold-bright">play</span>.
      </motion.p>

      <motion.button
        onClick={() => {
          document.getElementById("how-to-play")?.scrollIntoView({ behavior: "smooth" });
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.5 },
          y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="mt-14 flex flex-col items-center gap-2 cursor-pointer text-parchment-dim transition-colors hover:text-gold focus:outline-none"
      >
        <span className="font-rune text-[30px] font-extrabold uppercase tracking-[0.3em]">
          Scroll to learn how to play
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-16 text-center font-rune text-lg tracking-widest text-parchment-dim">
          D&amp;D Game Master Assistant
        </div>
      </motion.button>
    </div>
  );
}
