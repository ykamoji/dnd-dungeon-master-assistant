# D&D Game Master Assistant — Monorepo

An AI-powered Dungeon Master. A **Google ADK** multi-agent backend runs the game
(narration, NPCs, rules/dice, campaign state), and a **Next.js** web client gives
it a themed landing page + an Apple-style, scroll-locked game flow.

This file is the map of the whole repo so a session doesn't need to re-explore.
Each sub-project has its own deeper `CLAUDE.md` — read those before editing inside.

## Two apps
| Path | What | Stack | Port |
|------|------|-------|------|
| `dnd-game-master-agent/` | Backend: multi-agent DM + FastAPI | Python, Google ADK 2.0, FastAPI, MongoDB | 8000 |
| `dnd-game-master-client/` | Frontend: landing + game UI | Next.js 16, React 19, TS, Tailwind v4 | 3000 |

The client calls the backend through Next.js `rewrites()` (relative `ROOT_API=""`,
no CORS). Start the backend on :8000, then the client on :3000.

---

## Root layout
```
dnd-game-master-assistant/
├── CLAUDE.md                 ← this file (repo map)
├── .claude/CLAUDE.md         project instructions + available skills (checked in)
├── README.md, LICENSE
├── DnD-GM-Assistant-Capstone-Plan.pdf   capstone plan
├── Kaggle_Competition_Rules.md
├── assets/                   image asset INDEX (no binaries)
│   └── Tomb-of-Annihilation/ASSETS.md   desc→URL table (5etools mirror)
├── docs/                     adventure source text (Tomb of Annihilation)
│   ├── KNOWLEDGE.md          index of campaign files
│   └── Tomb-of-Annihilation/ Chapters/, Preface/, Appendix D.csv (NPC stat blocks),
│                             Appendex-B-Random-Encounters/
├── dnd-game-master-agent/    backend (see below)
└── dnd-game-master-client/   frontend (see below)
```
`assets/` and `docs/` are content, not code: the backend reads adventure markdown
from `docs/` (`fetch_campaign_files`) and resolves image URLs from
`assets/.../ASSETS.md` (`get_asset_url`). No image binaries are stored in-repo;
art is proxied from the 5etools GitHub mirror.

---

## Backend — `dnd-game-master-agent/`
ADK app name is **"app"** (must match the `app/` dir). Served by
`get_fast_api_app` (web playground at `/`, built-in `/run`, session CRUD) plus
custom + ambient routers.

```
dnd-game-master-agent/
├── CLAUDE.md                 ← detailed backend guide (READ before editing)
├── AGENTS.md, README.md
├── Makefile                  targets: install lint lint-fix playground local run
│                             test integration smoke-test  (run `make help`)
├── Dockerfile, pyproject.toml, uv.lock   (uses `uv`)
├── agents-cli-manifest.yaml, .google-agents-cli/   ADK CLI scaffolding/deploy
├── smoke_test.py
├── app/
│   ├── agent.py              THE workflow graph (Workflow): START → prepare →
│   │                         guardrail / setup / classify → specialists →
│   │                         hitl_gate → output. App + ResumabilityConfig.
│   ├── fast_api_app.py       FastAPI entrypoint: get_fast_api_app, routers,
│   │                         session_service_uri, logging, /feedback
│   ├── custom.py             REST router: /tools/classes, /campaigns,
│   │                         /campaign/*, /state/*, /tools/* lookups, /health/db,
│   │                         DELETE /session/{id} (rewind)
│   ├── ambient.py            POST / Pub/Sub push handler + GET
│   │                         /ambient/sessions/{id}/stream (SSE trace the client uses)
│   ├── db.py                 MongoDB client + get_campaigns_col()
│   ├── agents/               the agent definitions:
│   │   ├── supervisor_agent.py   classifier (intent routing)
│   │   ├── action_agent.py       combat/rules (action_executor + evaluator)
│   │   ├── npc_dialogue_agent.py NPC dialogue
│   │   ├── campaign_agent.py     scene/state management
│   │   ├── setup_agent.py        first-turn campaign/party creation
│   │   ├── output_agent.py       formats final GMResponse
│   │   ├── story_agent.py        retrieves adventure content
│   │   ├── evaluator_judge.py    semantic eval of drafts
│   │   ├── callbacks.py          evaluate_input_safety, _build_party_state, etc.
│   │   ├── schemas.py            pydantic: CampaignResult/ActionResult/NpcResult/
│   │   │                         SetupResult + CharacterUpdate/CombatEntry/DialogueLine
│   │   └── config.py             MODEL selection, USE_LOCAL_LLM/Ollama
│   ├── tools/                function tools (TOOL_FUNCTIONS registry):
│   │   ├── campaign.py           get_campaign / update_campaign (MongoDB)
│   │   ├── campaign_files.py     fetch adventure markdown from docs/
│   │   ├── assets.py             get_asset_url (ASSETS.md fuzzy match)
│   │   ├── character_lookup.py   NPC lookup (Appendix D.csv)
│   │   └── open5e_lookup.py      lookup_character_resource (open5e data)
│   ├── app_utils/            telemetry.py, typing.py (Feedback model)
│   └── .adk/session.db       LOCAL SQLite ADK session store (auto-created)
├── data/                     open5e reference data (a Python package)
│   ├── loader.py             load_resource / lookup_by_name (cached)
│   ├── fetch_open5e.py       refetch script
│   └── open5e/*.json         classes, monsters, spells, armor, weapons,
│                             magicitems, races, backgrounds
├── scripts/                  dump_session_trace.py, rewind_session.py
├── tests/
│   ├── unit/                 test_agents, test_workflow, test_guardrails (+datasets/)
│   ├── integration/          test_agent.py (full workflow), test_server_e2e.py
│   └── eval/                 eval_config.yaml + datasets (ADK eval)
└── logs/
```

**Key facts** (full detail in `dnd-game-master-agent/CLAUDE.md`):
- **Campaigns** (durable game state) live in **MongoDB**; **ADK sessions**
  (per-run trace) live in **local SQLite** `app/.adk/session.db`.
- `classes.json` is at **`data/open5e/`**, NOT `app/data/`.
- HITL gate uses fixed `interrupt_id="hitl_approval"`; resume via `/run` with a
  `functionResponse` (`name="adk_request_input"`, `response={result:…}`).
- The client drives the game through **ambient**: `POST /ambient` (submit) +
  `GET /ambient/sessions/{id}/stream` (SSE trace) + `/run` (approve/reject). The
  Pub/Sub `subscription` is the campaign_id, so **session_id == campaign_id**.
- To debug *what an agent actually did* at runtime, use `scripts/dump_session_trace.py`
  / the `session-trace-analysis` skill (reads session.db) — MongoDB only has
  final state.

---

## Frontend — `dnd-game-master-client/`
Next.js 16 App Router. **Note: this Next version has breaking changes** (see the
client's `AGENTS.md`); read `dnd-game-master-client/CLAUDE.md` before editing.

```
dnd-game-master-client/
├── CLAUDE.md                 ← detailed frontend guide (READ before editing)
├── AGENTS.md                 "this is NOT the Next.js you know" warning
├── next.config.mjs           rewrites() proxy to BACKEND_ORIGIN (must be .mjs!)
├── package.json              next 16.2.9, react 19, framer-motion, html2canvas-pro
├── public/placeholders/      SVG placeholder art (cover/stills)
└── src/
    ├── app/                  layout.tsx (fonts), globals.css (Tailwind v4 @theme
    │                         tokens), page.tsx (landing), game/page.tsx
    ├── components/
    │   ├── ui/               reusable: Button, Card, Modal, NavButton, Loader,
    │   │                     Carousel, SectionShell, DissolveOverlay
    │   ├── landing/          Hero, HowToPlay, StillsCarousel
    │   └── game/             GameStage + views (StartChoice, CampaignSelect,
    │                         PartySelect, Resume, Console) + ClassDnaProfile,
    │                         PartyMemberRow, and console/ (the play screen:
    │                         ConsoleHost/Provider, layouts/, panels/, parts/)
    ├── context/              GameContext.tsx (step machine + campaignId/autoStart)
    ├── hooks/                useClasses, useCampaigns, useCampaignHistory,
    │                         useDissolve, useAssemble
    └── lib/                  api.ts (ROOT_API="" + all calls), types.ts,
                              games.ts (campaign catalog + PRELOAD_PARTY)
```

**Game flow** (scroll-locked, corner nav): `start → campaignSelect → partySelect →
console` (new) or `start → resumeLoad → console` (resume). Transitions:
campaign→party is a fade; party/resume→console use the `DissolveOverlay`
("sand blowing" particle effect via html2canvas-pro). `ConsoleView` is the full
interactive console (swappable layouts; SSE event timeline; HITL approval) —
**Confirm & Begin** auto-fires the first turn with the assembled party. See the
client's `CLAUDE.md` for the console architecture + run lifecycle.

**Conventions:** theme tokens only (no ad-hoc colors); all fetching via hooks →
`lib/api.ts`; reuse `components/ui/*`.

---

## Run it
```bash
# backend (terminal 1)
cd dnd-game-master-agent && make dev          # or: uvicorn app.fast_api_app:app --port 8000
# frontend (terminal 2)
cd dnd-game-master-client && npm run dev       # http://localhost:3000
```
Backend needs `MONGO_URI` (in `app/.env`). The client proxies to
`BACKEND_ORIGIN` (default `http://localhost:8000`).

## Capstone context
- Grading: 70 pts code+docs / 30 pts pitch; demonstrate ≥3 of 6 concepts; live
  deploy not required; no secrets in code (`.claude/` memory has the rubric).
- Architecture decisions: no MCP (use ADK `get_fast_api_app`), manifest-router
  retrieval, two Cloud Run services, deploy artifacts only in the final phase.
