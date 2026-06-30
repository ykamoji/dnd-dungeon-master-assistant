"use client";

import { useEffect, useState } from "react";
import { useConsole, type DiceRolls } from "../ConsoleProvider";
import { DiceTray } from "../parts/DiceTray";
import { CommandComposer } from "../parts/CommandComposer";
import { ApprovalBar, type ApprovalDecision } from "../parts/ApprovalBar";

const NO_ROLLS: DiceRolls = { d20: null, d100: null };

/**
 * The Game Master core (req 1.2): dice, command input, and the HITL approval
 * controls. The live trace is shown in the scene reader, not here.
 */
export function GameMasterPanel() {
  const {
    runStatus,
    composerDraft,
    error,
    submitTurn,
    approve,
    reject,
    setComposerDraft,
  } = useConsole();

  const [rolls, setRolls] = useState<DiceRolls>(NO_ROLLS);
  // Which option the GM clicked, so the bar can keep showing it (ticked) while
  // the decision is in flight instead of both options just vanishing.
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);

  const busy =
    runStatus === "running" ||
    runStatus === "awaiting_approval" ||
    runStatus === "rejecting";
  const awaitingDecision = runStatus === "awaiting_approval";
  // A decision was clicked and its call (approve → "running", reject →
  // "rejecting") hasn't settled yet.
  const decisionInFlight =
    decision !== null && (runStatus === "running" || runStatus === "rejecting");
  const showApprovalArea = awaitingDecision || decisionInFlight;

  // Once the cycle ends (turn settled, or it failed outright), clear the
  // chosen decision so the next draft starts fresh.
  useEffect(() => {
    if (runStatus === "idle" || runStatus === "error") setDecision(null);
  }, [runStatus]);

  const handleApprove = () => {
    setDecision("approve");
    approve();
  };
  const handleReject = () => {
    setDecision("reject");
    reject();
  };

  const handleSubmit = () => {
    submitTurn({ text: composerDraft, dice: rolls });
    setComposerDraft("");
    setRolls(NO_ROLLS);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="shrink-0 font-display text-[10px] uppercase tracking-[0.3em] text-gold">
        Game Master
      </p>

      {/* Approval controls take over the panel while paused at the gate, and
          stay up (showing the chosen option) while that decision is sent. */}
      {showApprovalArea ? (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          {/* The draft itself is shown in the scene reader; here we just decide. */}
          <ApprovalBar
            draft={null}
            decision={decision}
            onApprove={handleApprove}
            onReject={handleReject}
            busy={decisionInFlight}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {error && (
        <p className="shrink-0 rounded-card border border-blood-bright/50 bg-blood/10 px-3 py-2 text-sm text-blood-bright">
          {error}
        </p>
      )}

      <div className="shrink-0 space-y-3">
        <DiceTray rolls={rolls} onRoll={setRolls} disabled={busy} />
        <CommandComposer
          value={composerDraft}
          onChange={setComposerDraft}
          onSubmit={handleSubmit}
          disabled={busy}
          placeholder={
            showApprovalArea
              ? "Approve or reject the draft above to continue…"
              : undefined
          }
        />
      </div>
    </div>
  );
}
