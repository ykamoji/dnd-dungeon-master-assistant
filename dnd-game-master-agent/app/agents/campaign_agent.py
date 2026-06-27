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

campaign_executor = Agent(
    name="campaign_executor",
    model=MODEL,
    instruction="""You are a D&D Campaign Manager.

    Player's action: {last_player_action}
    Campaign ID: {campaign_id}
    Previous feedback (if retrying): {eval_feedback}
    
    Your job:
    1. Use get_campaign to load the current campaign state
    2. Use story_agent to retrieve relevant chapter/scene content and asset URLs
    3. Provide:
       - The Chapter and Section name (retrieved from story_agent)
       - A summary of the current scene and situation
       - GM notes (key NPCs present, threats, opportunities)
       - 2-3 suggested next scenes or directions
       - Any relevant asset URLs for the UI (retrieved from story_agent)
    4. Suggest 2-3 next actions for the player
    
    Be concise but thorough. Include asset URLs when available.""",
    tools=[
        FunctionTool(get_campaign),
        story_tool,
    ],
    output_key="campaign_draft",
    before_agent_callback=make_track_agent_callback("campaign_executor"),
    after_tool_callback=track_tool_callback,
)


class CampaignChecker(BaseAgent):
    """Evaluator for CampaignAgent output."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        agents = ctx.session.state.get("last_agent", [])
        agents.append(self.name)
        ctx.session.state["last_agent"] = agents

        draft = ctx.session.state.get("campaign_draft", "")
        issues = []

        if not draft:
            issues.append("Campaign summary is empty")

        draft_lower = str(draft).lower()
        ooc_patterns = []
        for pattern in ooc_patterns:
            if pattern in draft_lower:
                issues.append(f"Out-of-character language detected: '{pattern}'")
                break

        if issues:
            feedback = "Rejected by campaign_checker: " + "; ".join(issues)
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
            ctx.session.state["campaign_result"] = draft
            ctx.session.state["eval_feedback"] = ""
            ctx.session.state["intent"] = "CAMPAIGN"
            yield Event(
                author=self.name,
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="[Evaluator] Campaign summary resolved successfully.")]
                ),
                actions=EventActions(
                    escalate=True,
                    state_delta={
                        "campaign_result": draft,
                        "eval_feedback": "",
                        "intent": "CAMPAIGN",
                    },
                ),
            )


campaign_checker = CampaignChecker(name="campaign_checker")

campaign_agent = LoopAgent(
    name="campaign_agent",
    sub_agents=[campaign_executor, campaign_checker],
    max_iterations=3,
    description="Scene summaries, GM notes, next-scene suggestions, and asset URLs.",
)
