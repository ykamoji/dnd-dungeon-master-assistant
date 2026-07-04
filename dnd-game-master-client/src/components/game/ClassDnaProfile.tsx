"use client";

import type { ClassProfile } from "@/lib/types";

function Stat({ label, value, isClass = false }: { label: string; value: string, isClass?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      {label && <dt className="font-display text-[11px] uppercase tracking-widest text-gold">{label}</dt>}
      {isClass ? <dd className="text-gilded font-display text-3xl font-bold tracking-wide">{value}</dd> :
        <dd className="text-md text-parchment">{value}</dd>
      }
    </div>
  );
}

/** D&D-styled "character DNA profile" sheet for a single class. */
export function ClassDnaProfile({ profile }: { profile: ClassProfile }) {
  return (
    <div className="flex flex-col gap-5">
      {/* <div className="flex flex-col items-center gap-4">
        <h3 className="text-gilded font-display text-3xl font-bold tracking-wide">
          {profile.name}
        </h3>
      </div> */}
      <div className="flex flex-row gap-2">
        <img
          src={`characters/${profile.name}.png`}
          alt={profile.name}
          className="w-[75%] h-auto rounded-card border border-gold/30 object-cover object-top shadow-[0_0_20px_rgba(217,119,6,0.2)]"
          onError={(e) => {
            // Hide if missing
            e.currentTarget.style.display = "none";
          }}
        />
        <dl className="mt-4 grid grid-cols-1 items-center">
          <Stat label="" value={profile.name} isClass />
          <Stat label="Hit Dice" value={profile.hit_dice} />
          <Stat label="HP at 1st Level" value={profile.hp_at_1st_level} />
          <Stat label="Saving Throws" value={profile.prof_saving_throws} />
          <Stat
            label="Spellcasting"
            value={profile.spellcasting_ability || "None"}
          />
          <Stat label="Armor" value={profile.prof_armor} />
          <Stat label="Weapons" value={profile.prof_weapons} />
        </dl>
      </div>
    </div>
  );
}
