"use client";

import type { CharacterState, PartyState } from "@/lib/types";

interface PartyStatGridProps {
  party?: PartyState | null;
}

function hpTone(ratio: number): string {
  if (ratio <= 0.25) return "bg-blood-bright";
  if (ratio <= 0.5) return "bg-ember";
  return "bg-gold";
}

function gearLine(label: string, items: string[]) {
  if (!items?.length) return null;
  return (
    <p className="text-[11px] text-parchment-dim">
      <span className="text-gold/80">{label}:</span> {items.join(", ")}
    </p>
  );
}

function CharacterCard({ name, c }: { name: string; c: CharacterState }) {
  const ratio = c.max_hp > 0 ? Math.max(0, Math.min(1, c.hp / c.max_hp)) : 0;
  return (
    <div className="rounded-card border border-stone-2 bg-obsidian-2/70 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm text-parchment">{name}</span>
        <span className="font-rune text-[11px] text-parchment-dim">
          {[c.role, c.class].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone">
          <div className={`h-full ${hpTone(ratio)}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="font-display text-[11px] text-parchment-dim">
          {c.hp}/{c.max_hp}
        </span>
      </div>

      {c.conditions?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {c.conditions.map((cond) => (
            <span
              key={cond}
              className="rounded-full border border-blood-bright/40 px-2 py-0.5 text-[10px] text-blood-bright"
            >
              {cond}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 space-y-0.5">
        {gearLine("Weapons", c.weapons)}
        {gearLine("Armor", c.armors)}
        {gearLine("Spells", c.spells)}
        {gearLine("Items", c.magicitems)}
      </div>
    </div>
  );
}

/** The party's mechanical state — HP, conditions, and gear — at a turn. */
export function PartyStatGrid({ party }: PartyStatGridProps) {
  const entries = Object.entries(party?.characters ?? {});
  if (entries.length === 0) {
    return <p className="font-rune text-sm text-parchment-dim/70">No party state recorded yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([name, c]) => (
        <CharacterCard key={name} name={name} c={c} />
      ))}
    </div>
  );
}
