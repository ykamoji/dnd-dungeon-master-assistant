"use client";

import { useCallback, useEffect, useState } from "react";
import { getCampaigns } from "@/lib/api";
import type { CampaignSummary } from "@/lib/types";

interface UseCampaignsResult {
  campaigns: CampaignSummary[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetches saved-campaign summaries from GET /campaigns. */
export function useCampaigns(): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    getCampaigns()
      .then((data) => {
        if (active) {
          setCampaigns(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load campaigns");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { campaigns, loading, error, reload: load };
}
