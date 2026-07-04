"use client";

import { useState } from "react";

import { Hero } from "@/components/landing/Hero";
import { HowToPlay } from "@/components/landing/HowToPlay";
import { StillsCarousel } from "@/components/landing/StillsCarousel";
import { LANDING_STILLS } from "@/lib/games";

export function LandingView() {
  // Shared slide index so the bottom markers track and drive the background.
  const [slide, setSlide] = useState(0);

  return (
    <div className="w-full">
      {/* View 1 — hero over the rotating slideshow background; scroll to continue */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <StillsCarousel index={slide} onIndexChange={setSlide} />
        <div className="absolute inset-0" />

        {/* Top brand bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
          <div
            className="font-display text-2xl font-black tracking-tight text-[#c0392b]"
            style={{
              backgroundImage: `url(logos/dnd-logo.svg)`,
              width: 150,
              height: 150,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-5xl px-6">
          <Hero />
        </div>

        {/* Carousel position markers — track + drive the rotating background */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3">
          {LANDING_STILLS.map((image, i) => (
            <button
              key={image.src ?? i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === slide}
              onClick={() => setSlide(i)}
              className={`cursor-pointer text-sm leading-none transition-colors ${i === slide ? "text-gold" : "text-gold/50 hover:text-gold/80"
                }`}
            >
              {i === slide ? "◆" : "◇"}
            </button>
          ))}
        </div>
      </section>

      {/* View 2 — how to play + the call to enter the game */}
      <section id="how-to-play" className="flex min-h-screen flex-col items-center justify-center px-6 py-20 bg-obsidian-2">
        <div className="w-full max-w-6xl">
          <HowToPlay />
        </div>
      </section>
    </div>
  );
}
