"use client";

import { useEffect } from "react";
import type { ClassProfile, PartyMember } from "@/lib/types";

interface PartyMemberRowProps {
  member: PartyMember;
  classes: ClassProfile[];
  activeDna?: string | null;
  onChange: (member: PartyMember) => void;
  onRemove: () => void;
  onViewDna: (className: string) => void;
}

function parseSkillsData(profSkills: string) {
  let limit = 2;
  const words = profSkills.split(" ");
  if (words.length > 1) {
    const numWord = words[1].toLowerCase();
    const map: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8
    };
    if (map[numWord]) {
      limit = map[numWord];
    } else if (!isNaN(parseInt(numWord, 10))) {
      limit = parseInt(numWord, 10);
    }
  }

  let skillsStr = profSkills;
  const fromIndex = profSkills.toLowerCase().indexOf("from ");
  if (fromIndex !== -1) {
    skillsStr = profSkills.substring(fromIndex + 5);
  }

  const available = skillsStr
    .split(",")
    .map((s) => s.trim().replace(/^and /i, "").replace(/\.$/, ""))
    .filter(Boolean);

  return { limit, available };
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

  useEffect(() => {
    if (
      selectedClass &&
      selectedClass.prof_skills &&
      (!member.skills || member.skills.length === 0)
    ) {
      const { limit, available } = parseSkillsData(selectedClass.prof_skills);
      const newSkills = [...available]
        .sort(() => 0.5 - Math.random())
        .slice(0, limit);
      // Pass the fully constructed member back up
      onChange({ ...member, skills: newSkills });
    }
    // We intentionally only depend on the class name and skill length to avoid reference loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass?.name, member.skills?.length]);

  return (
    <div className="parchment grid grid-cols-1 items-center gap-3 rounded-card border border-stone-2 p-4 sm:grid-cols-[0.2fr_0.2fr_0.2fr_0.4fr_auto]">
      <label className="flex flex-col gap-1">
        <span className="font-display text-[12px] uppercase tracking-widest text-gold">
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
        <span className="font-display text-[12px] uppercase tracking-widest text-gold">
          Class
        </span>
        <select
          className={fieldClass}
          value={member.className}
          onChange={(e) => {
            const newClassName = e.target.value;
            const newClass = classes.find((c) => c.name === newClassName);
            let newSkills: string[] = [];
            if (newClass && newClass.prof_skills) {
              const { limit, available } = parseSkillsData(newClass.prof_skills);
              newSkills = [...available].sort(() => 0.5 - Math.random()).slice(0, limit);
            }
            onChange({ ...member, className: newClassName, role: "", skills: newSkills });
          }}
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
        <span className="font-display text-[12px] uppercase tracking-widest text-gold">
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

      {selectedClass?.prof_skills && (() => {
        const { limit, available } = parseSkillsData(selectedClass.prof_skills);
        return (
          <div className="flex flex-col gap-1 sm:mt-0">
            <span className="font-display text-[13px] uppercase tracking-widest text-gold">
              Skills (Select {limit})
            </span>
            <div className="flex flex-wrap gap-2">
              {available.map((skill) => {
                const isSelected = member.skills?.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      const currentSkills = member.skills || [];
                      if (isSelected) {
                        onChange({
                          ...member,
                          skills: currentSkills.filter((s) => s !== skill),
                        });
                      } else {
                        const nextSkills = [...currentSkills, skill].slice(-limit);
                        onChange({ ...member, skills: nextSkills });
                      }
                    }}
                    className={`rounded-full px-2 py-1 text-[13px] transition-colors border-[0.5px] cursor-grab ${isSelected
                      ? "border-gold"
                      : "border-parchment/0 hover:border-gold-dim/40 hover:text-parchment"
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!selectedClass}
          onClick={() => onViewDna(member.className)}
          title="View class DNA profile"
          className={`rounded-md border px-3 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-30 ${dnaActive
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
