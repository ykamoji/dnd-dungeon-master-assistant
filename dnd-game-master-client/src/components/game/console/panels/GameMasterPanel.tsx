"use client";

import { useState } from "react";
import { useConsole, type DiceRolls } from "../ConsoleProvider";
import { DiceTray } from "../parts/DiceTray";
import { CommandComposer } from "../parts/CommandComposer";

const NO_ROLLS: DiceRolls = { d20: null, d100: null };

interface GameMasterPanelProps {
  /** "vertical" = serpentine rail; "hero" = a wider, board-like wrap. */
  orientation?: "vertical" | "hero";
}

/**
 * The Game Master core (req 1.2): dice, command input, and the HITL approval
 * controls. The live trace is shown in the scene reader, not here.
 */
export function GameMasterPanel({ orientation = "hero" }: GameMasterPanelProps) {
  const {
    runStatus,
    composerDraft,
    error,
    submitTurn,
    setComposerDraft,
  } = useConsole();

  const [rolls, setRolls] = useState<DiceRolls>(NO_ROLLS);

  const busy =
    runStatus === "running" ||
    runStatus === "awaiting_approval" ||
    runStatus === "rejecting";
  const awaiting = runStatus === "awaiting_approval";

  const handleSubmit = () => {
    submitTurn({ text: composerDraft, dice: rolls });
    setComposerDraft("");
    setRolls(NO_ROLLS);
  };

  return (
    <div>
      <p className="shrink-0 font-display text-[10px] uppercase tracking-[0.3em] text-gold">
        Game Master
      </p>

      {error && (
        <p className="shrink-0 rounded-card border border-blood-bright/50 bg-blood/10 px-3 py-2 text-sm text-blood-bright">
          {error}
        </p>
      )}

      <div className={`flex ${orientation === "vertical" ? "flex-col" : "flex-row"} items-center gap-3 space-y-3`}>
        <DiceTray rolls={rolls} onRoll={setRolls} disabled={busy} />
        <CommandComposer
          value={composerDraft}
          onChange={setComposerDraft}
          onSubmit={handleSubmit}
          disabled={busy}
          placeholder={
            awaiting
              ? "Approve or reject the draft above to continue…"
              : undefined
          }
        />
      </div>
    </div >
  );
}
