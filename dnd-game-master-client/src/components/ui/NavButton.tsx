"use client";

interface NavButtonProps {
  direction: "up" | "down";
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

/** Corner navigation arrow for the scroll-locked game stage. */
export function NavButton({ direction, onClick, disabled, label }: NavButtonProps) {
  return (
    !disabled ? <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="group flex items-center gap-2 rounded-full border border-gold/30 bg-obsidian-2/70 px-4 py-2 text-parchment-dim backdrop-blur transition-all hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-25"
    >
      {direction === "up" && <Chevron up />}
      <span className="font-display text-xs uppercase tracking-widest">{label}</span>
      {direction === "down" && <Chevron />}
    </button> : <></>
  )
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform group-hover:${up ? "-translate-y-0.5" : "translate-y-0.5"}`}
    >
      <path
        d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
