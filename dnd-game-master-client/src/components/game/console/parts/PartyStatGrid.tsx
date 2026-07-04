"use client";

import type { ReactNode } from "react";

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

/** Class portrait path (public/characters/<Class>.png), title-cased. */
function portraitFor(cls: string): string {
  const name = cls ? cls.charAt(0).toUpperCase() + cls.slice(1).toLowerCase() : "";
  return `/characters/${name}.png`;
}

/* --- icon slot ----------------------------------------------------------- */
/** Placeholder icon — swap in your own icon (e.g. <img src="/icons/…" />). */
function IconSlot({ name }: { name: string }) {
  return <img src={`party/${name}.png`} className="h-full w-full" />;
}

/* --- stat value renderers ------------------------------------------------ */

/** Dummy XP progress bar (reference: "1,250 / 2,000 XP"). */
function XpBar({ current = 1250, max = 2000 }: { current?: number; max?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) * 100 : 0;
  return (
    <div className="w-44">
      <div className="h-1.5 overflow-hidden rounded-full bg-stone">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <span className="mt-1 block font-rune text-[11px] tracking-wide text-parchment-dim">
        {current.toLocaleString()} / {max.toLocaleString()} XP
      </span>
    </div>
  );
}

/** Inspiration diamonds (reference: ◆ ◇). Dummy filled count. */
function Diamonds({ filled = 2, total = 3 }: { filled?: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5 text-lg leading-none">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < filled ? "text-gold" : "text-gold/30"}>
          {i < filled ? "◆" : "◇"}
        </span>
      ))}
    </div>
  );
}

/** Red HP bar (reference: "28 / 28 HP"). */
function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) * 100 : 0;
  return (
    <div className="w-44">
      <div className="h-1.5 overflow-hidden rounded-full bg-stone">
        <div className="h-full bg-blood-bright" style={{ width: `${pct}%` }} />
      </div>
      <span className="mt-1 block font-display text-[12px] text-parchment-dim">
        {current} / {max} HP
      </span>
    </div>
  );
}

/** Stat row: icon slot + label + freeform value content. */
function StatBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-26 w-26 shrink-0 place-items-start">
        <IconSlot name={label.toLocaleLowerCase()} />
      </span>
      <div className="flex flex-col">
        <span className="font-rune text-[16px] uppercase tracking-[0.2em] text-parchment-dim">
          {label}
        </span>
        <div className="font-display text-lg text-gold">{children}</div>
      </div>
    </div>
  );
}

/* --- per-character gear line --------------------------------------------- */
function GearLine({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <p className="text-[13px] leading-snug text-parchment-dim">
      <span className="font-rune uppercase tracking-wide text-gold/80">{label}</span>{" "}
      {items.join(", ")}
    </p>
  );
}

function CharacterCard({ name, c }: { name: string; c: CharacterState }) {
  const ratio = c.max_hp > 0 ? Math.max(0, Math.min(1, c.hp / c.max_hp)) : 0;
  const initial = (c.class || name).charAt(0).toUpperCase();

  return (
    <div className="group relative flex aspect-[3/4] h-[520px] flex-col overflow-hidden rounded-card border border-stone-2 bg-obsidian-2/70 transition-colors hover:border-gold/40">
      {/* Full-bleed portrait — class image over a gradient fallback (shows if 404) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-stone-2 to-obsidian">
          <span className="font-display text-6xl text-gold/25">{initial}</span>
        </div>
        <img
          src={portraitFor(c.class)}
          alt={`${name} — ${c.class}`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        {/* Scrim so the overlaid details stay legible over the art */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-transparent" />
      </div>

      {c.class && (
        <span className="absolute left-2 top-2 z-10 rounded-full border border-gold/30 bg-obsidian/70 px-2 py-0.5 font-rune text-[11px] uppercase tracking-wide text-gold">
          {c.class}
        </span>
      )}

      {/* Details overlaid at the bottom, over the scrim */}
      <div className="relative z-10 mt-auto space-y-2 p-4">
        <div>
          <p className="font-display text-base text-parchment">{name}</p>
          {c.role && (
            <p className="font-rune text-[12px] uppercase tracking-wide text-parchment-dim">
              {c.role}
            </p>
          )}
        </div>

        {/* HP */}
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone">
            <div className={`h-full ${hpTone(ratio)}`} style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="font-display text-[13px] text-parchment-dim">
            {c.hp}/{c.max_hp}
          </span>
        </div>

        {/* Conditions */}
        {c.conditions?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.conditions.map((cond) => (
              <span
                key={cond}
                className="rounded-full border border-blood/50 bg-blood/10 px-2 py-0.5 text-[11px] text-blood-bright"
              >
                {cond}
              </span>
            ))}
          </div>
        )}

        {/* Gear / abilities */}
        <div className="space-y-1 border-t border-stone-2 pt-2">
          <GearLine label="Weapons" items={c.weapons} />
          <GearLine label="Armor" items={c.armors} />
          <GearLine label="Skills" items={c.skills} />
          <GearLine label="Spells" items={c.spells} />
          <GearLine label="Magic Items" items={c.magicitems} />
        </div>
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
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 rounded-card p-4">
          <StatBlock label="Party Level">
            <XpBar current={1250} max={2000} />
          </StatBlock>
          <StatBlock label="Perception">
            <Diamonds filled={2} total={3} />
          </StatBlock>
          <StatBlock label="Party Health">
            <HpBar current={partyBreakdown.health} max={partyBreakdown.health} />
          </StatBlock>
          <StatBlock label="Gold">{partyBreakdown.money ?? 0} gp</StatBlock>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="font-rune text-md text-parchment-dim/70">No party state recorded yet.</p>
      ) : (
        <div className="flex flex-row gap-2">
          {entries.map(([name, c]) => (
            <CharacterCard key={name} name={name} c={c} />
          ))}
        </div>
      )}

      {/* Party summary — dummy values; icons to be provided later */}
      <div className="flex flex-wrap items-center justify-around gap-x-8 gap-y-4 p-4">
        <StatBlock label="Initiative Bonus">+2</StatBlock>
        <StatBlock label="Passive Perception">14</StatBlock>
        <StatBlock label="Armor Class">15</StatBlock>
        <StatBlock label="Movement Speed">30 ft.</StatBlock>
      </div>
    </div>
  );
}
