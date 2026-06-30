"use client";

import { motion } from "framer-motion";
import { SectionShell } from "@/components/ui/SectionShell";
import { useGame } from "@/context/GameContext";

/**
 * The game console — where play will happen. Intentionally a themed placeholder
 * for now; the interactive console is built in a later task.
 */
export function ConsoleView() {
  const { state } = useGame();
  const heroes = state.party.filter((p) => p.name.trim());

  return (
    <SectionShell>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="parchment mx-auto max-w-2xl rounded-card border border-gold/30 p-10 text-center"
      >
        <p className="font-rune text-sm uppercase tracking-[0.4em] text-gold">
          The table is set
        </p>
        <h2 className="text-gilded mt-3 font-display text-4xl font-bold tracking-wide">
          The Console
        </h2>
        <p className="mt-4 font-rune text-parchment-dim">
          {state.selectedCampaignId
            ? `Resuming “${state.selectedCampaignId}”.`
            : heroes.length
              ? `Your party of ${heroes.length} stands ready.`
              : "Your adventure awaits."}
        </p>

        {heroes.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {heroes.map((h) => (
              <li
                key={h.id}
                className="rounded-full border border-gold/30 bg-obsidian-2 px-3 py-1 text-sm text-parchment"
              >
                {h.name}
                <span className="text-parchment-dim">
                  {" "}
                  · {h.role || h.className}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 font-rune text-xs tracking-widest text-parchment-dim">
          The interactive game console will appear here.
        </p>
      </motion.div>
    </SectionShell>
  );
}
