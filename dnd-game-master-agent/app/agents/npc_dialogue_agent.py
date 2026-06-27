from typing import AsyncGenerator
from google.adk.agents import Agent, BaseAgent, LoopAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.tools import FunctionTool
from google.genai import types

from app.agents.config import MODEL
from app.agents.callbacks import make_track_agent_callback, track_tool_callback
from app.agents.story_agent import story_tool
from app.tools.character_lookup import lookup_character
from app.tools.open5e_lookup import lookup_open5e

npc_executor = Agent(
    name="npc_executor",
    model=MODEL,
    instruction="""You are a D&D NPC Dialogue specialist.

    Player's action: {last_player_action}
    Campaign ID: {campaign_id}
    Previous feedback (if retrying): {eval_feedback}
    
    Your job:
    1. Use lookup_character to get the NPC's stat block and personality
    2. Use story_agent to retrieve campaign context about this NPC
    3. Generate in-character dialogue that:
       - Matches the NPC's known personality and motivations
       - References events from the campaign
       - Advances the story naturally
       - Includes emotional cues (tone, body language)
    4. Suggest 2-3 follow-up actions for the player
    
    Stay in character. Never break the fourth wall.""",
    tools=[
        FunctionTool(lookup_character),
        FunctionTool(lookup_open5e),
        story_tool,
    ],
    output_key="npc_draft",
    before_agent_callback=make_track_agent_callback("npc_executor"),
    after_tool_callback=track_tool_callback,
)


class NpcChecker(BaseAgent):
    """Evaluator for NpcDialogueAgent output."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        agents = ctx.session.state.get("last_agent", [])
        agents.append(self.name)
        ctx.session.state["last_agent"] = agents

        draft = ctx.session.state.get("npc_draft", "")
        issues = []

        if not draft:
            issues.append("Dialogue is empty")

        draft_lower = str(draft).lower()
        ooc_patterns = []
        for pattern in ooc_patterns:
            if pattern in draft_lower:
                issues.append(f"Out-of-character language detected: '{pattern}'")
                break

        if issues:
            feedback = "Rejected by npc_checker: " + "; ".join(issues)
            ctx.session.state["eval_feedback"] = feedback
            yield Event(
                author=self.name,
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=f"[Evaluator] {feedback}")]
                ),
                actions=EventActions(state_delta={"eval_feedback": feedback}),
            )
        else:
            ctx.session.state["npc_result"] = draft
            ctx.session.state["eval_feedback"] = ""
            ctx.session.state["intent"] = "NPC_DIALOGUE"
            yield Event(
                author=self.name,
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="[Evaluator] NPC dialogue resolved successfully.")]
                ),
                actions=EventActions(
                    escalate=True,
                    state_delta={
                        "npc_result": draft,
                        "eval_feedback": "",
                        "intent": "NPC_DIALOGUE",
                    },
                ),
            )


npc_checker = NpcChecker(name="npc_checker")

npc_dialogue_agent = LoopAgent(
    name="npc_dialogue_agent",
    sub_agents=[npc_executor, npc_checker],
    max_iterations=3,
    description="Generates grounded NPC dialogue based on campaign lore and character stats.",
)
