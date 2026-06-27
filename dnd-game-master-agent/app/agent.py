# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""D&D Game Master — ADK 2.0 Graph Workflow.

The pipeline is a directed graph (not a SequentialAgent):

    START
      → prepare            (init turn state + input guardrail)
          ├─ "blocked" → refuse                      (END)
          └─ "safe"    → classify  (intent classifier LLM)
                          → route_intent
                              ├─ "ACTION"       → action_agent ┐
                              ├─ "NPC_DIALOGUE" → npc_agent     ├→ hitl_gate
                              └─ "CAMPAIGN"     → campaign_agent┘     → output_agent (END)

The HITL gate (`hitl_gate`) is a workflow node: it yields a `RequestInput`,
pauses the run, and resumes from `ctx.resume_inputs` — the engine then follows
the edge to `output_agent`, which formats the GMResponse.

State contract (unchanged):
- state.last_agent / tools_fired: observability traces
- state.intent: ACTION | NPC_DIALOGUE | CAMPAIGN
- state.is_safe / rejection_reason: guardrail result
- state.last_player_action: the player's message (read by specialist prompts)
- state.{action,npc,campaign}_result: specialist drafts
- state.player_rejected: HITL rejection flag
- state.gm_response: final formatted output
"""

from typing import Any

from google.adk.agents.context import Context
from google.adk.apps import App, ResumabilityConfig
from google.adk.events.event import Event
from google.adk.events.request_input import RequestInput
from google.adk.workflow import Workflow, node
from google.genai import types
import json

from app.tools.campaign import get_campaign

from app.agents.callbacks import evaluate_input_safety
from app.agents.supervisor_agent import classifier
from app.agents.action_agent import action_agent
from app.agents.npc_dialogue_agent import npc_dialogue_agent
from app.agents.campaign_agent import campaign_agent
from app.agents.output_agent import output_agent

_HITL_INTERRUPT_ID = "hitl_approval"
_APPROVE_WORDS = {"ok", "yes", "y", "approve", "accept", "sure", "fine", "looks good"}
_RESULT_KEY = {
    "ACTION": "action_result",
    "NPC_DIALOGUE": "npc_result",
    "CAMPAIGN": "campaign_result",
}


def _text_of(value: Any) -> str:
    """Extract plain text from a node_input that may be str or types.Content."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    parts = getattr(value, "parts", None)
    if parts:
        return " ".join(p.text for p in parts if getattr(p, "text", None)).strip()
    return str(value)


# ===========================================================================
# FUNCTION NODES
# ===========================================================================

def prepare(ctx: Context, node_input: Any) -> Event:
    """Entry node: reset per-turn state, capture the player's message, and run
    the input guardrail. Routes "safe" or "blocked"."""
    text = _text_of(node_input)
    is_safe, reason, refusal = evaluate_input_safety(text)
    turn = ctx.state.get("turn_count", 0) + 1
    campaign_id = (
        ctx.state.get("campaign_id")
        or getattr(getattr(ctx, "session", None), "id", None)
        or "default-campaign"
    )

    campaign_data = get_campaign(campaign_id, include_history=False)
    campaign_state = json.dumps(campaign_data, default=str) if campaign_data else "No campaign data found."

    return Event(
        output=text,
        route="safe" if is_safe else "blocked",
        state={
            "turn_count": turn,
            "last_agent": [],
            "tools_fired": [],
            "intent": "",
            "eval_feedback": "",
            "player_rejected": False,
            "last_player_action": text,
            "is_safe": is_safe,
            "rejection_reason": reason,
            "rejection_message": refusal,
            "campaign_id": campaign_id,
            "campaign_state": campaign_state,
            # Pre-seed result keys so output_agent's template always resolves.
            "action_result": "",
            "npc_result": "",
            "campaign_result": "",
        },
    )


def refuse(ctx: Context, node_input: Any) -> Event:
    """Terminal node for blocked input: emit the guardrail's safe refusal."""
    message = ctx.state.get("rejection_message") or (
        "🎲 I can only help with combat, NPC conversations, or campaign management."
    )
    return Event(
        content=types.Content(role="model", parts=[types.Part.from_text(text=message)]),
        output=message,
        state={"gm_response": message},
    )


def route_intent(ctx: Context, node_input: Any) -> Event:
    """Read the classifier's label and route to the matching specialist branch.

    Passes the player's message through as the branch output so the specialist
    node receives the real action (not the bare intent label).
    """
    label = _text_of(node_input).upper()
    intent = "CAMPAIGN"  # default for ambiguous classifications
    for candidate in ("ACTION", "NPC_DIALOGUE", "CAMPAIGN"):
        if candidate in label:
            intent = candidate
            break
    return Event(
        output=ctx.state.get("last_player_action", ""),
        route=intent,
        state={"intent": intent},
    )


@node(name="hitl_gate", rerun_on_resume=True)
async def hitl_gate(ctx: Context, node_input: Any):
    """Human-in-the-loop approval gate.

    First pass: show the specialist's draft and pause with a RequestInput.
    Resume pass (rerun_on_resume): read the player's answer from
    ctx.resume_inputs, record approval/rejection, and continue to output.
    """
    intent = ctx.state.get("intent", "")
    draft = ctx.state.get(_RESULT_KEY.get(intent, ""), "")

    if not draft:
        # Nothing to approve (e.g. specialist rejected) — fall through to output.
        yield Event(output="")
        return

    turn = ctx.state.get("turn_count", 1)
    interrupt_id = f"hitl_approval_{turn}"

    if not ctx.resume_inputs or interrupt_id not in ctx.resume_inputs:
        preview = (
            f"**[{intent} Draft]**\n\n{draft}\n\n---\n"
            "*Type 'ok' to approve, or anything else to cancel this turn.*"
        )
        yield Event(
            content=types.Content(role="model", parts=[types.Part.from_text(text=preview)])
        )
        yield RequestInput(
            interrupt_id=interrupt_id,
            message="Approve this response? Type 'ok' to confirm.",
        )
        return

    answer = ctx.resume_inputs[interrupt_id]
    if isinstance(answer, dict):
        answer = answer.get("response") or answer.get("result") or ""
    rejected = str(answer).strip().lower() not in _APPROVE_WORDS
    yield Event(output=draft, state={"player_rejected": rejected})


# ===========================================================================
# WORKFLOW GRAPH
# ===========================================================================

root_agent = Workflow(
    name="dnd_game_master",
    edges=[
        ("START", prepare),
        (prepare, {"safe": classifier, "blocked": refuse}),
        (classifier, route_intent),
        (route_intent, {
            "ACTION": action_agent,
            "NPC_DIALOGUE": npc_dialogue_agent,
            "CAMPAIGN": campaign_agent,
        }),
        (action_agent, hitl_gate),
        (npc_dialogue_agent, hitl_gate),
        (campaign_agent, hitl_gate),
        (hitl_gate, output_agent),
    ],
    description="D&D Game Master graph: guardrail, intent routing, specialist "
                "agents, HITL approval, and structured output.",
)

# ===========================================================================
# APP — entry point for ADK
# ===========================================================================
# ResumabilityConfig enables the HITL RequestInput to pause and resume.
# App name MUST match the directory name ("app") or eval will fail.

app = App(
    name="app",
    root_agent=root_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)
