import os
from typing import Dict, Optional

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

_client: Optional[MongoClient] = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        mongo_uri = os.environ.get("MONGO_URI")
        if not mongo_uri:
            raise ValueError("MONGO_URI environment variable must be set")
        _client = MongoClient(mongo_uri)
    return _client

def get_db() -> Database:
    client = get_client()
    db_name = os.environ.get("DB_NAME", "DnD")
    return client[db_name]

def get_campaigns_col() -> Collection:
    db = get_db()
    col_name = os.environ.get("CAMPAIGN_COLLECTION", "campaigns")
    return db[col_name]

def get_sessions_col() -> Collection:
    """Durable backing store for ADK sessions (metadata + state, sans events).

    Used only when the in-memory session service is active (Cloud Run/docker);
    see app/session_store.py.
    """
    db = get_db()
    col_name = os.environ.get("SESSION_COLLECTION", "sessions")
    return db[col_name]

def get_events_col() -> Collection:
    """Durable backing store for ADK events (one document per event)."""
    db = get_db()
    col_name = os.environ.get("EVENT_COLLECTION", "events")
    return db[col_name]

def check_health() -> Dict[str, str]:
    try:
        client = get_client()
        client.admin.command("ping")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
