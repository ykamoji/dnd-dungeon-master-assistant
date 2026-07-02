"use client";

import { LAYOUTS } from "./layouts";

interface LayoutSwitcherProps {
  value: string;
  onChange: (id: string) => void;
}

/** Dropdown to switch between console layouts (all expose the same features). */
export function LayoutSwitcher({ value, onChange }: LayoutSwitcherProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-display text-[10px] uppercase tracking-widest text-parchment-dim">
        Layout
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-stone-2 bg-obsidian-2 px-3 py-1.5 text-sm text-parchment outline-none transition-colors focus:border-gold/60"
      >
        {LAYOUTS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
