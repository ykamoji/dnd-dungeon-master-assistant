import { HITL_INTERRUPT_ID } from "@/lib/api";
import type { EventPart, RunEvent } from "@/lib/types";

// ADK serializes events in camelCase; we read camelCase first, snake_case second.
const fnCall = (p: EventPart) => p.functionCall ?? p.function_call;
const fnResp = (p: EventPart) => p.functionResponse ?? p.function_response;
const longRunningIds = (ev: RunEvent) =>
  ev.longRunningToolIds ?? ev.long_running_tool_ids ?? [];

/** True if this event is the workflow pausing for human approval. */
export function isApprovalPause(ev: RunEvent): boolean {
  if (longRunningIds(ev)?.includes(HITL_INTERRUPT_ID)) return true;
  return Boolean(
    ev.content?.parts?.some(
      (p) => fnCall(p)?.name === "adk_request_input" || fnResp(p)?.name === "adk_request_input",
    ),
  );
}

/** Concatenated plain text of an event's content (skips model "thought" parts). */
export function eventText(ev: RunEvent): string {
  return (ev.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

/** The draft text awaiting approval — the latest player-facing text in the run. */
export function extractDraft(events: RunEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    if ((events[i].author ?? "") === "user") continue;
    const t = eventText(events[i]);
    if (t) return t;
  }
  return "The Dungeon Master has prepared a draft.";
}

/**
 * Map a raw ADK event to a humanized, in-character trace step. Returns null for
 * events not worth surfacing (the player's own input, empty deltas) so the
 * stream stays readable.
 */
export function friendlyStep(ev: RunEvent): { icon: string; label: string } | null {
  if ((ev.author ?? "") === "user") return null;
  if (isApprovalPause(ev)) return { icon: "✓", label: "Draft ready — awaiting your approval" };

  // Tool calls (rules lookups, dice, persistence) are the most informative.
  const call = ev.content?.parts?.map(fnCall).find(Boolean);
  if (call?.name) {
    const n = call.name.toLowerCase();
    if (n.includes("roll") || n.includes("dice")) return { icon: "🎲", label: "Rolling the dice…" };
    if (n.includes("lookup") || n.includes("resource") || n.includes("character"))
      return { icon: "📜", label: "Consulting the rules…" };
    if (n.includes("asset")) return { icon: "🖼️", label: "Finding scene art…" };
    if (n.includes("campaign") || n.includes("update") || n.includes("state"))
      return { icon: "💾", label: "Updating the campaign…" };
    if (n.includes("fetch") || n.includes("file") || n.includes("story"))
      return { icon: "📖", label: "Reading the adventure…" };
    return { icon: "🛠️", label: `Using ${call.name}…` };
  }

  // Otherwise classify by the agent/node that authored the event.
  const where = (ev.author ?? "").toLowerCase();
  if (where.includes("prepare")) return { icon: "🧭", label: "Reading the scene…" };
  if (where.includes("classif") || where.includes("supervisor"))
    return { icon: "🧠", label: "Interpreting your intent…" };
  if (where.includes("action")) return { icon: "⚔️", label: "Resolving your action…" };
  if (where.includes("npc")) return { icon: "💬", label: "Voicing the NPC…" };
  if (where.includes("setup")) return { icon: "✨", label: "Setting the stage…" };
  if (where.includes("campaign")) return { icon: "🗺️", label: "Advancing the story…" };
  if (where.includes("refuse") || where.includes("block"))
    return { icon: "🛑", label: "Request declined" };
  if (where.includes("output")) return { icon: "📝", label: "Composing the outcome…" };
  if (where.includes("hitl")) return { icon: "✓", label: "Reviewing the draft…" };

  // A plain model text turn with no node hint.
  if (eventText(ev)) return { icon: "💭", label: "The Dungeon Master ponders…" };
  return null;
}
