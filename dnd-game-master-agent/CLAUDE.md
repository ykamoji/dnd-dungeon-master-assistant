# D&D Game Master — Agent (FastAPI + Google ADK)

Multi-agent Dungeon Master built on **Google ADK 2.0** and served via FastAPI.
Campaign state lives in **MongoDB**; ADK session state lives in local SQLite.

## Run / test
- Dev server: `make dev` (or `uvicorn app.fast_api_app:app --port 8000`). Serves
  on **:8000**; ADK web playground at `/` (web=True).
- Tests: `make test` → `pytest tests/unit`. Integration: `pytest tests/integration`.
  - `tests/integration/test_agent.py` drives the full workflow (blocked, CAMPAIGN,
    ACTION, NPC, setup-failure). HITL resume = send a `functionResponse` with
    `name="adk_request_input"`.
- Uses `uv`. Env from `app/.env` and `.env` (`python-dotenv`).
- Required env: `MONGO_URI` (+ optional `DB_NAME`=DnD, `CAMPAIGN_COLLECTION`=campaigns),
  `ALLOW_ORIGINS`, `LOGS_BUCKET_NAME`, `SESSION_SERVICE_URI`, `LOG_LEVEL`.
  Local model option: `USE_LOCAL_LLM`, `OLLAMA_API_BASE` (see `app/agents/config.py`).

## The workflow (`app/agent.py`)
A directed `Workflow` graph (NOT a SequentialAgent). `app = App(name="app", …,
ResumabilityConfig(is_resumable=True))` — `name` MUST stay "app".

```
START → prepare ─┬ blocked → refuse (END)
                 ├ setup   → setup_agent → setup_finalize (END)   # first turn: build campaign+party
                 └ safe    → classifier → route_intent ─┬ ACTION       → action_agent ┐
                                                        ├ NPC_DIALOGUE → npc_agent    ├→ hitl_gate → output_agent (END)
                                                        └ CAMPAIGN     → campaign_agent┘
```
- `prepare` is the entry node. It runs the regex guardrail (`evaluate_input_safety`
  in `app/agents/callbacks.py`), derives `campaign_id`, loads campaign state, and
  routes. It decodes Pub/Sub payloads via `_extract_player_action` (plain text
  passes through unchanged — backward compatible).
- `needs_setup` (no campaign / empty `state`) → routes to `setup`; `setup_finalize`
  rejects without persisting unless the `SetupResult.ready`.
- `hitl_gate` (node, `rerun_on_resume=True`) pauses with `RequestInput`. Uses a
  **fixed `interrupt_id = "hitl_approval"`** so the UI can resume via `/run`.
  `_APPROVE_WORDS` decide approval; reads `ctx.resume_inputs["hitl_approval"]`.
- Per-turn state keys: `intent`, `is_safe`, `last_player_action`, `campaign_id`,
  `campaign_state`, `{action,npc,campaign,setup}_result`, `last_agent`,
  `tools_fired`, `player_rejected`, `gm_response`. `_RESULT_KEY` maps intent→key.

Specialist agents live in `app/agents/` (`action_agent`, `npc_dialogue_agent`,
`campaign_agent`, `setup_agent`, `supervisor_agent` [classifier], `output_agent`,
`story_agent`, evaluators). Executors are `*_executor`; LoopAgents pair an
executor with an evaluator. Their instruction templates inject `{campaign_state}`,
`{last_player_action}`, `{campaign_id}`, `{eval_feedback}` — unit tests that run a
specialist in isolation MUST seed `campaign_state` or ADK raises KeyError.

## HTTP API
- `app/fast_api_app.py` — builds the ADK app (`get_fast_api_app`, web UI, `/run`,
  session CRUD), sets `session_service_uri = os.getenv("SESSION_SERVICE_URI")`,
  `logging.basicConfig`, includes the custom + ambient routers, `/feedback`.
- `app/custom.py` (router) — REST the client uses:
  - `GET /tools/classes` — pruned class **DNA profiles** from
    `data.loader.load_resource("classes")` (+ archetypes).
  - `GET /campaigns` — saved-campaign summaries from MongoDB (resume list).
  - `GET /campaign/{id}`, `GET /state/{id}`, `POST /campaign/{id}/update`.
  - `POST /tools/fetch_campaign_files` — adventure **markdown docs** (NOT campaigns).
  - `GET /tools/lookup_character/{name}`, `GET /tools/lookup_character_resource/{type}/{name}`,
    `POST /tools/get_asset_url`, `GET /health/db`, `DELETE /session/{id}` (rewind).
- `app/ambient.py` (router) — the event-driven entry the **web client** drives:
  - `POST /` Pub/Sub push handler: `session_id = short_subscription_name(subscription)`
    (the client sets `subscription` = campaign_id, so **session_id == campaign_id**),
    `_ensure_session` creates it if new, then feeds the message into the workflow via
    a module-level `Runner`. The runner's `app_name` **MUST** be `gm_app.name`
    (`"app"`) — the same name `_ensure_session` and the built-in endpoints use, or
    `run_async` raises `SessionNotFoundError`. `_extract_player_action` accepts the
    payload `data` as base64 **or a raw JSON object**; the first turn carries
    `{game, party}`, later turns `{action}`.
  - `GET /ambient/sessions/{session_id}/stream` — **SSE** trace endpoint the client
    consumes (instead of polling). Reads the latest invocation's events from
    `session.db` and yields `SessionEvent` frames (`data: {json}\n\n`, snake_case:
    `content.parts[].{text,thought,function_call,function_response}`,
    `actions.state_delta`). The generator loops forever; the **client** closes the
    stream (e.g. on the `adk_request_input` approval event).
  - HITL approve/reject: client `POST /run` with a `functionResponse`
    (`name="adk_request_input"`, `response={result: "approve"|"reject"}`); the gate
    reads `response` **or** `result` and checks `_APPROVE_WORDS`.
  - Shares the session store with the server via `create_session_service_from_options`
    (local `app/.adk/session.db` by default). Keep `SESSION_SERVICE_URI` (prod) or
    `SESSION_DB_LOCAL` consistent so ambient writes and the client reads hit one DB.

## Sessions vs campaigns (important)
- **Campaigns** = durable game state in **MongoDB** (`app/db.py` →
  `get_campaigns_col()`; CRUD in `app/tools/campaign.py`:
  `get_campaign`, `update_campaign`). Doc: `campaign_id, campaign_name, summary,
  progress, state[]` (turn snapshots).
- **ADK sessions** = per-run event/decision trace. The session service is the
  process-wide `shared://session` singleton in `app/app_utils/services.py`
  (server, ambient Runner, and persistence hooks all share ONE instance). It
  resolves to: prod `SESSION_SERVICE_URI` / Agent Engine → local SQLite at
  `app/.adk/session.db` when `SESSION_DB_LOCAL=1` (same DB the rewind endpoint +
  `dump_session_trace.py` read) → else **in-memory** (Cloud Run default).
- **In-memory is now durable via MongoDB** (`app/session_store.py`): when the
  service is in-memory, every turn is persisted to Mongo collections `sessions`
  (metadata+state, one doc/session) and `events` (one doc/event) by
  `MongoSessionPersistPlugin` (`after_run_callback`, fires on ambient AND `/run`
  HITL resume), sessions are rehydrated on boot via the FastAPI `lifespan`
  (`restore_all`, replays events on empty state — skips `partial`), and flushed
  on shutdown. All a **no-op** when the service is durable (SQLite/prod), so
  local dev is unchanged. Collections overridable via
  `SESSION_COLLECTION`/`EVENT_COLLECTION`.

## Data & schemas
- `app/agents/schemas.py` — `CampaignResult`, `ActionResult`, `NpcResult`,
  `SetupResult`, and nested `CharacterUpdate` (name, role, class, hp/max_hp,
  conditions, armors, spells, weapons, magicitems), `CombatEntry`, `DialogueLine`.
- **`data/open5e/classes.json`** (note: `data/` package, NOT `app/data/`) — 12
  classes; each has `name, slug, desc, hit_dice, hp_at_1st_level, prof_*,
  spellcasting_ability, subtypes_name, archetypes[{name,slug,desc}]`. Loaded via
  `data/loader.py` (`load_resource`, `lookup_by_name`, cached).
- Adventure text in `docs/Tomb-of-Annihilation/`; asset URL index in
  `assets/Tomb-of-Annihilation/ASSETS.md` (5etools mirror).

## Debugging runtime behavior
Use the `session-trace-analysis` skill / `scripts/dump_session_trace.py` to read
the ADK `session.db` event stream (model thoughts, tool calls, state deltas)
BEFORE guessing from code or reading MongoDB — Mongo only has final state.

## Conventions
- No MCP — expose tools/data via FastAPI (`get_fast_api_app`).
- Strict JSON / structured outputs via pydantic schemas; prompts enforce tool use.
- Standard Python `logging` for console logs.
