"use client";

import { useEffect, type RefObject } from "react";
import { useDissolve } from "@/hooks/useDissolve";

interface DissolveOverlayProps {
  /** The element to disintegrate. */
  targetRef: RefObject<HTMLElement | null>;
  /** When true, runs the dissolve once. */
  active: boolean;
  onComplete: () => void;
}

/**
 * Plays the "sand blowing" dissolve over `targetRef` when `active` turns true:
 * snapshots the element, hides it, and animates particle debris on a canvas.
 */
export function DissolveOverlay({ targetRef, active, onComplete }: DissolveOverlayProps) {
  const { canvasRef, start, cancel } = useDissolve();

  useEffect(() => {
    if (!active) return;
    const target = targetRef.current;
    if (!target) {
      onComplete();
      return;
    }
    let cancelled = false;
    (async () => {
      await start(target);
      if (!cancelled) onComplete();
    })();
    return () => {
      cancelled = true;
      cancel();
    };
    // NOTE: we intentionally do NOT restore the source's visibility here — that
    // would race the post-dissolve step jump and briefly flash the old view.
    // GameStage clears visibility when the view next becomes the active step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden
    />
  );
}
