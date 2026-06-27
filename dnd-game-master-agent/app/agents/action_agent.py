from typing import AsyncGenerator
from google.adk.agents import Agent, BaseAgent, LoopAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.tools import FunctionTool
from google.genai import types

from app.agents.config import MODEL
from app.agents.callbacks import make_track_agent_callback, track_tool_callback
from app.agents.story_agent import story_tool
from app.tools.campaign import get_campaign
from app.tools.character_lookup import lookup_character
from app.tools.open5e_lookup import lookup_open5e

action_executor = Agent(
    name="action_executor",
    model=MODEL,
    instruction="""You are the D&D 5e Combat and Rules Arbiter.

    Player's action: {last_player_action}
    Campaign ID: {campaign_id}
    Previous feedback (if retrying): {eval_feedback}
    
    Your job:
    1. Use get_campaign to load the current campaign state (party HP, scene, etc.)
    2. Use lookup_character or lookup_open5e to get relevant stat blocks
    3. Use story_agent to retrieve relevant campaign rules/context if needed
    4. Resolve the action following D&D 5e rules:
       - Show your math (AC, attack rolls, damage, saving throws)
       - Apply the results (HP changes, conditions, etc.)
    5. Provide a narrative description of what happened
    6. Suggest 2-3 next actions for the player
    
    Always show your math. Be specific about dice rolls and modifiers.""",
    tools=[
        FunctionTool(get_campaign),
        FunctionTool(lookup_character),
        FunctionTool(lookup_open5e),
        story_tool,
    ],
    output_key="action_draft",
    before_agent_callback=make_track_agent_callback("action_executor"),
    after_tool_callback=track_tool_callback,
)


class ActionChecker(BaseAgent):
    """Evaluator for ActionAgent output."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        agents = ctx.session.state.get("last_agent", [])
        agents.append(self.name)
        ctx.session.state["last_agent"] = agents

        draft = ctx.session.state.get("action_draft", "")
        print(f"\nDEBUG action_checker: draft is '{draft}' (type: {type(draft)})")
        issues = []
        
        if not draft:
            issues.append("Response is too short or empty — action was not resolved")

        ooc_patterns = []
        draft_lower = str(draft).lower()
        for pattern in ooc_patterns:
            if pattern in draft_lower:
                issues.append(f"Out-of-character language detected: '{pattern}'")
                break

        if issues:
            feedback = "Rejected by action_checker: " + "; ".join(issues)
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
            ctx.session.state["action_result"] = draft
            ctx.session.state["eval_feedback"] = ""
            ctx.session.state["intent"] = "ACTION"
            yield Event(
                author=self.name,
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="[Evaluator] Action resolved successfully.")]
                ),
                actions=EventActions(
                    escalate=True,
                    state_delta={
                        "action_result": draft,
                        "eval_feedback": "",
                        "intent": "ACTION",
                    },
                ),
            )


action_checker = ActionChecker(name="action_checker")

action_agent = LoopAgent(
    name="action_agent",
    sub_agents=[action_executor, action_checker],
    max_iterations=3,
    description="Combat and rules arbiter. Resolves player actions with D&D 5e mechanics.",
)
