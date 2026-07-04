"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useConsole } from "../ConsoleProvider";
import { EventTimeline } from "./EventTimeline";
import { ApprovalBar } from "./ApprovalBar";
import { SnapshotLayout } from "./SnapshotLayout";
import type { SessionEvent, TurnSnapshot, PartyState } from "@/lib/types";

export function parseDraftToSnapshot(draft: string): TurnSnapshot | null {
  try {
    const match = draft.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]);

    let partyState: PartyState | undefined;
    if (Array.isArray(data.party)) {
      partyState = { characters: {} };
      for (const char of data.party) {
        if (char.name) {
          partyState.characters[char.name] = char;
        }
      }
    }

    return {
      scene: data.scene_summary,
      description: data.description,
      narrative: data.narrative,
      dialogue: data.dialogue,
      party: partyState,
      intent: data.intent || "CAMPAIGN",
      metadata: {
        chapter: data.chapter,
        section: data.section,
        assets: data.assets,
        gm_notes: data.gm_notes,
        next_scene_suggestions: data.next_scene_suggestions,
        suggested_actions: data.suggested_actions,
        combat_log: data.combat_log,
        math_breakdown: data.math_breakdown,
        requires_roll: data.requires_roll
      }
    };
  } catch (e) {
    return null;
  }
}

/**
 * The in-flight turn: the live trace while the Dungeon Master works, and the
 * draft once it pauses for approval. Shown in the reader so the GM watches the
 * scene take shape where the result will appear.
 */
export function PendingView({
  events,
  awaiting,
  draft,
  onSync,
}: {
  events: SessionEvent[];
  awaiting: boolean;
  draft: string | null;
  onSync: () => void;
}) {
  const { setComposerDraft, approve, reject } = useConsole();
  const parsedDraft = draft ? parseDraftToSnapshot(draft) : null;
  const [tab, setTab] = useState<"draft" | "timeline">("timeline");

  useEffect(() => {
    if (awaiting && tab != 'draft') {
      setTab("draft");
    }
  }, [awaiting]);

  return (
    <div className="flex h-full flex-col gap-2">
      <header className="flex shrink-0 items-start justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-gold">
            {awaiting ? "" : "The Dungeon Master is at work"}
          </p>
          <h2 className="text-gilded mt-1 font-display text-2xl font-bold tracking-wide">
            {awaiting ? "" : "Weaving the scene…"}
          </h2>
        </div>
      </header>

      <div className="parchment flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-gold/40">
        <div className="relative flex shrink-0 justify-center gap-6 border-b border-gold/30 px-4 pt-3">
          {!awaiting && (
            <div className="absolute right-0 top-0">
              <Button onClick={onSync}>Sync</Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setTab("draft")}
            className={`cursor-pointer pb-2 font-display text-sm uppercase tracking-widest transition-colors ${tab === "draft"
              ? "border-b-2 border-gold text-gold-bright"
              : "text-parchment-dim hover:text-parchment"
              }`}
          >
            Scene Draft
          </button>
          <button
            type="button"
            onClick={() => setTab("timeline")}
            className={`cursor-pointer pb-2 font-display text-sm uppercase tracking-widest transition-colors ${tab === "timeline"
              ? "border-b-2 border-gold text-gold-bright"
              : "text-parchment-dim hover:text-parchment"
              }`}
          >
            Event Timeline
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          {tab === "draft" && (
            <div className="absolute inset-0 p-4">
              {parsedDraft ? (
                <SnapshotLayout snapshot={parsedDraft} setComposerDraft={setComposerDraft} />
              ) : draft ? (
                <div className="h-full overflow-y-auto scroll-thin">
                  <p className="whitespace-pre-wrap font-body text-parchment">{draft}</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader label="Waiting for draft..." />
                </div>
              )}
              {awaiting && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                  <ApprovalBar onApprove={approve} onReject={reject} />
                </div>
              )}
            </div>
          )}
          {tab === "timeline" && (
            <div className="absolute inset-0 overflow-y-auto scroll-thin p-4">
              <EventTimeline events={events} running={!awaiting} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
