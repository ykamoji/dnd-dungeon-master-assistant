"use client";

import { Button } from "@/components/ui/Button";

export type ApprovalDecision = "approve" | "reject";

interface ApprovalBarProps {
  draft: string | null;
  /** The option the GM has chosen, or null while still deciding. */
  decision: ApprovalDecision | null;
  onApprove: () => void;
  onReject: () => void;
  /** True while the chosen decision's API call is still in flight. */
  busy?: boolean;
}

const DECISION_COPY: Record<ApprovalDecision, { label: string; tone: string }> = {
  approve: { label: "Approved", tone: "border-gold bg-gold/15 text-gold-bright" },
  reject: { label: "Rejected", tone: "border-blood-bright bg-blood/15 text-blood-bright" },
};

/**
 * The HITL gate surfaced to the GM: preview the Dungeon Master's draft and
 * approve it (persist) or reject it (rewind the turn). Once a choice is made,
 * the unchosen option is removed and the chosen one shows a checkmark while
 * the decision is sent — so a click gets clear confirmation instead of the
 * whole bar silently vanishing.
 */
export function ApprovalBar({ draft, decision, onApprove, onReject, busy }: ApprovalBarProps) {
  return (
    <div className="parchment rounded-card border border-gold/40 p-4">
      <p className="font-display text-[10px] uppercase tracking-widest text-gold">
        Draft ready — your call, GM
      </p>
      {draft && (
        <p className="scroll-thin mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-body text-sm text-parchment">
          {draft}
        </p>
      )}

      {decision ? (
        <div
          className={`mt-4 flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 font-display text-sm uppercase tracking-wide ${DECISION_COPY[decision].tone}`}
        >
          <span aria-hidden>✓</span>
          {DECISION_COPY[decision].label}
          {busy && (
            <span
              aria-hidden
              className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
        </div>
      ) : (
        <div className="mt-4 flex gap-3">
          <Button onClick={onApprove} disabled={busy} className="flex-1">
            Approve
          </Button>
          <Button
            variant="secondary"
            onClick={onReject}
            disabled={busy}
            className="flex-1 hover:border-blood-bright hover:text-blood-bright"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
