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
"""Ambient (event-driven) entry point for the D&D Dungeon Master agent.

Instead of a human typing into a chat box, the agent is driven by Pub/Sub
events. A push subscription POSTs each message to ``/``; we normalize the
subscription path to a readable session id, ensure an ADK session exists, and
feed the raw message into the graph workflow. The workflow's entry node
(:func:`app.agent._extract_player_action`) decodes the base64 payload, so the
HTTP layer stays dumb and the workflow is drivable from any source.

Human-in-the-loop: when a turn pauses at the ``hitl_gate`` the run simply ends
(the session is persisted in a paused state). The UI resumes it through ADK's
built-in ``/run`` endpoint by POSTing a ``functionResponse`` for the
``adk_request_input`` call with id ``"hitl_approval"`` — no custom resume
endpoint is needed.

Pub/Sub push envelope (see https://cloud.google.com/pubsub/docs/push):

    {
      "message": {
        "data": "<base64 payload>",
        "attributes": {"campaign_id": "...", "user_id": "..."},
        "messageId": "..."
      },
      "subscription": "projects/<proj>/subscriptions/<name>"
    }
"""

import json
import logging
import os

from fastapi import APIRouter, Request, Response
from google.adk.runners import Runner
from google.genai import types

from app.agent import app as gm_app
from app.app_utils.services import get_session_service

logger = logging.getLogger("dnd.ambient")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Use the process-wide shared:// singleton so the Pub/Sub handler, the built-in
# /run resume endpoint (get_fast_api_app), and the persistence hooks all touch
# ONE session service: prod SESSION_SERVICE_URI / Agent Engine, else local SQLite
# (SESSION_DB_LOCAL=1), else in-memory (Cloud Run, backed by Mongo via
# app/session_store.py).
_session_service = get_session_service()

# app_name MUST be the ADK app name ("app") — the same name _ensure_session
# creates sessions under and the built-in session/run endpoints + the client use.
_runner = Runner(app=gm_app, session_service=_session_service, app_name=gm_app.name)

router = APIRouter()


def short_subscription_name(subscription: str) -> str:
    """Reduce a fully-qualified subscription path to its short name.

    Pub/Sub delivers ``projects/<proj>/subscriptions/<name>``; using that verbatim
    as a session id makes session records unreadable. We keep only ``<name>``.
    """
    if not subscription:
        return "default_session"
    return subscription.rsplit("/", 1)[-1]


async def _ensure_session(user_id: str, session_id: str) -> None:
    """Create the ADK session on first contact; reuse it on subsequent events."""
    session = await _session_service.get_session(
        app_name=gm_app.name, user_id=user_id, session_id=session_id
    )
    if session is None:
        await _session_service.create_session(
            app_name=gm_app.name,
            user_id=user_id,
            session_id=session_id,
        )


@router.post("/")
async def pubsub_handler(request: Request):
    """Accept Pub/Sub trigger messages and feed each into the workflow."""
    envelope = await request.json()

    if not envelope or "message" not in envelope:
        logger.error("Invalid Pub/Sub payload received.")
        # 200 acks the malformed message so Pub/Sub stops redelivering it.
        return {"error": "Bad Request: invalid Pub/Sub message format"}

    message = envelope["message"]
    attributes = message.get("attributes") or {}

    # Normalize the fully-qualified subscription path to a readable session id.
    session_id = short_subscription_name(envelope.get("subscription", ""))
    user_id = attributes.get("user_id", "user")

    logger.info(
        "Processing Pub/Sub message %s for session %s",
        message.get("messageId"), session_id,
    )

    # Pass the raw message dict into the workflow; the entry node decodes the
    # {"data": <base64>} payload.
    content_message = types.Content(
        role="user", parts=[types.Part.from_text(text=json.dumps(message))]
    )

    try:
        await _ensure_session(user_id, session_id)
        async for event in _runner.run_async(
            user_id=user_id, session_id=session_id, new_message=content_message
        ):
            logger.info("Event: %s", event)
    except Exception:
        # Transient failure — non-2xx nacks so Pub/Sub retries the delivery.
        logger.exception("Failed to process message %s", message.get("messageId"))
        return Response(status_code=500)

    return {"status": "success"}

