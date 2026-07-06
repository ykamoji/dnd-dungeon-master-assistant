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
 * The Dungeon Master core (req 1.2): dice, command input, and the HITL approval
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
      {error && (
        <div className="absolute bottom-[860px] left-1/3 mt-1 rounded-card border border-blood-bright/50 bg-blood px-3 py-2 text-md text-gold">
          {error}
        </div>
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
