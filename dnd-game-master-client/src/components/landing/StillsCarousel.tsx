"use client";

import { Carousel } from "@/components/ui/Carousel";
import { LANDING_STILLS } from "@/lib/games";

interface StillsCarouselProps {
  /** Optional controlled slide index (lets external markers track/drive it). */
  index?: number;
  onIndexChange?: (index: number) => void;
}

/**
 * Full-bleed rotating slideshow used as the landing hero background.
 * Positions itself to fill the nearest relative parent.
 */
export function StillsCarousel({ index, onIndexChange }: StillsCarouselProps) {
  return (
    <div className="absolute inset-0">
      <Carousel
        images={LANDING_STILLS}
        bordered={false}
        showDots={false}
        index={index}
        onIndexChange={onIndexChange}
      />
    </div>
  );
}
