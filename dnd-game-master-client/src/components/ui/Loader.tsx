"use client";

/** A small themed spinner — a turning d20-ish ring. */
export function Loader({ label = "Summoning…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-parchment-dim">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-stone-2 border-t-gold" />
      <span className="font-rune text-sm tracking-wide">{label}</span>
    </div>
  );
}
