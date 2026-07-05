"use client";

import { motion } from "framer-motion";

/**
 * Landing hero — centered stack matching the poster mock:
 * eyebrow → giant "EPIC ADVENTURE" title → d20 divider → Dungeon Master crest
 * → "THE DUNGEON MASTER" → body copy → scroll cue.
 *
 * Image slots (d20 divider, hooded crest, down-arrow) are placeholders for the
 * SVGs to be dropped in later — see the `SVG SLOT` comments.
 */
export function Hero() {
  return (
    <div className="flex flex-col items-center text-center">

      {/* Eyebrow */}
      <div className="flex flex-col items-center">
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50 sm:w-100" />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-rune pl-2 font-bold uppercase tracking-[0.3em] text-gold/80 lg:text-lg"
        >
          Roll the dice to an
        </motion.p>
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50 sm:w-100" />
      </div>

      {/* Hero title — the headline of the page.
          Per-line spans carry `.text-carved-stone` + `data-text` so the carved
          gold outline (::before) aligns to each line. Font/size/weight come from
          the class; keep only layout (line-height) here. */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="mt-1 flex flex-col items-center text-6xl leading-[0.95] md:text-8md xl:text-9xl"
      >
        <span className="text-carved-stone block" data-text="Epic">
          Epic
        </span>
        <span className="text-carved-stone block" data-text="Adventure">
          Adventure
        </span>
      </motion.h1>

      {/* SVG SLOT — d20 divider (drop the dice svg here) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-1 flex items-center gap-4 text-gold/70"
      >
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50 sm:w-50" />
        <div className="grid h-32 w-32 place-items-center">
          <img src="logos/d20.png"
            className=""
            alt="d20"
          />
        </div>
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50 sm:w-50" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex mt-10 items-center text-gold/70"
      >
        {/* <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/50 sm:w-10" /> */}
        <div className="grid h-32 w-32 place-items-center">
          <img src="logos/dm_logo.png"
            className="rounded-full [mask-image:radial-gradient(ellipse_at_center,_black_5%,_transparent_100%)] [clip-path:inset(10%)]"
          />
        </div>
        {/* <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/50 sm:w-10" /> */}
      </motion.div>

      {/* Secondary heading with decorative flankers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="flex items-center gap-4"
      >
        <span className="hidden h-px w-10 bg-gold/40 sm:block" />
        <h2 className="font-display text-2xl uppercase tracking-[0.25em] text-parchment sm:text-3xl">
          The Dungeon Master
        </h2>
        <span className="hidden h-px w-10 bg-gold/40 sm:block" />
      </motion.div>

      {/* Body copy */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-3 max-w-2xl font-body text-base leading-relaxed text-parchment-dim sm:text-lg"
      >
        An ever-watchful AI Dungeon Master for your table. It weaves the
        narrative, voices every NPC, arbitrates the dice, and remembers your saga
        — so you can simply <span className="text-gold-bright">play</span>.
      </motion.p>

      {/* Scroll cue */}
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
        className="mt-5 flex flex-col items-center gap-3 cursor-pointer text-parchment-dim transition-colors hover:text-gold focus:outline-none"
      >
        <img
          src="logos/arrow.png"
          className="h-20 w-20"
        />
        <span className="font-rune text-xs uppercase tracking-[0.3em] sm:text-sm">
          Scroll to learn how to play
        </span>
      </motion.button>
    </div>
  );
}
