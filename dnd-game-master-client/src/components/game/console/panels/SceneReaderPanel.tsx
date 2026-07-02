"use client";

import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { useConsole } from "../ConsoleProvider";
import { SnapshotLayout } from "../parts/SnapshotLayout";
import { PendingView } from "../parts/PendingView";
import { EventTimeline } from "../parts/EventTimeline";
import { getHistoricalEvents } from "@/lib/api";
import type { SessionEvent } from "@/lib/types";

/**
 * The scene/outcome reader — one component for both a clicked
 * historical turn and the just-completed outcome. Fed the active TurnSnapshot.
 */
export function SceneReaderPanel() {
  const {
    campaignId,
    activeSnapshot,
    historyLoading,
    history,
    progress,
    summary,
    setComposerDraft,
    viewPending,
    runStatus,
    events,
    pendingDraft,
    streamDelaying,
    reconnectStream,
    readerTab,
    setReaderTab,
  } = useConsole();

  const [historicalEvents, setHistoricalEvents] = useState<SessionEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);


  // Fetch historical events when switching to timeline
  useEffect(() => {
    if (readerTab === "timeline" && activeSnapshot?.metadata?.invocation_id && campaignId) {
      setLoadingHistory(true);
      getHistoricalEvents(campaignId, activeSnapshot.metadata.invocation_id)
        .then((data) => setHistoricalEvents(data))
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }

    if (!activeSnapshot?.metadata?.invocation_id && readerTab === "timeline") {
      setReaderTab("scene");
    }

  }, [readerTab, activeSnapshot?.metadata?.invocation_id, campaignId]);

  if (streamDelaying) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader label="Waking up the Dungeon Master…" />
      </div>
    );
  }

  // While a turn is in flight, the reader shows the live timeline / pending draft.
  if (viewPending) {
    return (
      <PendingView
        events={events}
        awaiting={runStatus === "awaiting_approval"}
        draft={pendingDraft}
        onSync={reconnectStream}
      />
    );
  }

  if (historyLoading && history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader label="Reading the scene…" />
      </div>
    );
  }

  if (!activeSnapshot) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="parchment max-w-md rounded-card border border-gold/30 p-8">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-gold">
            The table is set
          </p>
          <h2 className="text-gilded mt-3 font-display text-3xl font-bold tracking-wide">
            Your adventure awaits
          </h2>
          <p className="mt-3 font-rune text-parchment-dim">
            Issue your first command to the Dungeon Master, and the unfolding scene
            will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="parchment flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card">
      <div className="relative flex shrink-0 justify-center gap-6 border-b border-t-none border-gold/30 px-4">
        <div className="flex justify-center border-b border-gold/30">
          <button
            onClick={() => setReaderTab("scene")}
            className={`cursor-pointer px-4 py-2 font-display text-sm uppercase tracking-widest transition-colors ${readerTab === "scene"
              ? "border-b-2 border-gold-bright text-gold-bright"
              : "text-parchment-dim hover:text-parchment"
              }`}
          >
            Current Scene
          </button>
          {activeSnapshot.metadata?.invocation_id && (
            <button
              onClick={() => setReaderTab("timeline")}
              className={`cursor-pointer px-4 py-2 font-display text-sm uppercase tracking-widest transition-colors ${readerTab === "timeline"
                ? "border-b-2 border-gold-bright text-gold-bright"
                : "text-parchment-dim hover:text-parchment"
                }`}
            >
              Event Timeline
            </button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {readerTab === "scene" && (
          <div className="absolute inset-0 p-4">
            <SnapshotLayout
              snapshot={activeSnapshot}
              progress={progress}
              summary={summary}
              current={true}
              setComposerDraft={setComposerDraft}
            />
          </div>
        )}
        {readerTab === "timeline" && (
          <div className="absolute inset-0 overflow-y-auto scroll-thin p-4">
            {loadingHistory ? (
              <div className="flex h-full items-center justify-center">
                <Loader label="Loading timeline..." />
              </div>
            ) : (
              <EventTimeline events={historicalEvents} running={false} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
