# D&D Dungeon Master Client (Frontend)

The web face of the D&D Dungeon Master Assistant: a themed landing page and an Apple-style, scroll-locked game console that drives the agent backend — campaign/party selection, live SSE event timeline, human-in-the-loop turn approval, and voice input.

> High-level overview and the agent backend it talks to: see the [repo root README](../README.md) and [dnd-game-master-agent](../dnd-game-master-agent/README.md).

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.9** (App Router) — ⚠️ Next 16 has breaking changes; read `AGENTS.md` before editing |
| UI | React **19.2.4**, TypeScript 5 |
| Styling | Tailwind CSS **v4** (`@theme` design tokens in `globals.css` — no ad-hoc colors) |
| Motion | `framer-motion` (scroll-locked flow), `html2canvas-pro` ("sand-dissolve" transition) |
| Content | `react-markdown` (narration rendering) |
| Voice | `@google/genai` — browser connects directly to **Gemini Live** (STT) using ephemeral tokens minted by the backend (`/api/live-token`) |
| Package manager | pnpm **11** (pinned via `packageManager`, use corepack), Node **22** |

## How it connects to the backend

All backend traffic goes through **Next.js `rewrites()`** (`next.config.mjs`): the browser calls relative paths (`ROOT_API = ""`), the Next server proxies them to `BACKEND_ORIGIN` — so there is **no CORS anywhere**. Proxied prefixes: `/api`, `/tools`, `/campaigns`, `/campaign`, `/state`, `/health`, `/run`, `/run_sse`, `/apps`, `/feedback`, `/session`, plus `/ambient` → the backend's Pub/Sub push handler at its root (`/`) and `/ambient/*` for the SSE stream. `compress: false` keeps Next from buffering SSE.

Note: `rewrites()` are evaluated during `next build`, so for production builds `BACKEND_ORIGIN` must be set at **build** time (in dev, restarting `pnpm dev` picks it up).

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
└── public/placeholders/   # SVG placeholder art
```

Game flow (scroll-locked): `start → campaignSelect → partySelect → console` (new game) or `start → resumeLoad → console` (resume). Conventions: theme tokens only, all fetching via hooks → `lib/api.ts`, reuse `components/ui/*`.

## Prerequisites

- **Node 22+** and **pnpm** — `corepack enable` picks up the pinned pnpm automatically
- The **backend running on `http://localhost:8000`** (see [its README](../dnd-game-master-agent/README.md))

## Run locally

```bash
corepack enable
pnpm install
cp .env.local.example .env.local   # BACKEND_ORIGIN=http://localhost:8000
pnpm dev                           # → http://localhost:3000
```

Open **http://localhost:3000**, pick a campaign, assemble a party, and play. Production build: `pnpm build && pnpm start`.
