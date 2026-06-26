from google.adk.tools import FunctionTool

from .assets import get_asset_url
from .campaign_files import fetch_campaign_files
from .campaign_state import get_summary, load_campaign_state, save_campaign_state, save_summary
from .character_lookup import lookup_character
from .dice import roll_dice
from .open5e_lookup import lookup_class, lookup_monster, lookup_spell
from .party import get_party_state, update_state

TOOL_FUNCTIONS = {
    "get_party_state": get_party_state,
    "update_state": update_state,
    "roll_dice": roll_dice,
    "fetch_campaign_files": fetch_campaign_files,
    "lookup_character": lookup_character,
    "lookup_monster": lookup_monster,
    "lookup_spell": lookup_spell,
    "lookup_class": lookup_class,
    "get_asset_url": get_asset_url,
    "save_campaign_state": save_campaign_state,
    "load_campaign_state": load_campaign_state,
    "save_summary": save_summary,
    "get_summary": get_summary,
}

# Wrap all functions as ADK FunctionTools for use in the agent graph
ADK_TOOLS = [FunctionTool(func) for func in TOOL_FUNCTIONS.values()]
