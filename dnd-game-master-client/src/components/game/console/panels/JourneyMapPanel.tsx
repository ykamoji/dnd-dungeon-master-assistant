"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@/components/ui/Loader";
import { useConsole } from "../ConsoleProvider";
import { TrailNode } from "../parts/TrailNode";
import { scrollIntoContainer } from "../scroll";

interface JourneyMapPanelProps {
  /** "vertical" = serpentine rail; "hero" = a wider, board-like wrap. */
  orientation?: "vertical" | "hero";
}

function PanelHeading() {
  return (
    <div className="mb-3 shrink-0">
      <p className="font-display text-[10px] uppercase tracking-[0.3em] text-gold">
        Campaign Journey
      </p>
    </div>
  );
}

/** Campaign progress as a zig-zag trail of turn waypoints. */
export function JourneyMapPanel({ orientation = "vertical" }: JourneyMapPanelProps) {
  const { history, activeIndex, selectTurn, historyLoading, pending, viewPending, selectPending } =
    useConsole();
  const activeRef = useRef<HTMLLIElement | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Scroll the trail's own container only — NOT via scrollIntoView, which would
    // also scroll the (overflow-hidden) game stack and cut the console off.
    scrollIntoContainer(scrollRef.current, activeRef.current);
  }, [activeIndex, viewPending, pending]);

  if (historyLoading && history.length === 0 && !pending) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeading />
        <div className="flex flex-1 items-center justify-center">
          <Loader label="Charting the journey…" />
        </div>
      </div>
    );
  }

  if (history.length === 0 && !pending) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeading />
        <div className="flex flex-1 items-center justify-center text-center">
          <p className="max-w-[14rem] font-rune text-sm text-parchment-dim/80">
            Your journey begins. Make your first move and the trail will unfold.
          </p>
        </div>
      </div>
    );
  }

  // history waypoints are active only when not viewing the in-flight turn.
  const historyActive = (i: number) => !viewPending && i === activeIndex;
  const pendingTurn = history.length + 1;

  if (orientation === "hero") {
    return (
      <div className="flex h-full flex-col">
        <PanelHeading />
        <ol
          ref={(el) => {
            scrollRef.current = el;
          }}
          className="scroll-thin flex flex-1 flex-wrap content-start gap-4 overflow-y-auto p-1"
        >
          {history.map((snap, i) => (
            <li key={i} ref={historyActive(i) ? activeRef : undefined}>
              <TrailNode
                turn={i + 1}
                snapshot={snap}
                active={historyActive(i)}
                isLatest={!pending && i === history.length - 1}
                onClick={() => selectTurn(i)}
              />
            </li>
          ))}
          {pending && (
            <li ref={viewPending ? activeRef : undefined}>
              <TrailNode turn={pendingTurn} pending active={viewPending} onClick={selectPending} />
            </li>
          )}
        </ol>
      </div>
    );
  }

  // Vertical serpentine: a center line with nodes alternating left / right.
  const dot = (active: boolean) => (
    <span
      className={`absolute left-1/2 top-5 h-3 w-3 -translate-x-1/2 rounded-full border-2 ${active ? "border-gold-bright bg-gold" : "border-stone-2 bg-stone"
        }`}
      aria-hidden
    />
  );

  return (
    <div className="flex h-full flex-col">
      <PanelHeading />
      <div
        ref={(el) => {
          scrollRef.current = el;
        }}
        className="scroll-thin relative flex-1 overflow-y-auto pr-1"
      >
        <span className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-gold/40 via-stone-2 to-transparent" />
        <ol className="relative space-y-5 py-2">
          {history.map((snap, i) => (
            <li
              key={i}
              ref={historyActive(i) ? activeRef : undefined}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              {dot(historyActive(i))}
              <TrailNode
                turn={i + 1}
                snapshot={snap}
                active={historyActive(i)}
                isLatest={!pending && i === history.length - 1}
                onClick={() => selectTurn(i)}
              />
            </li>
          ))}
          {pending && (
            <li
              ref={viewPending ? activeRef : undefined}
              className={`flex ${history.length % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              {dot(viewPending)}
              <TrailNode turn={pendingTurn} pending active={viewPending} onClick={selectPending} />
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
