"use client";

import { Button } from "@/components/ui/Button";

interface ApprovalBarProps {
  onApprove: () => void;
  onReject: () => void;
}

/**
 * The HITL gate surfaced to the GM: preview the Dungeon Master's draft and
 * approve it (persist) or reject it (rewind the turn).
 */
export function ApprovalBar({ onApprove, onReject }: ApprovalBarProps) {
  return (
    <div className="parchment">
      <div className="mt-1 flex gap-3">
        <Button onClick={onApprove} size="lg">
          Approve
        </Button>
        <Button
          variant="secondary"
          onClick={onReject}
          className="hover:border-blood-bright hover:text-blood-bright" size="lg"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
