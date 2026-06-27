import os

from google.adk.agents import Agent
from google.adk.tools import AgentTool, FunctionTool
from app.agents.config import MODEL
from app.agents.callbacks import make_track_agent_callback, track_tool_callback
from app.tools.campaign_files import fetch_campaign_files
from app.tools.assets import get_asset_url

# Project root = <repo>/ (story_agent.py is at <repo>/dnd-game-master-agent/app/agents/).
_AGENT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PROJECT_ROOT = os.path.dirname(_AGENT_ROOT)


def _load_index(*rel_parts: str) -> str:
    """Load an index file's text, or a clear placeholder if it's missing.

    The indexes are read once at import and embedded in the instruction so the
    agent always knows which files exist before it calls fetch_campaign_files.
    A missing index degrades gracefully rather than crashing agent construction.
    """
    path = os.path.join(_PROJECT_ROOT, *rel_parts)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except OSError as exc:
        return f"(index unavailable at {os.path.join(*rel_parts)}: {exc})"


# The knowledge index maps adventure topics -> exact markdown file paths; the
# asset index maps scene/NPC/map descriptions -> image files. Without these in
# context the model guesses paths (e.g. a `*.md` glob) and fetch_campaign_files
# returns "File not found", leaving the GM with no grounding.
_KNOWLEDGE_INDEX = _load_index("docs", "KNOWLEDGE.md")
_ASSET_INDEX = _load_index("assets", "Tomb-of-Annihilation", "ASSETS.md")

_INSTRUCTION = """You retrieve and synthesize D&D campaign content from the
Tomb of Annihilation adventure module, and you select scene art.

You are given two indexes (below). They are your map of what exists — consult
them first, every time. Do not guess file paths or invent content.

1. KNOWLEDGE INDEX (docs/KNOWLEDGE.md): maps the adventure's topics, locations,
   NPCs, and chapters to the EXACT markdown files that describe them. Read the
   folder-level descriptions to narrow the area, then the per-file descriptions
   to pick the specific file(s) to load.
2. ASSET INDEX (assets/Tomb-of-Annihilation/ASSETS.md): maps scene/NPC/map
   descriptions to image files. Build a URL by appending a row's `File` value to
   the section's Base URL.

How to answer a request:
1. Find the best-matching entry in the KNOWLEDGE INDEX and note its link path.
2. Call `fetch_campaign_files` with that path (you may pass several at once).
   Pass the path EXACTLY as written in the index link, e.g.
   "Tomb-of-Annihilation/Chapters/Ch-1-Port Nyanzaru/Arival.md" — the tool
   normalizes the index's prefix and URL-encoding for you, so you do not need to
   reformat it.
3. Synthesize a rich, detailed narrative excerpt from the returned content and cite the
   source path. Write like a true D&D Game Master running a campaign — provide abundant
   source material, deep descriptions of the scene, and clearly articulate the immediate
   tasks, goals, or objectives for the players based on the text.
4. Find the best matching row in the ASSET INDEX and return the full URL (Base URL + File) in your response.
5. Identify the Chapter and Section based on the file path and explicitly state them in your response (e.g. "Chapter: Ch 1 Port Nyanzaru, Section: Arrival").
6. If nothing in the indexes matches the request, say so clearly rather than
   guessing.

=== KNOWLEDGE INDEX (docs/KNOWLEDGE.md) ===
{knowledge}

=== ASSET INDEX (assets/Tomb-of-Annihilation/ASSETS.md) ===
{assets}
""".format(knowledge=_KNOWLEDGE_INDEX, assets=_ASSET_INDEX)

story_agent = Agent(
    name="story_agent",
    model=MODEL,
    instruction=_INSTRUCTION,
    tools=[
        FunctionTool(fetch_campaign_files),
        # FunctionTool(get_asset_url),
    ],
    description="Retrieves campaign knowledge from Tomb of Annihilation adventure docs.",
    before_agent_callback=make_track_agent_callback("story_agent"),
    after_tool_callback=track_tool_callback,
)

story_tool = AgentTool(story_agent)
