"use client";

import { useEffect, useRef, useState } from "react";
import type { TraceStep } from "@/lib/types";
import { scrollToBottom } from "../scroll";

interface TraceStreamProps {
  trace: TraceStep[];
  running: boolean;
}

/**
 * Live event trace shown while the agent works: humanized step labels by
 * default, with a toggle to reveal the raw ADK events underneath.
 */
export function TraceStream({ trace, running }: TraceStreamProps) {
  const [rawOpen, setRawOpen] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    // Pin the list to its bottom directly — never scrollIntoView, which would
    // also scroll the (overflow-hidden) game stack and cut the console off.
    scrollToBottom(listRef.current);
  }, [trace.length]);

  if (trace.length === 0 && !running) {
    return (
      <p className="font-rune text-sm text-parchment-dim/70">
        The trace of the Dungeon Master&apos;s reasoning will appear here as you play.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ul ref={listRef} className="scroll-thin flex-1 space-y-2 overflow-y-auto pr-1">
        {trace.map((step, i) => {
          const isLast = i === trace.length - 1;
          return (
            <li key={step.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-2 text-sm">
                <span aria-hidden className="shrink-0">
                  {step.icon}
                </span>
                <span
                  className={
                    isLast && running ? "animate-pulse text-gold-bright" : "text-parchment"
                  }
                >
                  {step.label}
                </span>
              </div>
              {rawOpen && (
                <pre className="scroll-thin ml-6 max-h-40 overflow-auto rounded-md border border-stone-2 bg-obsidian-2 p-2 text-[10px] leading-relaxed text-parchment-dim">
                  {JSON.stringify(step.raw, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>

      {trace.length > 0 && (
        <button
          type="button"
          onClick={() => setRawOpen((o) => !o)}
          className="mt-2 self-start font-display text-[10px] uppercase tracking-widest text-gold/80 transition-colors hover:text-gold-bright"
        >
          {rawOpen ? "▾ hide raw events" : "▸ show raw events"}
        </button>
      )}
    </div>
  );
}
