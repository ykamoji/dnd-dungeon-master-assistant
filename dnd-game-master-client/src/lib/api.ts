// Central place for every backend call. Components never call fetch directly —
// they go through hooks, which call these functions.
//
// ROOT_API is intentionally empty: requests are same-origin and proxied to the
// FastAPI backend by next.config.ts rewrites (no CORS). Set it to an absolute
// origin only if you bypass the proxy.

import type { CampaignSummary, ClassProfile } from "./types";

export const ROOT_API = "";

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ROOT_API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** GET /tools/classes — class DNA profiles for the party builder. */
export function getClasses(): Promise<ClassProfile[]> {
  return getJSON<ClassProfile[]>("/tools/classes");
}

/** GET /campaigns — saved-campaign summaries for the resume flow. */
export function getCampaigns(): Promise<CampaignSummary[]> {
  return getJSON<CampaignSummary[]>("/campaigns");
}

/** GET /campaign/{id} — full campaign document. */
export function getCampaign(
  campaignId: string,
  includeHistory = false,
): Promise<unknown> {
  const q = includeHistory ? "?include_history=true" : "";
  return getJSON(`/campaign/${encodeURIComponent(campaignId)}${q}`);
}

/** POST /tools/fetch_campaign_files — fetch adventure markdown docs by path. */
export function fetchCampaignFiles(paths: string[]): Promise<unknown> {
  return getJSON("/tools/fetch_campaign_files", {
    method: "POST",
    body: JSON.stringify({ paths }),
  });
}

/** POST /tools/get_asset_url — fuzzy-resolve an image URL by description. */
export function getAssetUrl(description: string): Promise<{ url?: string }> {
  return getJSON("/tools/get_asset_url", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

/** GET /health/db — backend MongoDB health. */
export function healthDb(): Promise<{ status: string }> {
  return getJSON("/health/db");
}
