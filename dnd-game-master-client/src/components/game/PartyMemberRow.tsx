"use client";

import type { ClassProfile, PartyMember } from "@/lib/types";

interface PartyMemberRowProps {
  member: PartyMember;
  classes: ClassProfile[];
  activeDna?: string | null;
  onChange: (member: PartyMember) => void;
  onRemove: () => void;
  onViewDna: (className: string) => void;
}

const fieldClass =
  "w-full rounded-md border border-stone-2 bg-obsidian-2 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60";

/** A single editable party member: name, class, and archetype role. */
export function PartyMemberRow({
  member,
  classes,
  activeDna,
  onChange,
  onRemove,
  onViewDna,
}: PartyMemberRowProps) {
  const selectedClass = classes.find((c) => c.name === member.className);
  const archetypes = selectedClass?.archetypes ?? [];
  const dnaActive = Boolean(selectedClass) && activeDna === member.className;

  return (
    <div className="parchment grid grid-cols-1 items-end gap-3 rounded-card border border-stone-2 p-4 sm:grid-cols-[1.2fr_1fr_1.2fr_auto]">
      <label className="flex flex-col gap-1">
        <span className="font-display text-[10px] uppercase tracking-widest text-gold">
          Name
        </span>
        <input
          className={fieldClass}
          value={member.name}
          placeholder="Hero name"
          onChange={(e) => onChange({ ...member, name: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-display text-[10px] uppercase tracking-widest text-gold">
          Class
        </span>
        <select
          className={fieldClass}
          value={member.className}
          onChange={(e) =>
            // Changing class invalidates the previously chosen archetype role.
            onChange({ ...member, className: e.target.value, role: "" })
          }
        >
          <option value="">Select…</option>
          {classes.map((c) => (
            <option key={c.slug} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-display text-[10px] uppercase tracking-widest text-gold">
          Role (Archetype)
        </span>
        <select
          className={fieldClass}
          value={member.role}
          disabled={!selectedClass}
          onChange={(e) => onChange({ ...member, role: e.target.value })}
        >
          <option value="">
            {selectedClass ? "Select…" : "Pick a class first"}
          </option>
          {archetypes.map((a) => (
            <option key={a.slug} value={a.name}>
              {a.name}
            </option>
          ))}
          {/* Preserve preset labels (e.g. "The Navigator") that aren't archetypes. */}
          {member.role && !archetypes.some((a) => a.name === member.role) && (
            <option value={member.role}>{member.role}</option>
          )}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!selectedClass}
          onClick={() => onViewDna(member.className)}
          title="View class DNA profile"
          className={`rounded-md border px-3 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-30 ${
            dnaActive
              ? "border-gold bg-gold/20 text-gold-bright"
              : "border-gold/40 text-gold hover:bg-gold/10"
          }`}
        >
          DNA
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove member"
          className="rounded-md border border-stone-2 px-3 py-2 text-xs uppercase tracking-wider text-parchment-dim transition-colors hover:border-blood-bright hover:text-blood-bright"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
