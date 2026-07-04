"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@/components/ui/Loader";
import { useConsole } from "../ConsoleProvider";
import { JourneyTurnCard } from "../parts/JourneyTurnCard";
import { TrailNode } from "../parts/TrailNode";
import { scrollIntoContainer, scrollToBottom } from "../scroll";

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
  const didInitialScroll = useRef(false);

  useEffect(() => {
    // Scroll the trail's own container only — NOT via scrollIntoView, which would
    // also scroll the (overflow-hidden) game stack and cut the console off.
    scrollIntoContainer(scrollRef.current, activeRef.current);
  }, [activeIndex, viewPending, pending]);

  useEffect(() => {
    // On first render (once history is populated), jump to the latest turn —
    // it's the bottom-most card. Deferred a frame so the list has laid out.
    if (didInitialScroll.current || (history.length === 0 && !pending)) return;
    const raf = requestAnimationFrame(() => {
      scrollToBottom(scrollRef.current);
      didInitialScroll.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [history.length, pending]);

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

  return (
    <div className="flex h-full flex-col">
      <PanelHeading />
      <div
        ref={(el) => {
          scrollRef.current = el;
        }}
        className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative flex-1 overflow-y-auto pr-1"
      >
        <ol className="relative py-2">
          {/* Continuous trail line down the centre of the turn circles (rail is
              w-11 → centre at 22px); circles sit above it and mask it. */}
          <span className="pointer-events-none absolute bottom-8 left-[22px] top-8 w-px -translate-x-1/2 bg-gold/30" />
          {/* Glowing head of the trail, above turn 1 */}
          <span className="pointer-events-none absolute left-[22px] top-6 h-2 w-2 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_2px_rgba(200,161,74,0.55)]" />

          {history.map((snap, i) => {
            const active = historyActive(i);
            return (
              <JourneyTurnCard
                key={i}
                ref={active ? activeRef : undefined}
                turn={i + 1}
                snapshot={snap}
                active={active}
                isLatest={!pending && i === history.length - 1}
                onClick={() => selectTurn(i)}
              />
            );
          })}
          {pending && (
            <JourneyTurnCard
              ref={viewPending ? activeRef : undefined}
              turn={pendingTurn}
              pending
              active={viewPending}
              onClick={selectPending}
            />
          )}
        </ol>
      </div>
    </div>
  );
}
