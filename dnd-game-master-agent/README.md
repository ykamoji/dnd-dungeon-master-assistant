# D&D Dungeon Master Agent (Backend)

The multi-agent Dungeon Master backend. A **Google ADK 2.0 graph workflow** — guardrail → intent classifier → self-correcting specialist agents → human-approval gate — served over **FastAPI**, with durable campaign state in **MongoDB**. Ships the full *Tomb of Annihilation* module text and Open5e reference data inside the service.

> High-level architecture, problem, and agent design: see the [repo root README](../README.md).

## Tech stack

| Layer | Technology |
|---|---|
| Language | Python 3.11–3.13 (Docker image: `python:3.12-slim`) |
| Agent framework | `google-adk[gcp]` 2.0 (graph `Workflow`, `LoopAgent`, resumable runs) |
| API server | FastAPI + Uvicorn (via ADK's `get_fast_api_app`) |
| LLM | Gemini (`GOOGLE_MODEL` / `SMART_MODEL`); optional local **Ollama** via LiteLLM |
| Campaign state | MongoDB (`pymongo`) |
| Session store | ADK sessions — local SQLite (`app/.adk/session.db`) or in-memory backed by a MongoDB persistence plugin on Cloud Run |
| Package manager | [`uv`](https://docs.astral.sh/uv/) (locked via `uv.lock`) |
| Scaffolding | [Google Agents CLI](https://pypi.org/project/google-agents-cli/) (`agents-cli-manifest.yaml`) |
| Quality | `ruff`, `ty`, `codespell`, `pytest` + `pytest-asyncio` |
| Telemetry | OpenTelemetry → Cloud Trace / Cloud Logging / BigQuery (auto-enabled when deployed) |
| Deploy | Docker → Cloud Run (`deploy.sh`, source build via Cloud Build) |

## Project structure

```
dnd-game-master-agent/
├── app/
│   ├── agent.py            # THE workflow graph: prepare → guardrail/setup/classify → specialists → HITL gate
│   ├── fast_api_app.py     # FastAPI entrypoint (ADK get_fast_api_app + routers)
│   ├── custom.py           # REST router: /campaigns, /campaign/*, /tools/*, /health/db
│   ├── ambient.py          # Pub/Sub push handler + SSE event stream
│   ├── db.py               # MongoDB client
│   ├── agents/             # Agent definitions (supervisor, action, npc, campaign, setup, story, judge)
│   ├── tools/              # Function tools (campaign CRUD, file fetch, assets, lookups)
│   └── .env                # ← your local config (never committed)
├── data/open5e/            # Open5e reference JSON (spells, monsters, classes, …)
├── docs/                   # Tomb of Annihilation module text (markdown)
├── assets/                 # Image asset index (desc → URL, no binaries)
├── scripts/                # dump_session_trace.py, rewind_session.py
├── tests/                  # unit / integration / eval
├── Makefile                # install, local, playground, test, … (`make help`)
├── Dockerfile              # self-contained image (code + docs + assets + data)
├── local.docker.sh         # build & run the container locally
├── deploy.sh               # Cloud Run deploy (Cloud Build source deploy)
└── cloudrun.env.yaml       # Cloud Run env vars (gitignored — create it, see below)
```

## Prerequisites

- **Python 3.11–3.13** and [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- **Agents CLI**: `uv tool install google-agents-cli`
- **MongoDB** — a local instance or a free [Atlas](https://www.mongodb.com/atlas) cluster (you need a `MONGO_URI`)
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/) — or a local Ollama model (see `USE_LOCAL_LLM`)
- Docker (container runs only) and the [gcloud SDK](https://cloud.google.com/sdk) (deploys only)

## Configuration

Create **`app/.env`** (loaded by the app and sourced by the Makefile test targets). For Docker runs, `local.docker.sh` reads a copy at the **agent root** (`.env`) — keep the two in sync.

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key |
| `GOOGLE_MODEL` | Default Gemini model for most agents (e.g. a Flash-class model) |
| `SMART_MODEL` | Higher-reasoning model for the combat arbiter and the QA judge |
| `MONGO_URI` | MongoDB connection string (campaign state) |
| `DB_NAME` | MongoDB database name |
| `CAMPAIGN_COLLECTION` | Collection for campaigns |
| `SESSION_COLLECTION` / `EVENT_COLLECTION` | Collections for the session-persistence plugin (Cloud Run) — default `sessions` / `events` |
| `SESSION_DB_LOCAL` | `1` → use the local SQLite ADK session store (`app/.adk/session.db`) |
| `SESSION_SERVICE_URI` | Explicit ADK session-service URI (overrides the above; optional) |
| `USE_LOCAL_LLM` | `1` → route all agents through local Ollama via LiteLLM (no Google quota) |
| `LOCAL_LLM_MODEL` | Ollama model id (default `ollama_chat/gemma4:e2b-mxfp8`) |
| `OLLAMA_API_BASE` | Ollama endpoint (default `http://localhost:11434`) |
| `LOG_LEVEL` | Logging level (Cloud Run) |
| `ALLOW_ORIGINS` | Comma-separated CORS origins (not needed locally — the client proxies) |

🚨 **Never commit secrets.** `app/.env`, root `.env`, and `cloudrun.env.yaml` are gitignored; everything is supplied via environment variables.

## Run locally

```bash
make install        # install dependencies (uv sync via agents-cli)
make local          # FastAPI server on http://localhost:8000
```

Session-store selection: prod `SESSION_SERVICE_URI` → else local SQLite when `SESSION_DB_LOCAL=1` → else in-memory (backed by the MongoDB persistence plugin).

Other useful targets:

```bash
make playground             # ADK web playground (interactive agent UI)
make run PROMPT="..."       # run a single prompt through the workflow
make help                   # list all targets
```

Sanity checks: `curl http://localhost:8000/health/db` (MongoDB ping) and `http://localhost:8000/docs` (OpenAPI).

## Run with Docker

```bash
./local.docker.sh
```

This builds the self-contained image (`dnd-gm-agent:local` — code, `docs/`, `assets/`, and Open5e data all baked in), then runs it detached with your root `.env`, mapping **host 8000 → container 8080**. Verify with `curl http://localhost:8000/health/db`; logs via `docker logs -f dnd-gm-agent`.

## Deploy to Cloud Run

One script, re-runnable — each run builds from source via Cloud Build, deploys a new revision, and prunes old images from Artifact Registry:

```bash
# 1. Edit PROJECT / REGION / SERVICE at the top of deploy.sh
# 2. Create cloudrun.env.yaml (gitignored) with the production env vars
#    (GOOGLE_API_KEY, GOOGLE_MODEL, SMART_MODEL, MONGO_URI, DB_NAME,
#     CAMPAIGN_COLLECTION, SESSION_COLLECTION, EVENT_COLLECTION, LOG_LEVEL, …)
./deploy.sh --dry-run    # print the gcloud commands without running them
./deploy.sh              # enable APIs, set IAM, build, deploy, prune
```

Deployment shape (deliberately minimal-cost for a demo): `min-instances 0` (scale to zero), `max-instances 1` (single writer for the SQLite⇄Mongo session sync), `concurrency 80` (a console page load fires parallel fetches plus a long-lived SSE stream). The script prints the service URL and a health-check command when done. Deploy this service **before** the client — the client needs this URL at build time.

## Testing & linting

| Command | What it runs |
|---|---|
| `make test` | Unit tests (`tests/unit`) — log tee'd to `logs/make-test.log` |
| `make integration` | Full graph-workflow integration test (`tests/integration/test_agent.py`) |
| `make gaurdrail-test` | Guardrail/safety tests only |
| `make eval-supervisor` | Intent-classifier eval (`tests/eval`) |
| `make smoke-test` | Tools + custom routes, no agent involved (`smoke_test.py`) |
| `make story-test` | Story agent retrieval check |
| `make lint` / `make lint-fix` | `ruff` + `ty` + `codespell` via agents-cli |

## Debugging agent behavior

MongoDB only stores the *final* campaign state. To see what an agent actually did on a turn — model thoughts, tool calls, retries, state deltas — dump the ADK event stream:

```bash
uv run python scripts/dump_session_trace.py <session_id>
```

(Also available as the `session-trace-analysis` skill in `.claude/skills/`. `scripts/rewind_session.py` rolls a campaign back one turn.)

## API surface

ADK built-ins: `/run`, `/run_sse` (streamed event trace), session CRUD under `/apps/*`, web playground at `/` in playground mode.

Custom routes:

| Route | Purpose |
|---|---|
| `POST /` | Ambient Pub/Sub push handler — the client submits turns here (proxied as `/ambient`) |
| `GET /ambient/sessions/{id}/stream` | SSE live event stream consumed by the game console |
| `GET /campaigns`, `GET/POST/DELETE /campaign/{id}…` | Campaign state read/update/delete (MongoDB) |
| `GET /tools/classes`, `/tools/lookup_character/{name}`, `/tools/lookup_character_resource/{type}/{name}` | Class, NPC stat-block, and Open5e lookups |
| `POST /tools/fetch_campaign_files`, `POST /tools/get_asset_url` | Module text fetch (traversal-guarded) and art URL resolution |
| `GET /api/live-token` | Mints an ephemeral Gemini Live token for the browser's voice (STT) connection |
| `GET /health/db` | MongoDB connectivity check |
| `DELETE /session/{id}` | Rewind/delete a session |
| `POST /feedback` | Structured feedback logging |

## Observability

GCP telemetry is disabled by default locally (no credentials needed). When deployed, built-in telemetry exports traces, logs, and metrics to Cloud Trace, Cloud Logging, and BigQuery. Lightweight callbacks additionally record which agents and tools fired on every turn.
