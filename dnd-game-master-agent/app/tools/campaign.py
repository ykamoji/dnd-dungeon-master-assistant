import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.db import get_campaigns_col

class CampaignMetadata(BaseModel):
    """Metadata for the current scene."""
    chapter: Optional[str] = Field(default=None, description="The current chapter of the adventure")
    section: Optional[str] = Field(default=None, description="The current section or location name")
    asset_urls: List[str] = Field(default_factory=list, description="URLs to any visual assets for the scene")
    gm_notes: Optional[str] = Field(default=None, description="Private GM notes for the current scene (key NPCs, threats, opportunities)")
    next_scene_suggestions: List[str] = Field(default_factory=list, description="Suggested next scenes or story directions")
    suggested_actions: List[str] = Field(default_factory=list, description="Suggested next actions offered to the player")

class DialogueLine(BaseModel):
    """A single line of NPC dialogue persisted with the turn snapshot."""
    speaker: str = Field(default="", description="Name of the NPC speaking")
    text: str = Field(default="", description="What the NPC says")
    emotion: str = Field(default="", description="Emotional tone of the line (e.g., 'wary')")

class CharacterState(BaseModel):
    """State of a single character in the party."""
    hp: int = Field(description="Current hit points")
    max_hp: int = Field(description="Maximum hit points")
    conditions: List[str] = Field(default_factory=list, description="List of current status conditions")

class PartyState(BaseModel):
    """The state of the entire party."""
    characters: Dict[str, CharacterState] = Field(
        description="Dictionary mapping character names to their current state"
    )

def get_campaign(campaign_id: str, include_history: bool = False) -> Optional[Dict]:
    """Fetch the campaign document from MongoDB.
    
    Args:
        campaign_id: The ID of the campaign.
        include_history: If True, returns the full 'state' array (all past turns). 
                         If False, returns only the most recent turn in the 'state' array.
                         
    Returns:
        A dictionary with the campaign data, or None if not found.
    """
    col = get_campaigns_col()
    campaign = col.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        return None
        
    if not include_history and "state" in campaign and campaign["state"]:
        # Only keep the latest state turn
        campaign["state"] = [campaign["state"][-1]]
        
    return campaign

def update_campaign(
    campaign_id: str,
    campaign_name: str = "tomb-of-annihilation",
    summary: Optional[str] = None,
    progress: Optional[float] = None,
    scene: Optional[str] = None,
    description: Optional[str] = None,
    metadata: Optional[CampaignMetadata] = None,
    initiative: Optional[List[str]] = None,
    party: Optional[PartyState] = None,
    npc_name: Optional[str] = None,
    narrative: Optional[str] = None,
    dialogue: Optional[List[DialogueLine]] = None,
) -> Dict:
    """Update campaign properties or append a new turn state to the campaign.

    Args:
        campaign_id: The ID of the campaign.
        campaign_name: The name of the adventure module.
        summary: Optional high-level summary of the campaign so far.
        progress: Optional completion percentage (0-100).
        scene: Title of the current scene. (Requires description, metadata, initiative, and party to append a turn)
        description: Natural language description of the current situation.
        metadata: CampaignMetadata object containing chapter, section, asset_urls,
                  gm_notes, next_scene_suggestions, and suggested_actions.
        initiative: Ordered list of characters in initiative order.
        party: PartyState object mapping character names to their hp, max_hp, and conditions.
        npc_name: Name of the NPC speaking this turn (for NPC_DIALOGUE turns).
        narrative: The turn's player-facing narrative text.
        dialogue: Ordered NPC dialogue lines (speaker, text, emotion) for this turn.

    Returns:
        The updated campaign document.
    """
    col = get_campaigns_col()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    update_ops = {
        "$set": {
            "updated_at": now
        },
        "$setOnInsert": {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
        }
    }
    
    if summary is not None:
        update_ops["$set"]["summary"] = summary
        update_ops["$set"]["summary_updated_at"] = now
        
    if progress is not None:
        update_ops["$set"]["progress"] = progress
        
    # A turn snapshot is persisted whenever any state field is supplied. Fields
    # not supplied this turn are carried forward from the latest stored snapshot,
    # so a partial update (e.g. only party HP) never blanks out the scene,
    # initiative, or other fields that simply didn't change.
    snapshot_fields = [scene, description, metadata, initiative, party, npc_name, narrative, dialogue]
    if any(x is not None for x in snapshot_fields):
        existing = col.find_one(
            {"campaign_id": campaign_id}, {"_id": 0, "state": {"$slice": -1}}
        )
        prior_state = (existing or {}).get("state") or []
        last = prior_state[-1] if prior_state else {}

        def _dump(value):
            return value.model_dump() if hasattr(value, "model_dump") else value

        new_snapshot = {
            "scene": scene if scene is not None else last.get("scene"),
            "description": description if description is not None else last.get("description"),
            "metadata": _dump(metadata) if metadata is not None else last.get("metadata"),
            "initiative": initiative if initiative is not None else last.get("initiative"),
            "party": _dump(party) if party is not None else last.get("party"),
            "npc_name": npc_name if npc_name is not None else last.get("npc_name"),
            "narrative": narrative if narrative is not None else last.get("narrative"),
            "dialogue": [_dump(d) for d in dialogue] if dialogue is not None else last.get("dialogue"),
            "created_dt": now
        }
        update_ops["$push"] = {"state": new_snapshot}
        
    col.update_one(
        {"campaign_id": campaign_id},
        update_ops,
        upsert=True
    )
    
    return get_campaign(campaign_id, include_history=False)
