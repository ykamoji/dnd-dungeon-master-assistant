from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import check_health
from app.tools import TOOL_FUNCTIONS

router = APIRouter()

class RollRequest(BaseModel):
    notation: str

class PathsRequest(BaseModel):
    paths: List[str]

class DescriptionRequest(BaseModel):
    description: str

class SummaryRequest(BaseModel):
    summary: str

class UpdateStateRequest(BaseModel):
    scene: str
    description: str
    metadata: dict
    initiative: List[str]
    party: dict
    progress: Optional[float] = None

class SaveCampaignStateRequest(BaseModel):
    scene: str
    description: str
    metadata: dict
    initiative: List[str]
    party: dict

@router.get("/health/db")
def health_db():
    result = check_health()
    if result["status"] == "ok":
        return result
    raise HTTPException(status_code=503, detail=result)

@router.get("/party/{campaign_id}")
def get_party(campaign_id: str):
    state = TOOL_FUNCTIONS["get_party_state"](campaign_id)
    if not state:
        raise HTTPException(status_code=404, detail="Campaign not found or empty state")
    return state

@router.post("/tools/update_state")
def api_update_state(campaign_id: str, req: UpdateStateRequest):
    return TOOL_FUNCTIONS["update_state"](
        campaign_id=campaign_id,
        scene=req.scene,
        description=req.description,
        metadata=req.metadata,
        initiative=req.initiative,
        party=req.party,
        progress=req.progress
    )

@router.post("/tools/roll_dice")
def api_roll_dice(req: RollRequest):
    try:
        return TOOL_FUNCTIONS["roll_dice"](notation=req.notation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tools/fetch_campaign_files")
def api_fetch_campaign_files(req: PathsRequest):
    return TOOL_FUNCTIONS["fetch_campaign_files"](req.paths)

@router.get("/tools/lookup_character/{name}")
def api_lookup_character(name: str):
    res = TOOL_FUNCTIONS["lookup_character"](name)
    if not res:
        raise HTTPException(status_code=404, detail="Character not found")
    return res

@router.get("/tools/lookup_monster/{name}")
def api_lookup_monster(name: str):
    res = TOOL_FUNCTIONS["lookup_monster"](name)
    if not res:
        raise HTTPException(status_code=404, detail="Monster not found")
    return res

@router.get("/tools/lookup_spell/{name}")
def api_lookup_spell(name: str):
    res = TOOL_FUNCTIONS["lookup_spell"](name)
    if not res:
        raise HTTPException(status_code=404, detail="Spell not found")
    return res

@router.get("/tools/lookup_class/{name}")
def api_lookup_class(name: str):
    res = TOOL_FUNCTIONS["lookup_class"](name)
    if not res:
        raise HTTPException(status_code=404, detail="Class not found")
    return res

@router.post("/tools/get_asset_url")
def api_get_asset_url(req: DescriptionRequest):
    res = TOOL_FUNCTIONS["get_asset_url"](req.description)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("/campaign/{campaign_id}/save")
def api_save_campaign_state(campaign_id: str, req: SaveCampaignStateRequest):
    return TOOL_FUNCTIONS["save_campaign_state"](
        campaign_id=campaign_id,
        scene=req.scene,
        description=req.description,
        metadata=req.metadata,
        initiative=req.initiative,
        party=req.party
    )

@router.get("/campaign/{campaign_id}/load")
def api_load_campaign_state(campaign_id: str):
    res = TOOL_FUNCTIONS["load_campaign_state"](campaign_id)
    if not res:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return res

@router.post("/campaign/{campaign_id}/summary")
def api_save_summary(campaign_id: str, req: SummaryRequest):
    return TOOL_FUNCTIONS["save_summary"](campaign_id, req.summary)

@router.get("/campaign/{campaign_id}/summary")
def api_get_summary(campaign_id: str):
    res = TOOL_FUNCTIONS["get_summary"](campaign_id)
    if not res:
        raise HTTPException(status_code=404, detail="Summary not found")
    return res
