import datetime
from typing import Dict, Optional

from app.db import get_campaigns_col

def load_campaign_state(campaign_id: str) -> Optional[Dict]:
    """Load full campaign document (all turn history, summary, progress)."""
    col = get_campaigns_col()
    return col.find_one({"campaign_id": campaign_id}, {"_id": 0})

def save_campaign_state(campaign_id: str, scene: str, description: str,
                        metadata: dict, initiative: list[str], party: dict,
                        campaign_name: str = "tomb-of-annihilation") -> Dict:
    """Append a new turn snapshot to the campaign's state array.
    
    Similar to update_state but without progress arg. Exists for symmetry.
    """
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
    
    col.update_one(
        {"campaign_id": campaign_id},
        {
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
        },
        upsert=True
    )
    
    return new_snapshot

def save_summary(campaign_id: str, summary: str) -> Dict:
    """Update the campaign's summary field."""
    col = get_campaigns_col()
    
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    col.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "summary": summary,
                "summary_updated_at": now,
                "updated_at": now
            },
            "$setOnInsert": {
                "campaign_id": campaign_id,
                "campaign_name": "tomb-of-annihilation",
            }
        },
        upsert=True
    )
    
    return {"status": "ok"}

def get_summary(campaign_id: str) -> Optional[Dict]:
    """Get the campaign's summary."""
    col = get_campaigns_col()
    campaign = col.find_one({"campaign_id": campaign_id}, {"summary": 1, "summary_updated_at": 1, "_id": 0})
    if campaign and "summary" in campaign:
        return campaign
    return None
