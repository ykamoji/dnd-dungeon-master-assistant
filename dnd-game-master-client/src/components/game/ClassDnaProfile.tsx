"use client";

import type { ClassProfile } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="font-display text-[10px] uppercase tracking-widest text-gold">
        {label}
      </dt>
      <dd className="text-sm text-parchment">{value}</dd>
    </div>
  );
}

/** D&D-styled "character DNA profile" sheet for a single class. */
export function ClassDnaProfile({ profile }: { profile: ClassProfile }) {
  return (
    <div>
      <h3 className="text-gilded font-display text-2xl font-bold tracking-wide">
        {profile.name}
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-4">
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

      {profile.prof_skills && (
        <div className="mt-4">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">
            Skills
          </p>
          <p className="text-sm text-parchment-dim">{profile.prof_skills}</p>
        </div>
      )}

      <div className="mt-5">
        <p className="font-display text-xs uppercase tracking-widest text-gold">
          {profile.subtypes_name || "Archetypes"} (selectable roles)
        </p>
        <ul className="mt-2 space-y-1">
          {profile.archetypes.map((a) => (
            <li key={a.slug} className="text-sm text-parchment">
              <span className="text-gold-bright">•</span> {a.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
