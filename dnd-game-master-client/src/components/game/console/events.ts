import { HITL_INTERRUPT_ID } from "@/lib/api";
import type { SessionEvent, SessionPart } from "@/lib/types";

const parts = (ev: SessionEvent): SessionPart[] => ev.content?.parts ?? [];

const agentMap = new Map<string, string>([
  ["dnd_game_master_agent", "Root"],
  ["llm_evaluator", "Evaluate"],
  ["campaign_executor", "Campaign"]
]);

export function isApprovalEvent(ev: SessionEvent): boolean {
  return parts(ev).some(
    (p) =>
      p.function_call?.name === "adk_request_input" ||
      p.function_call?.name === HITL_INTERRUPT_ID ||
      p.function_response?.name === "adk_request_input",
  );
}

/** Concatenated plain text of an event (skips the model's "thought" parts). */
export function eventText(ev: SessionEvent): string {
  return parts(ev)
    .filter((p) => p.text && !p.thought)
    .map((p) => typeof p.text === "string" ? p.text : JSON.stringify(p.text))
    .join("")
    .trim();
}

/** The draft awaiting approval — the latest player-facing text in the run. */
export function extractDraft(events: SessionEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].author === "user") continue;
    const t = eventText(events[i]);
    if (t) return t;
  }
  return "The Dungeon Master has prepared a draft.";
}

/** The first function call / response name on an event, if any. */
export function eventToolName(ev: SessionEvent): string | undefined {
  for (const p of parts(ev)) {
    if (p.function_call?.name) return p.function_call.name;
    if (p.function_response?.name) return p.function_response.name;
  }
  return undefined;
}

/**
 * Classify an event into the agent step it represents — an icon + a short title
 * shown above its dot on the timeline.
 */
export function eventStep(ev: SessionEvent): { icon: string; title: string } {

  const nickName = agentMap.has(ev.author) ? agentMap.get(ev.author)! : (ev.author ?? "Thinking");

  if (ev.author === "user") return { icon: "🎲", title: "Your move" };
  if (isApprovalEvent(ev)) return { icon: "✓", title: "Awaiting approval" };

  // Tool calls are the most informative — classify by the tool name.
  const tool = eventToolName(ev);
  if (tool) {
    const n = tool.toLowerCase();
    if (n.includes("roll") || n.includes("dice")) return { icon: "🎲", title: "Rolling dice" };
    if (n.includes("lookup") || n.includes("resource") || n.includes("character"))
      return { icon: "📜", title: "Consulting rules" };
    if (n.includes("asset")) return { icon: "🖼️", title: "Finding art" };
    if (n.includes("campaign") || n.includes("update") || n.includes("state"))
      return { icon: "💾", title: "Saving campaign" };
    if (n.includes("fetch") || n.includes("file") || n.includes("story"))
      return { icon: "📖", title: "Reading adventure" };
    return { icon: "🛠️", title: tool };
  }

  // Otherwise classify by the authoring agent/node.
  const a = (ev.author ?? "").toLowerCase();
  if (a.includes("prepare")) return { icon: "🧭", title: "Reading the scene" };
  if (a.includes("classif") || a.includes("supervisor"))
    return { icon: "🧠", title: "Reading intent" };
  if (a.includes("action")) return { icon: "⚔️", title: "Resolving action" };
  if (a.includes("npc")) return { icon: "💬", title: "Voicing NPC" };
  if (a.includes("setup")) return { icon: "✨", title: "Setting the stage" };
  if (a.includes("campaign")) return { icon: "🗺️", title: "Advancing story" };
  if (a.includes("refuse") || a.includes("block")) return { icon: "🛑", title: "Declined" };
  if (a.includes("output")) return { icon: "📝", title: "Composing outcome" };
  if (a.includes("hitl")) return { icon: "✓", title: "Reviewing draft" };

  return { icon: "💭", title: nickName };
}
