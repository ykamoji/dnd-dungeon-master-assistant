from google.adk.agents import Agent
from google.adk.tools import AgentTool, FunctionTool
from app.agents.config import MODEL
from app.agents.callbacks import make_track_agent_callback, track_tool_callback
from app.tools.campaign_files import fetch_campaign_files

story_agent = Agent(
    name="story_agent",
    model=MODEL,
    instruction="""You retrieve and synthesize D&D campaign content from the 
    Tomb of Annihilation adventure module.

    When asked about campaign lore, NPCs, locations, or rules:
    1. Use fetch_campaign_files to read the relevant markdown files
       from docs/Tomb-of-Annihilation/. Common paths:
       - Chapters/Ch-1-Port Nyanzaru/*.md
       - Chapters/Ch-2-The Land of Chult/*.md
       - etc.
    2. Return a concise, relevant excerpt with the source file path.
    3. Do NOT make up content — only return what's in the docs.
    
    If no relevant file is found, say so clearly.""",
    tools=[FunctionTool(fetch_campaign_files)],
    description="Retrieves campaign knowledge from Tomb of Annihilation adventure docs.",
    before_agent_callback=make_track_agent_callback("story_agent"),
    after_tool_callback=track_tool_callback,
)

story_tool = AgentTool(story_agent)
