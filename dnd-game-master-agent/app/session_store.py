# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Durable MongoDB backing for the SQLite ADK session service.

Syncs the SQLite tables (`sessions` and `events`) directly to MongoDB
after every run, and restores them from MongoDB to SQLite on boot.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sqlite3

from google.adk.events.event import Event
from google.adk.sessions import BaseSessionService

from app.db import get_events_col, get_sessions_col

logger = logging.getLogger("dnd.session_store")

_APP_NAME = "app"
_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "app",
    ".adk",
    "session.db",
)

def _session_key(app_name: str, user_id: str, session_id: str) -> str:
    return f"{app_name}:{user_id}:{session_id}"


def _ensure_indexes() -> None:
    """Index events for the ordered-replay read path."""
    get_events_col().create_index(
        [("app_name", 1), ("user_id", 1), ("session_id", 1), ("timestamp", 1)],
        name="session_ts",
    )


# ---------------------------------------------------------------------------
# Persist (SQLite -> Mongo)
# ---------------------------------------------------------------------------

def _persist_sync(app_name: str, user_id: str, session_id: str) -> int:
    """Read session and events from SQLite and upsert into Mongo. Returns event count."""
    if not os.path.exists(_DB_PATH):
        return 0

    key = _session_key(app_name, user_id, session_id)
    
    with sqlite3.connect(_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        session_row = conn.execute(
            "SELECT * FROM sessions WHERE app_name=? AND user_id=? AND id=?",
            (app_name, user_id, session_id)
        ).fetchone()
        
        if not session_row:
            return 0
            
        session_doc = dict(session_row)
        session_doc["_id"] = key
        get_sessions_col().replace_one({"_id": key}, session_doc, upsert=True)

        event_rows = conn.execute(
            "SELECT * FROM events WHERE app_name=? AND user_id=? AND session_id=?",
            (app_name, user_id, session_id)
        ).fetchall()

        if event_rows:
            from pymongo import ReplaceOne
            ops = []
            for row in event_rows:
                ev_doc = dict(row)
                ev_id = f"{key}:{ev_doc['id']}"
                ev_doc["_id"] = ev_id
                ops.append(ReplaceOne({"_id": ev_id}, ev_doc, upsert=True))
            get_events_col().bulk_write(ops, ordered=False)
            
        return len(event_rows)


async def persist_session(
    svc: BaseSessionService, app_name: str, user_id: str, session_id: str
) -> None:
    """Persist a session's SQLite state + events to Mongo."""
    try:
        n = await asyncio.to_thread(_persist_sync, app_name, user_id, session_id)
        logger.debug("Persisted session %s (%d events) to Mongo", session_id, n)
    except Exception:
        # Persistence must never break a live turn — log and move on.
        logger.exception("Failed to persist session %s to Mongo", session_id)


# ---------------------------------------------------------------------------
# Restore (Mongo -> SQLite)
# ---------------------------------------------------------------------------

def _load_all_sync() -> int:
    """Read every session and event from Mongo and write directly to SQLite."""
    _ensure_indexes()
    
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    
    with sqlite3.connect(_DB_PATH) as conn:
        # Create tables if they don't exist yet so we can insert.
        # This matches the schema created by ADK's SQLiteSessionService.
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                app_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                id TEXT NOT NULL,
                state TEXT NOT NULL,
                create_time REAL NOT NULL,
                update_time REAL NOT NULL,
                PRIMARY KEY (app_name, user_id, id)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id TEXT NOT NULL,
                app_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                invocation_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                event_data TEXT NOT NULL,
                PRIMARY KEY (app_name, user_id, session_id, id),
                FOREIGN KEY (app_name, user_id, session_id) REFERENCES sessions(app_name, user_id, id) ON DELETE CASCADE
            )
        ''')
        
        restored = 0
        for sdoc in get_sessions_col().find({}):
            sdoc.pop("_id", None)
            cols = ", ".join(sdoc.keys())
            placeholders = ", ".join(["?"] * len(sdoc))
            conn.execute(f"INSERT OR REPLACE INTO sessions ({cols}) VALUES ({placeholders})", tuple(sdoc.values()))
            restored += 1
            
        for evdoc in get_events_col().find({}):
            evdoc.pop("_id", None)
            cols = ", ".join(evdoc.keys())
            placeholders = ", ".join(["?"] * len(evdoc))
            conn.execute(f"INSERT OR REPLACE INTO events ({cols}) VALUES ({placeholders})", tuple(evdoc.values()))
            
        conn.commit()
    return restored


async def restore_all(svc: BaseSessionService) -> None:
    """Rehydrate SQLite from Mongo on boot."""
    try:
        restored = await asyncio.to_thread(_load_all_sync)
        logger.info("Restored %d session(s) from Mongo to SQLite", restored)
    except Exception:
        logger.exception("Failed to restore sessions from Mongo to SQLite")


# ---------------------------------------------------------------------------
# Flush (shutdown belt-and-suspenders)
# ---------------------------------------------------------------------------

async def flush_all(svc: BaseSessionService) -> None:
    """Persist every SQLite session to Mongo on shutdown (best-effort)."""
    try:
        resp = await svc.list_sessions(app_name=_APP_NAME, user_id=None)
    except Exception:
        logger.exception("Flush: could not list sessions")
        return
    for meta in resp.sessions:
        await persist_session(svc, meta.app_name, meta.user_id, meta.id)
    logger.info("Flushed %d session(s) to Mongo on shutdown", len(resp.sessions))


# ---------------------------------------------------------------------------
# Plugin — fires after every invocation on every serving surface
# ---------------------------------------------------------------------------

from google.adk.plugins.base_plugin import BasePlugin  # noqa: E402


class MongoSessionPersistPlugin(BasePlugin):
    """Persist the session after each run."""

    def __init__(self) -> None:
        super().__init__(name="mongo_session_persist")

    async def after_run_callback(self, *, invocation_context) -> None:
        session = getattr(invocation_context, "session", None)
        svc = getattr(invocation_context, "session_service", None)
        if session is None or svc is None:
            return
        await persist_session(svc, session.app_name, session.user_id, session.id)
