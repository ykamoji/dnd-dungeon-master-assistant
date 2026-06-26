import datetime
from typing import Dict, List, Optional

from app.db import get_campaigns_col

def get_party_state(campaign_id: str) -> Optional[Dict]:
    """Fetch current party state (latest turn snapshot) from MongoDB.
    
    Reads the last element of the campaign's state array.
    """
    col = get_campaigns_col()
    campaign = col.find_one({"campaign_id": campaign_id})
    if not campaign:
        return None
        
    state_array = campaign.get("state", [])
    if not state_array:
        return None
        
    latest_state = state_array[-1]
    
    return {
        "campaign_id": campaign.get("campaign_id"),
        "campaign_name": campaign.get("campaign_name"),
        "scene": latest_state.get("scene"),
        "description": latest_state.get("description"),
        "metadata": latest_state.get("metadata"),
        "initiative": latest_state.get("initiative"),
        "party": latest_state.get("party"),
    }

def update_state(campaign_id: str, scene: str, description: str,
                 metadata: dict, initiative: List[str], party: dict,
                 progress: Optional[float] = None,
                 campaign_name: str = "tomb-of-annihilation") -> Dict:
    """Append a new state snapshot to the campaign's state array."""
    col = get_campaigns_col()
    
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    new_snapshot = {
        "scene": scene,
        "description": description,
        "metadata": metadata,
        "initiative": initiative,
        "party": party,
        "created_dt": now
    }
    
    update_ops = {
        "$set": {
            "updated_at": now
        },
        "$setOnInsert": {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
        },
        "$push": {
            "state": new_snapshot
        }
    }
    
    if progress is not None:
        update_ops["$set"]["progress"] = progress
        
    col.update_one(
        {"campaign_id": campaign_id},
        update_ops,
        upsert=True
    )
    
    return new_snapshot
