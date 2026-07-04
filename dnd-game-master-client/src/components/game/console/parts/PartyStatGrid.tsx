"use client";

import type { CharacterState, PartyState, PartyBreakDown } from "@/lib/types";

interface PartyStatGridProps {
  party?: PartyState | null;
  partyBreakdown?: PartyBreakDown | null;
}

function hpTone(ratio: number): string {
  if (ratio <= 0.25) return "bg-blood-bright";
  if (ratio <= 0.5) return "bg-ember";
  return "bg-gold";
}

function gearLine(label: string, items: string[]) {
  if (!items?.length) return null;
  return (
    <p className="text-[16px] text-parchment-dim">
      <span className="text-gold/80">{label}:</span> {items.join(", ")}
    </p>
  );
}

function CharacterCard({ name, c }: { name: string; c: CharacterState }) {
  const ratio = c.max_hp > 0 ? Math.max(0, Math.min(1, c.hp / c.max_hp)) : 0;
  return (
    <div className="rounded-card border border-stone-2 bg-obsidian-2/70 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm text-parchment">{name}</span>
        <span className="font-rune text-[14px] text-parchment-dim">
          {[c.role, c.class].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone">
          <div className={`h-full ${hpTone(ratio)}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="font-display text-[13px] text-parchment-dim">
          {c.hp}/{c.max_hp}
        </span>
      </div>

      {c.conditions?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {c.conditions.map((cond) => (
            <span
              key={cond}
              className="rounded-full border-[0.1] border-gold-dark/40 px-2 py-0.5 text-[14px]"
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
export function PartyStatGrid({ party, partyBreakdown }: PartyStatGridProps) {
  const entries = Object.entries(party?.characters ?? {});
  
  return (
    <div className="space-y-4">
      {partyBreakdown && (
        <div className="rounded-card border border-gold/30 bg-obsidian p-4 flex gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-parchment-dim uppercase tracking-wider font-rune">Level</span>
            <span className="text-xl font-display text-gold">{partyBreakdown.level}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-parchment-dim uppercase tracking-wider font-rune">Perception</span>
            <span className="text-xl font-display text-gold">{partyBreakdown.perception}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-parchment-dim uppercase tracking-wider font-rune">Health</span>
            <span className="text-xl font-display text-gold">{partyBreakdown.health}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-parchment-dim uppercase tracking-wider font-rune">Money</span>
            <span className="text-xl font-display text-gold">{partyBreakdown.money ?? 0} gp</span>
          </div>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="font-rune text-md text-parchment-dim/70">No party state recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {entries.map(([name, c]) => (
            <CharacterCard key={name} name={name} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
