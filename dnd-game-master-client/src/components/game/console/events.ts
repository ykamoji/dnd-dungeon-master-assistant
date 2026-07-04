import { HITL_INTERRUPT_ID } from "@/lib/api";
import type { SessionEvent, SessionPart } from "@/lib/types";

const parts = (ev: SessionEvent): SessionPart[] => ev.content?.parts ?? [];

const agentMap = new Map<string, string>([
  ["dnd_game_master_agent", "Game Master"],
  ["llm_evaluator", "Evaluate"],
  ["campaign_executor", "Campaign"],
  ["CAMPAIGN", "LORE"],
  ["NPC_DIALOGUE", "DIALOGUE"],
  ["ACTION", "ACTION"],
  ["setup_agent", "SETUP_COMPLETE"]
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
  let tool_name_called = ["Invoked"]
  let tool_name_response = ["Responsed"]
  for (const p of parts(ev)) {
    if (p.function_call?.name) tool_name_called.push(p.function_call.name);
    if (p.function_response?.name) tool_name_response.push(p.function_response.name);
  }

  const tool_invoked = tool_name_called.join(', ')
  const tool_responsed = tool_name_response.join(', ')

  if (tool_name_response.length > 1) return tool_responsed
  if (tool_name_called.length > 1) return tool_invoked

  return undefined
}

/**
 * Classify an event into the agent step it represents — an icon + a short title
 * shown above its dot on the timeline.
 */
export function eventStep(ev: SessionEvent): { icon: string; title: string } {

  const nickName = agentMap.has(ev.author) ? agentMap.get(ev.author)! : (ev.author ?? "Thinking");

  if (ev.author === "user") return { icon: "🎲", title: "Your move" };
  if (isApprovalEvent(ev)) return { icon: "✓", title: "Awaiting approval" };

  // console.log(ev)

  // Tool calls are the most informative — classify by the tool name.
  const tool = eventToolName(ev);
  if (tool) {
    const n = tool.toLowerCase();

    if (n.includes("invoked")) {
      if (n.includes("lookup") || n.includes("resource") || n.includes("character") || n.includes("set_"))
        return { icon: "📜", title: "Consulting Lore" };

      if (n.includes("asset")) return { icon: "🖼️", title: "Finding art" };

      if (n.includes("fetch") || n.includes("file") || n.includes("story"))
        return { icon: "📖", title: "Reading Lore" };

      if (n.includes("get_state"))
        return { icon: "📖", title: "Reading Story" };
    }

    if (n.includes("responsed")) {

      if (n.includes("update")) {
        return { icon: "💾", title: "Saving" };
      }

      if (n.includes("fetch") || n.includes("file") || n.includes("story") || n.includes("set_"))
        return { icon: "📖", title: "Read Lore" };

      if (n.includes("get_state") || n.includes("lookup"))
        return { icon: "🗂️", title: "Read Story" };
    }

    return { icon: "🛠️", title: tool };
  }

  // Otherwise classify by the authoring agent/node.
  const a = (ev.author ?? "").toLowerCase();

  if (a.includes("llm_evaluator")) {
    if (ev.content?.parts.length == 1) {
      return { icon: "🔍", title: "Evaluating" };
    }
    else {
      return { icon: "🎯", title: "Evaluation Completed" };
    }
  }

  if (a.includes("campaign_evaluator")) {
    return { icon: "📚", title: "Lore Validated" };
  }

  if (a.includes("npc_evaluator")) {
    return { icon: "🗣️", title: "Dialogue Validated" };
  }

  if (a.includes("action_evaluator")) {
    return { icon: "⚔️", title: "Action Validated" };
  }

  if (a.includes("prepare")) return { icon: "🧭", title: "Reading the scene" };
  if (a.includes("classif") || a.includes("supervisor")) {
    const intent = agentMap.get(ev.content?.parts[0].text) ?? "Intent"
    if (intent === 'LORE')
      return { icon: "🧠", title: intent };
    else if (intent === 'DIALOGUE')
      return { icon: "🗣️", title: intent };
    else if (intent === 'ACTION')
      return { icon: "⚔️", title: intent };
    else
      return { icon: "💭", title: intent };
  }

  if (a.includes("setup_agent"))
    return { icon: "✓", title: "Setup Completed" };

  if (a.includes("setup_executor")) return { icon: "✨", title: "Setting the stage" };
  if (a.includes("setup_checker")) return { icon: "🔍", title: "Evaluating setup" };

  if (a.includes("campaign")) return { icon: "🗺️", title: "Advancing story" };
  if (a.includes("refuse") || a.includes("block")) return { icon: "🛑", title: "Declined" };
  if (a.includes("output")) return { icon: "📝", title: "Composing outcome" };
  if (a.includes("hitl")) return { icon: "✓", title: "Reviewing draft" };

  return { icon: "💭", title: nickName };
}
