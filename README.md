# D&D Dungeon Master Assistant

**A self-correcting, multi-agent Dungeon Master built on Google's ADK and Gemini.** A playable web app that runs a full Dungeons & Dragons campaign with no human DM: behind a security guardrail, an intent classifier routes each turn to a specialist agent — combat, NPC dialogue, or scene — each a self-correcting loop that drafts an answer, calls real tools for grounded data, and is fact-checked before a human-approval gate commits it to durable state. It runs the five-chapter *Tomb of Annihilation* adventure end to end.

🎲 **[Live demo](https://dnd-game-master-client-101298305706.us-east1.run.app/)** (scale-to-zero — first hit may cold-start) · 🤖 [Prompt archive of the agentic build](https://agent-cli-dashboard.onrender.com/dashboard/group/D%26D%20Game%20Master%20Assistant?demo=Google+Kaggle+Vibe+Coding&expand=true)

## How it works

Every player message enters an ADK **graph workflow** (not a linear chain) at a single *prepare* node — guardrails, state loading, routing — and flows to one of the specialists:

- **Session Zero Coordinator** — one-time campaign & party creation from the opening message
- **Combat & Rules Arbiter** — resolves actions strictly by D&D 5e mechanics, shows its math
- **Character Actor** — voices NPCs in-character, grounded in the module's written dialogue
- **Lorekeeper & Scene Director** — frames scenes, tracks world progression, surfaces module art
- **Module Librarian** — an agent exposed *as a tool*; the only component allowed to read the adventure source text

Each specialist is an ADK `LoopAgent`: an executor drafts, an evaluator validates the draft against a strict output schema **and** an LLM "QA judge," and forces retries until both gates pass. A human-in-the-loop gate then pauses the run for player approval before anything commits. Campaigns persist in **MongoDB**; per-run ADK sessions live in a local SQLite store.

## The two apps

| App | What it is | Stack | Port | Full setup guide |
|---|---|---|---|---|
| [`dnd-game-master-agent/`](./dnd-game-master-agent/) | Multi-agent DM backend + REST/SSE API | Python 3.11+, Google ADK 2.0, FastAPI, MongoDB, uv | 8000 | **[Backend README →](./dnd-game-master-agent/README.md)** |
| [`dnd-game-master-client/`](./dnd-game-master-client/) | Landing page + scroll-locked game console | Next.js 16, React 19, TypeScript, Tailwind v4, pnpm | 3000 | **[Client README →](./dnd-game-master-client/README.md)** |

The client proxies all backend calls through Next.js `rewrites()` (no CORS). The browser also connects directly to **Gemini Live** for voice input, using ephemeral tokens minted by the backend.

## Tech stack at a glance

| | |
|---|---|
| **AI / agents** | Google ADK 2.0 graph workflow, Gemini models (per-agent config), optional local Ollama via LiteLLM, Gemini Live (voice) |
| **Backend** | Python 3.11–3.13, FastAPI, Uvicorn, PyMongo, uv, Google Agents CLI scaffolding |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4, framer-motion |
| **Data** | MongoDB (campaign state), SQLite (local ADK sessions), Open5e JSON (1,400+ spells, 3,200+ monsters), *Tomb of Annihilation* module text |

## Quick start

Prereqs: Python 3.11+ with [`uv`](https://docs.astral.sh/uv/), Node 22+ with pnpm (`corepack enable`), a MongoDB URI, a [Gemini API key](https://aistudio.google.com/).

```bash
# Terminal 1 — backend on :8000
cd dnd-game-master-agent
make install
# create app/.env  (GOOGLE_API_KEY, GOOGLE_MODEL, SMART_MODEL, MONGO_URI, … — see backend README)
make local

# Terminal 2 — client on :3000
cd dnd-game-master-client
pnpm install
cp .env.local.example .env.local   # BACKEND_ORIGIN=http://localhost:8000
pnpm dev
```

Open **http://localhost:3000**, pick a campaign, assemble a party, and play. Full configuration tables, test commands, and API reference live in the two app READMEs linked above.

## Repository layout

```
dnd-dungeon-master-assistant/
├── README.md                  ← you are here (high level)
├── dnd-game-master-agent/     backend: agents, tools, tests, Makefile
├── dnd-game-master-client/    frontend: landing + game console
├── docs/                      Tomb of Annihilation module text (markdown, read by the backend)
├── assets/                    image asset index (desc → URL; art proxied from the 5etools mirror, no binaries)
└── conversation-egress/       exports the agentic-coding conversation logs to the public prompt dashboard
```

## Security

No API keys or secrets are committed anywhere in the repo. All credentials flow through gitignored env files (`app/.env`, `.env.local`); the module-file tool guards against path traversal; an input guardrail at the workflow entry blocks prompt-injection and out-of-scope requests.

## License

[MIT](./LICENSE)
