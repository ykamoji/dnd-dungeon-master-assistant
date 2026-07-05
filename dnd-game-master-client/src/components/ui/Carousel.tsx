"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface CarouselProps {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  bordered?: boolean;
  showDots?: boolean;
  /** Controlled mode: when provided, the parent owns the active slide (so
   *  external markers can track/drive it). Omit for self-managed rotation. */
  index?: number;
  onIndexChange?: (index: number) => void;
}

/** Fade in/out image slideshow that auto-rotates. */
export function Carousel({
  images,
  intervalMs = 8000,
  bordered = true,
  showDots = true,
  index: controlledIndex,
  onIndexChange,
}: CarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = controlledIndex !== undefined;
  const index = isControlled ? controlledIndex : internalIndex;

  const setIndex = useCallback(
    (next: number) => {
      if (isControlled) onIndexChange?.(next);
      else setInternalIndex(next);
    },
    [isControlled, onIndexChange],
  );

  // Ref keeps the interval callback reading the latest index without resetting
  // the timer on every change (works for both controlled + uncontrolled).
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(
      () => setIndex((indexRef.current + 1) % images.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [images.length, intervalMs, setIndex]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-stone ${bordered ? "rounded-card border border-gold/20" : ""
        }`}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={index}
          src={images[index]?.src}
          alt={images[index]?.alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          loading="lazy"
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-obsidian/20" />
      {showDots && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-gold" : "w-1.5 bg-parchment-dim/50"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
