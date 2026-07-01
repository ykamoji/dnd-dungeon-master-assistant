"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionEvent } from "@/lib/types";
import { eventStep } from "../events";
import { EventDetail } from "./EventDetail";

interface EventTimelineProps {
  events: SessionEvent[];
  running: boolean;
}

/** A single event waypoint box — icon + step title; opens its detail on click. */
function EventBox({
  icon,
  title,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex max-w-[11rem] items-center gap-2 rounded-card border px-4 py-2 text-left transition-colors ${active
        ? "border-gold bg-gold/15"
        : "border-stone-2 bg-obsidian-2/80 hover:border-gold/50"
        }`}
    >
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
      <span className="line-clamp-2 font-display text-[10px] uppercase tracking-wider text-parchment">
        {title}
      </span>
    </button>
  );
}

/**
 * Vertical timeline of the agent's run: a central rail with event boxes
 * alternating left / right, piling downward as events stream in. Each box shows
 * its step icon + title and opens the full Event Detail modal on click. The run
 * fits within its container without scrolling.
 */
export function EventTimeline({ events, running }: EventTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((e) => e.id === selectedId) ?? null;

  if (events.length === 0) {
    return (
      <p className="font-rune text-sm text-parchment-dim/70">
        {running
          ? "Listening for the Dungeon Master…"
          : "The run trace will appear here as you play."}
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ol className="relative flex h-full flex-col justify-around py-1">
        {/* Central rail. */}
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-gold/40 via-stone-2 to-transparent" />

        {events.map((ev, i) => {
          const { icon, title } = eventStep(ev);
          const active = ev.id === selectedId;
          const isNewest = i === events.length - 1;
          const left = i % 2 === 0;
          return (
            <li key={ev.id} className="relative grid grid-cols-2 items-center">
              {/* Thin horizontal connector from the rail to the box. */}
              <span
                className={`pointer-events-none absolute top-1/2 h-px w-6 -translate-y-1/2 bg-stone-2 ${left ? "right-1/2" : "left-1/2"
                  }`}
              />
              {/* Dot on the rail. */}
              <span
                className={`absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${isNewest ? "border-gold-bright bg-gold" : "border-stone-2 bg-stone"
                  } ${isNewest ? "animate-ping" : ""}`}
              />

              {/* Left cell holds even-index events; right cell the odd ones. */}
              <div className="flex justify-end pr-6">
                {left && (
                  <EventBox
                    icon={icon}
                    title={title}
                    active={active}
                    onClick={() => setSelectedId(ev.id)}
                  />
                )}
              </div>
              <div className="flex justify-start pl-6">
                {!left && (
                  <EventBox
                    icon={icon}
                    title={title}
                    active={active}
                    onClick={() => setSelectedId(ev.id)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* One event's details at a time, displayed as a hovering modal. */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 lg:p-12"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="relative max-h-full w-full max-w-4xl overflow-y-auto rounded-xl border border-gold/30 bg-stone p-6 shadow-2xl shadow-black/80"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-2 text-parchment-dim hover:bg-stone-3 hover:text-parchment"
                  aria-label="Close details"
                >
                  ✕
                </button>
                <EventDetail event={selected} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
