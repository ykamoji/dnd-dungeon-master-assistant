# D&D Dungeon Master Client (Frontend)

The web face of the D&D Dungeon Master Assistant: a themed landing page and an Apple-style, scroll-locked game console that drives the agent backend — campaign/party selection, live SSE event timeline, human-in-the-loop turn approval, and voice input.

> High-level architecture and the agent backend it talks to: see the [repo root README](../README.md) and [dnd-game-master-agent](../dnd-game-master-agent/README.md).

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.9** (App Router, standalone output) — ⚠️ Next 16 has breaking changes; read `AGENTS.md` before editing |
| UI | React **19.2.4**, TypeScript 5 |
| Styling | Tailwind CSS **v4** (`@theme` design tokens in `globals.css` — no ad-hoc colors) |
| Motion | `framer-motion` (scroll-locked flow), `html2canvas-pro` ("sand-dissolve" transition) |
| Content | `react-markdown` (narration rendering) |
| Voice | `@google/genai` — browser connects directly to **Gemini Live** (STT) using ephemeral tokens minted by the backend (`/api/live-token`) |
| Package manager | pnpm **11** (pinned via `packageManager`, use corepack), Node **22** |
| Deploy | Multi-stage Docker → Cloud Run (`deploy.sh` + `cloudbuild.yaml`) |

## How it connects to the backend

All backend traffic goes through **Next.js `rewrites()`** (`next.config.mjs`): the browser calls relative paths (`ROOT_API = ""`), the Next server proxies them to `BACKEND_ORIGIN` — so there is **no CORS anywhere**. Proxied prefixes: `/api`, `/tools`, `/campaigns`, `/campaign`, `/state`, `/health`, `/run`, `/run_sse`, `/apps`, `/feedback`, `/session`, plus `/ambient` → the backend's Pub/Sub push handler at its root (`/`) and `/ambient/*` for the SSE stream. `compress: false` keeps Next from buffering SSE.

⚠️ **`BACKEND_ORIGIN` is baked at build time.** Next evaluates `rewrites()` during `next build`, so changing the env var at runtime does nothing — rebuild to point at a different backend (this is why Docker/Cloud Run pass it as a build arg).

## Project structure

```
dnd-game-master-client/
├── next.config.mjs        # rewrites() proxy to BACKEND_ORIGIN (must stay .mjs)
├── src/
│   ├── app/               # layout (fonts), globals.css (Tailwind v4 tokens), landing, game/
│   ├── components/
│   │   ├── ui/            # Button, Card, Modal, Carousel, DissolveOverlay, …
│   │   ├── landing/       # Hero, HowToPlay, StillsCarousel
│   │   └── game/          # GameStage + views + console/ (the play screen)
│   ├── context/           # GameContext (step machine)
│   ├── hooks/             # useClasses, useCampaigns, useCampaignHistory, …
│   └── lib/               # api.ts (all fetches), types.ts, games.ts (campaign catalog)
├── public/placeholders/   # SVG placeholder art
├── Dockerfile             # multi-stage build → lean standalone runtime
├── local.docker.sh        # build & run the container locally
├── deploy.sh              # Cloud Run deploy (Cloud Build + gcloud run)
├── cloudbuild.yaml        # bakes BACKEND_ORIGIN into the image
└── cloudrun.env.yaml      # holds the deployed backend URL (gitignored)
```

Game flow (scroll-locked): `start → campaignSelect → partySelect → console` (new game) or `start → resumeLoad → console` (resume). Conventions: theme tokens only, all fetching via hooks → `lib/api.ts`, reuse `components/ui/*`.

## Prerequisites

- **Node 22+** and **pnpm** — `corepack enable` picks up the pinned pnpm automatically
- The **backend running on `http://localhost:8000`** (see [its README](../dnd-game-master-agent/README.md))
- Docker (container runs only), gcloud SDK (deploys only)

## Run locally (dev)

```bash
corepack enable
pnpm install
cp .env.local.example .env.local   # BACKEND_ORIGIN=http://localhost:8000
pnpm dev                           # → http://localhost:3000
```

Production build on bare metal: `pnpm build && pnpm start` (reads `BACKEND_ORIGIN` at *build* time).

## Run with Docker

```bash
./local.docker.sh
```

Builds `dnd-gm-client:local` and runs it on **http://localhost:3000** with `.env.local`. The default build bakes `BACKEND_ORIGIN=http://localhost:8000` — to target a different backend, rebuild:

```bash
docker build --build-arg BACKEND_ORIGIN=https://your-backend.run.app -t dnd-gm-client:local .
```

(If the backend runs in Docker too, put both containers on one network, or use `host.docker.internal` instead of `localhost`.)

## Deploy to Cloud Run

Deploy the **backend first** — its URL gets baked into this image.

```bash
# 1. Edit PROJECT / REGION / SERVICE at the top of deploy.sh
# 2. Create cloudrun.env.yaml (gitignored):
#      BACKEND_ORIGIN: "https://<your-deployed-backend>.run.app"
./deploy.sh --dry-run   # print the commands without running them
./deploy.sh             # Cloud Build (bakes BACKEND_ORIGIN) → gcloud run deploy → prune old images
```

Deployment shape: scale-to-zero, `max-instances 1`, `timeout 3600` (keeps long-lived SSE proxy connections alive), 512Mi memory. The script validates that `BACKEND_ORIGIN` isn't still `localhost`, enables the required APIs, and prints the public URL when done.
