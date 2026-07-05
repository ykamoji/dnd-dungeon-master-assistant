"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";

import type { TurnSnapshot } from "@/lib/types";
import { firstAsset, intentMeta, sceneLabel } from "../snapshot";

interface JourneyTurnCardProps {
  turn: number; // 1-based turn number
  snapshot?: TurnSnapshot | null;
  active: boolean;
  isLatest?: boolean;
  /** Optimistic in-flight turn: show a spinner instead of snapshot details. */
  pending?: boolean;
  onClick: () => void;
}

/** Ornate corner brackets that frame each turn box (mockup border style). */
function CornerAccents({ tone }: { tone: string }) {
  const base = `pointer-events-none absolute h-3 w-3 ${tone}`;
  return (
    <>
      <span className={`${base} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${base} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b border-r`} />
    </>
  );
}

/**
 * One row of the journey map: a numbered turn circle linked by vertical +
 * horizontal connector lines to a wide, image-backed turn box.
 */
export const JourneyTurnCard = forwardRef<HTMLLIElement, JourneyTurnCardProps>(
  function JourneyTurnCard(
    { turn, snapshot, active, isLatest, pending, onClick },
    ref,
  ) {
    const meta = snapshot ? intentMeta(snapshot.intent) : intentMeta(null);
    const thumb = snapshot ? firstAsset(snapshot) : undefined;
    const title = pending
      ? "In progress…"
      : snapshot
        ? sceneLabel(snapshot)
        : "Untitled scene";
    const description = pending
      ? "The dice are cast…"
      : snapshot?.description || snapshot?.intent || "";

    const cornerTone = active ? "border-gold-bright/70" : "border-gold/40";

    return (
      <li ref={ref} className="relative flex items-stretch py-3">
        {/* Left rail — numbered circle (the continuous line is drawn by the panel) */}
        <div className="relative flex w-11 shrink-0 items-center justify-center self-stretch">
          <button
            type="button"
            onClick={onClick}
            aria-current={active}
            title={`Turn ${turn}`}
            className={`relative z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full border bg-obsidian shadow-[0_0_0_4px_var(--color-obsidian)] transition-colors ${active
              ? "border-gold-bright text-parchment"
              : "border-gold/50 text-parchment-dim hover:border-gold"
              }`}
          >
            <span className="font-display text-sm text-parchment">{turn}</span>
          </button>
        </div>

        {/* Horizontal connector from circle to box */}
        <span className="mr-1 w-4 self-center border-t border-gold/25" />

        {/* Turn box */}
        <motion.button
          type="button"
          onClick={onClick}
          whileHover={{ y: -1 }}
          title={title}
          className={`group relative flex h-36 flex-1 cursor-pointer overflow-hidden rounded-lg border text-left transition-colors ${active
            ? "border-gold-bright/60 bg-obsidian-2"
            : "border-gold/25 bg-obsidian-2/70 hover:border-gold/50"
            }`}
        >
          {/* Scene image fills the box; the scrim fades it out under the text */}
          {thumb ? (
            <img
              src={thumb}
              alt={title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-y-0 right-0 grid w-1/2 place-items-center bg-gradient-to-l from-stone to-obsidian text-4xl opacity-40">
              {meta.icon}
            </div>
          )}
          {/* Left-to-right scrim keeps the text legible over the art */}
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/70 to-transparent" />

          {/* Inner hairline + corner brackets (mockup border) */}
          <span className="pointer-events-none absolute inset-[3px] rounded-md border border-gold/10" />
          <CornerAccents tone={cornerTone} />

          {/* Text content */}
          <div className="relative z-10 flex max-w-[95%] flex-col justify-center gap-1 p-4">
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-4 font-display text-xs font-semibold leading-tight text-parchment">
                {title}
              </h3>
              {isLatest && !pending && (
                <span className="mt-0.5 shrink-0 rounded-full bg-blood px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-parchment">
                  now
                </span>
              )}
            </div>
            {pending ? (
              <span className="flex items-center gap-2 font-rune text-[12px] text-parchment-dim">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-2 border-t-gold" />
                {description}
              </span>
            ) : (
              description && (
                <p className="line-clamp-2 font-body text-[13px] leading-snug text-parchment-dim">
                  {description}
                </p>
              )
            )}
          </div>
        </motion.button>
      </li>
    );
  },
);
