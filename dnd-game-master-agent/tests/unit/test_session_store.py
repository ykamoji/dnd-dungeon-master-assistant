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

"""Unit tests for app/session_store.py — Mongo-backed ephemeral ADK sessions.

Mongo is faked in-memory (no mongomock dependency); we only exercise the small
surface session_store uses: replace_one, bulk_write(ReplaceOne), find().sort().
"""

import asyncio

import pytest
from google.adk.events.event import Event
from google.adk.events.event_actions import EventActions
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app import session_store


class _Cursor:
    def __init__(self, items):
        self._items = list(items)

    def sort(self, key, direction=1):
        self._items.sort(key=lambda d: d.get(key), reverse=direction < 0)
        return self

    def __iter__(self):
        return iter(self._items)


class _FakeCollection:
    """Minimal dict-backed stand-in for a pymongo Collection."""

    def __init__(self):
        self.docs = {}

    def create_index(self, *a, **k):
        return "idx"

    def replace_one(self, filt, doc, upsert=False):
        self.docs[filt["_id"]] = doc

    def bulk_write(self, ops, ordered=True):
        for op in ops:  # ReplaceOne exposes _filter/_doc
            self.docs[op._filter["_id"]] = op._doc

    def find(self, query=None):
        query = query or {}
        return _Cursor(
            d for d in self.docs.values() if all(d.get(k) == v for k, v in query.items())
        )


@pytest.fixture
def fake_mongo(monkeypatch):
    sessions, events = _FakeCollection(), _FakeCollection()
    monkeypatch.setattr(session_store, "get_sessions_col", lambda: sessions)
    monkeypatch.setattr(session_store, "get_events_col", lambda: events)
    return sessions, events


def _text_event(author, text, state_delta=None, partial=False):
    return Event(
        author=author,
        content=types.Content(role=author, parts=[types.Part.from_text(text=text)]),
        actions=EventActions(state_delta=state_delta or {}),
        partial=partial,
    )


def test_persist_then_restore_round_trips(fake_mongo):
    sessions_col, events_col = fake_mongo

    async def scenario():
        svc = InMemorySessionService()
        session = await svc.create_session(app_name="app", user_id="u", session_id="s1")
        # Two committed events; the second carries a state delta.
        await svc.append_event(session, _text_event("user", "I open the door"))
        await svc.append_event(
            session, _text_event("model", "It creaks open", state_delta={"hp": 12})
        )
        await session_store.persist_session(svc, "app", "u", "s1")

        # Restore into a brand-new (empty) service.
        fresh = InMemorySessionService()
        await session_store.restore_all(fresh)
        return await fresh.get_session(app_name="app", user_id="u", session_id="s1")

    restored = asyncio.run(scenario())

    assert len(sessions_col.docs) == 1
    assert len(events_col.docs) == 2
    assert restored is not None
    assert restored.state.get("hp") == 12  # rebuilt purely from event replay
    assert len(restored.events) == 2


def test_restore_skips_partial_events(fake_mongo):
    sessions_col, events_col = fake_mongo

    async def scenario():
        svc = InMemorySessionService()
        await svc.create_session(app_name="app", user_id="u", session_id="s1")
        await session_store.persist_session(svc, "app", "u", "s1")

        # Inject a streaming/partial event straight into the fake events store.
        partial = _text_event("model", "chunk...", partial=True)
        events_col.docs["app:u:s1:p1"] = {
            "_id": "app:u:s1:p1",
            "app_name": "app",
            "user_id": "u",
            "session_id": "s1",
            "timestamp": partial.timestamp,
            "event": partial.model_dump(mode="json"),
        }

        fresh = InMemorySessionService()
        await session_store.restore_all(fresh)
        return await fresh.get_session(app_name="app", user_id="u", session_id="s1")

    restored = asyncio.run(scenario())
    assert restored is not None
    assert len(restored.events) == 0  # the partial event was skipped


def test_noop_when_not_ephemeral(fake_mongo):
    """A durable (non-in-memory) service must not be mirrored to Mongo."""
    sessions_col, events_col = fake_mongo

    # A plain object that is NOT an InMemorySessionService — persistence is gated
    # to the ephemeral case, so nothing should touch it or Mongo.
    class _Fake:
        async def get_session(self, **k):
            raise AssertionError("should not be called for a durable service")

    async def scenario():
        await session_store.persist_session(_Fake(), "app", "u", "s1")
        await session_store.restore_all(_Fake())

    asyncio.run(scenario())
    assert len(sessions_col.docs) == 0
    assert len(events_col.docs) == 0
