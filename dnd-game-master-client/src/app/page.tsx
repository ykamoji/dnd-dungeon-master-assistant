import { Hero } from "@/components/landing/Hero";
import { HowToPlay } from "@/components/landing/HowToPlay";
import { StillsCarousel } from "@/components/landing/StillsCarousel";

export default function LandingPage() {
  return (
    <main className="w-full">
      {/* View 1 — hero over the rotating slideshow background; scroll to continue */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <StillsCarousel />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/75 via-obsidian/55 to-obsidian" />
        <div className="relative z-10 w-full max-w-3xl px-6">
          <Hero />
        </div>
      </section>

      {/* View 2 — how to play + the call to enter the game */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-6xl">
          <HowToPlay />
        </div>
        <footer className="mt-16 text-center font-rune text-xs tracking-widest text-parchment-dim">
          Forged for the tabletop · D&amp;D Game Master Assistant
        </footer>
      </section>
    </main>
  );
}
