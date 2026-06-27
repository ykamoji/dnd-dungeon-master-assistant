from google.adk.agents import Agent

from google.adk.tools import FunctionTool

from app.agents.config import MODEL
from app.agents.schemas import GMResponse
from app.agents.callbacks import make_track_agent_callback
from app.tools.campaign import update_campaign

output_agent = Agent(
    name="output_agent",
    model=MODEL,
    instruction="""You are the D&D Game Master Output Formatter and State Updater.

    Your ONLY job is to format the specialist agent's output into a JSON object 
    and persist the latest state to MongoDB.

    Step 1. Call the `update_campaign` tool with the details matching the MongoDB 
    fields (scene, description, progress, party, initiative, metadata) extracted 
    from the specialist result.
    Step 2. Return ONLY a raw JSON object matching the GMResponse schema below.

    Intent: {intent}
    Action Result: {action_result}
    NPC Result: {npc_result}
    Campaign Result: {campaign_result}
    Last Agents: {last_agent}
    Tools Fired: {tools_fired}

    GMResponse Schema (all fields are optional, use only what's relevant to the intent):
    {
        "intent": "ACTION | NPC_DIALOGUE | CAMPAIGN",
        "narrative": "string",
        "combat_log": [{"action": "str", "target": "str", "roll": "str", "result": "str"}],
        "math_breakdown": "string",
        "npc_name": "string",
        "dialogue": [{"speaker": "str", "text": "str", "emotion": "str"}],
        "scene_summary": "string",
        "gm_notes": "string",
        "next_scene_suggestions": ["str"],
        "asset_urls": ["str"],
        "suggested_actions": ["str"],
        "requires_roll": true/false,
        "last_agent": ["str"],
        "tools_fired": ["str"]
    }

    Rules:
    - For ACTION intent: fill narrative, combat_log, math_breakdown, suggested_actions
    - For NPC_DIALOGUE intent: fill narrative, npc_name, dialogue, suggested_actions
    - For CAMPAIGN intent: fill narrative, scene_summary, gm_notes, next_scene_suggestions, asset_urls
    - ALWAYS include last_agent and tools_fired for observability
    - ALWAYS include suggested_actions (2-3 choices for the player)
    - Set requires_roll=true if the next suggested action likely needs a dice roll
    
    Do NOT add information that isn't in the specialist's output.
    Return ONLY valid JSON (no markdown block, just the raw JSON object).""",
    tools=[FunctionTool(update_campaign)],
    output_key="gm_response",
    before_agent_callback=make_track_agent_callback("output_agent"),
)
