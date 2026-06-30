"use client";

import { Carousel } from "@/components/ui/Carousel";
import { LANDING_STILLS } from "@/lib/games";

/**
 * Full-bleed rotating slideshow used as the landing hero background.
 * Positions itself to fill the nearest relative parent.
 */
export function StillsCarousel() {
  return (
    <div className="absolute inset-0">
      <Carousel images={LANDING_STILLS} bordered={false} showDots={false} />
    </div>
  );
}
