"use client";

import { useCallback, useEffect, useState } from "react";
import { getCampaign } from "@/lib/api";
import type { TurnSnapshot } from "@/lib/types";

interface UseCampaignHistoryResult {
  history: TurnSnapshot[];
  /** Campaign-level completion (0–100), if known. */
  progress: number | null;
  /** High-level campaign summary, if known. */
  summary: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches the full turn history for a campaign
 * (GET /campaign/{id}?include_history=true).
 *
 * A brand-new campaign has no document yet, so the backend 404s — that's an
 * expected empty state, not an error.
 */
export function useCampaignHistory(
  campaignId: string | null,
): UseCampaignHistoryResult {
  const [history, setHistory] = useState<TurnSnapshot[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!campaignId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getCampaign(campaignId, true)
      .then((data) => {
        if (!active) return;
        setHistory(data.state ?? []);
        setProgress(data.progress ?? null);
        setSummary(data.summary ?? null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        // A missing campaign (new game, nothing persisted yet) → empty history.
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("404")) {
          setHistory([]);
          setError(null);
        } else {
          setError(msg || "Failed to load campaign history");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  useEffect(() => load(), [load]);

  return { history, progress, summary, loading, error, reload: load };
}
