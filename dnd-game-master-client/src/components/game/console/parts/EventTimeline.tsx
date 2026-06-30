"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionEvent } from "@/lib/types";
import { eventStep } from "../events";
import { EventDetail } from "./EventDetail";

interface EventTimelineProps {
  events: SessionEvent[];
  running: boolean;
}

/**
 * Progressive horizontal timeline of the agent's run: one dot per
 * streamed event with its step icon + title above, dots joined by a rail. Click
 * a dot to slide open that event's details — only one open at a time.
 */
export function EventTimeline({ events, running }: EventTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest dot in view as the run streams in.
  useEffect(() => {
    if (railRef.current) railRef.current.scrollLeft = railRef.current.scrollWidth;
  }, [events.length]);

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
    <div className="flex flex-col gap-3">
      <div ref={railRef} className="scroll-thin overflow-y-auto">
        <div className="flex flex-wrap items-stretch justify-start gap-y-6">
          {events.map((ev, i) => {
            const { icon, title } = eventStep(ev);
            const active = ev.id === selectedId;
            const isNewest = i === events.length - 1;
            return (
              <div key={ev.id} className="flex w-28 shrink-0 flex-col items-center">
                {/* Step label + icon above the dot. */}
                <span className="mb-1 line-clamp-1 text-center font-display text-[9px] uppercase tracking-wider text-parchment-dim">
                  {title}
                </span>
                <span className="mb-1 text-lg leading-none" aria-hidden>
                  {icon}
                </span>
                {/* Rail line + dot (adjacent rails join into one line). */}
                <div className="relative flex h-4 w-full items-center justify-center">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-stone-2" />
                  <button
                    type="button"
                    onClick={() => setSelectedId(active ? null : ev.id)}
                    aria-label={`${title} — toggle details`}
                    className={`relative z-10 h-3.5 w-3.5 rounded-full border-2 transition-colors ${active
                      ? "border-gold-bright bg-gold"
                      : "border-stone-2 bg-stone hover:border-gold/60"
                      } ${isNewest && running ? "animate-pulse" : ""}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
