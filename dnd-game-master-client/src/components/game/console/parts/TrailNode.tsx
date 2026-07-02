"use client";

import { motion } from "framer-motion";
import type { TurnSnapshot } from "@/lib/types";
import { firstAsset, intentMeta, sceneLabel } from "../snapshot";

interface TrailNodeProps {
  turn: number; // 1-based turn number
  snapshot?: TurnSnapshot | null;
  active: boolean;
  isLatest?: boolean;
  /** Optimistic in-flight turn: show a spinner instead of snapshot details. */
  pending?: boolean;
  onClick: () => void;
}

/** A single waypoint on the journey trail — readable at a glance. */
export function TrailNode({
  turn,
  snapshot,
  active,
  isLatest,
  pending,
  onClick,
}: TrailNodeProps) {
  if (pending || !snapshot) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -2 }}
        title="Turn in progress"
        className={`group relative flex w-44 items-center gap-3 rounded-card border p-2 text-left transition-colors ${active ? "border-gold bg-gold" : "border-stone-2 bg-obsidian-2 hover:border-gold/40"
          }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-stone">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-2 border-t-gold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display text-[9px] uppercase tracking-widest text-gold">
            Turn {turn}
          </span>
          <span className="block truncate font-body text-sm text-parchment-dim">
            In progress…
          </span>
          <span className="font-rune text-[10px] text-parchment-dim">the dice are cast…</span>
        </span>
      </motion.button>
    );
  }

  const meta = intentMeta(snapshot.intent);
  const thumb = firstAsset(snapshot);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      title={sceneLabel(snapshot)}
      className={`group relative flex w-44 items-center gap-3 rounded-card border p-2 text-left transition-colors ${active
        ? "border-gold bg-gold"
        : "border-stone-2 bg-obsidian-2 hover:border-gold/40"
        }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${active ? "border-gold-bright bg-stone" : "border-stone-2 bg-stone"
          }`}
        style={
          thumb
            ? {
              backgroundImage: `url(${thumb})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
            : undefined
        }
        aria-hidden
      >
        {!thumb && meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="font-display text-[9px] uppercase tracking-widest text-gold">
            Turn {turn}
          </span>
          {isLatest && (
            <span className="rounded-full bg-blood px-1.5 text-[8px] uppercase tracking-wider text-parchment">
              now
            </span>
          )}
        </span>
        <span className="block truncate font-body text-sm text-parchment">
          {sceneLabel(snapshot)}
        </span>
        <span className="font-rune text-[10px] text-parchment-dim">
          {meta.icon} {meta.label}
        </span>
      </span>
    </motion.button>
  );
}
