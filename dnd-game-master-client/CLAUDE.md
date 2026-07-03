@AGENTS.md

# D&D Game Master — Web Client

Next.js front-end for the D&D Game Master Assistant. Talks to the FastAPI backend
in `../dnd-game-master-agent`.

## Stack
- **Next.js 16** (App Router, Turbopack default) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (config-less; tokens live in `src/app/globals.css` via `@theme`)
- **framer-motion** — view transitions, carousel, modal
- **html2canvas-pro** — snapshots a view for the "sand blowing" dissolve effect
  (the `-pro` fork is required because Tailwind v4 emits `oklch()` colors that
  plain `html2canvas` cannot parse)
- Fonts via `next/font/google`: Cinzel (display), MedievalSharp (the "rune"/niche
  accent), EB Garamond (body) — wired in `src/app/layout.tsx`

## Commands
- `pnpm run dev` — dev server on http://localhost:3000
- `pnpm run build` / `pnpm start` — production build / serve
- Backend must be running on :8000 (or set `BACKEND_ORIGIN`) for live data.

## Architecture
Two routes:
- `/` — **landing** (`src/app/page.tsx`): `Hero`, `HowToPlay`, `StillsCarousel`.
- `/game` — **scroll-locked game stage** (`src/app/game/page.tsx`) wrapping
  `GameProvider` + `GameStage`.

### Game flow (Apple-style, scroll disabled, corner nav)
`GameStage` (`src/components/game/GameStage.tsx`) renders a vertical stack of
full-screen views and translates it with `translateY(-stepIndex*100vh)`. Nav is
via top-left "Back" / top-right "Next" buttons (and arrow keys), gated so
choice-required steps can't be skipped.

Branch-aware step machine (in `src/context/GameContext.tsx`, a `useReducer`):
- new: `start → campaignSelect → partySelect → console`
- resume: `start → resumeLoad → console`

Views (each owns its own local state; shared flow state is in context):
- `StartChoiceView` — New / Resume.
- `CampaignSelectView` — cover-art `Card`s from `src/lib/games.ts`. Only ToA is
  playable; others open a "coming soon" `Modal`. Selecting ToA fades to party.
- `PartySelectView` — `PartyMemberRow`s (name input, class `<select>` from
  `useClasses`, role `<select>` = the class's archetypes). `ClassDnaProfile`
  panel shows the class "DNA sheet". "Preload Best Party" loads the 5 presets
  from `PRELOAD_PARTY`. Confirm → `BEGIN_NEW_CAMPAIGN` (mints the `campaignId`,
  starts the dissolve, and auto-fires the first turn — see the console below).
- `ResumeView` — `useCampaigns()` list of saved games as cards. Select →
  `SELECT_CAMPAIGN` (sets `campaignId`) + `START_DISSOLVE`.
- `ConsoleView` — the **interactive play console** (see "The console" below).

Transitions: campaign→party is a fade; party→console and resume→console use the
**`DissolveOverlay`** (`useDissolve` hook) — snapshot → particle drift → on
complete `FINISH_DISSOLVE` jumps to the console step.

### The console (`src/components/game/console/`)
The play screen. `ConsoleView` → `ConsoleHost` → **`ConsoleProvider`** (owns ALL
run state via `useConsole`) → a swappable **layout** arranging three **panels**.
Every layout exposes identical features — feature logic lives in the panels /
provider, not the layouts.

- **Layouts** (`layouts/`, registry in `index.ts`; `LayoutSwitcher` dropdown,
  persisted to localStorage): `SceneCenterLayout`, `ThreeColumnLayout`,
  `MapHeroLayout`. Add one by appending to the registry.
- **Panels** (`panels/`): `JourneyMapPanel` (turn trail), `SceneReaderPanel`
  (shows the active turn snapshot, or the live `EventTimeline` / pending draft
  while a turn is in flight), `GameMasterPanel` (dice + command composer +
  approval bar).
- **Parts** (`parts/`): `EventTimeline` (+ `EventDetail`), `TrailNode`,
  `DiceTray`, `CommandComposer`, `ApprovalBar`, `AssetGallery`, `PartyStatGrid`.
  Helpers: `events.ts` (SessionEvent → icon/title, approval detection),
  `snapshot.ts`, `scroll.ts`.

**Run lifecycle** (in `ConsoleProvider`; `sessionId == campaignId`):
1. **Submit** — `POST /ambient` (Pub/Sub-style push: `subscription` = campaignId,
   `data` = raw JSON `{action}` for a normal turn, `{game, party}` for the first
   turn). `BEGIN_NEW_CAMPAIGN` (Confirm & Begin) mints `campaignId` in
   `GameContext` and the provider auto-fires that first (setup) turn.
2. **Trace + HITL** — the provider opens an `EventSource` on
   `GET /ambient/sessions/{id}/stream`; each frame is a `SessionEvent` rendered on
   the vertical `EventTimeline`. When an `adk_request_input` event arrives it
   surfaces the draft (approval bar) and closes the stream.
3. **Decide** — `POST /run` with a `functionResponse` (`sendDecision`, result
   `approve`/`reject`); completion reloads campaign history (`useCampaignHistory`).

`campaignId` lives in `GameContext` (minted on `BEGIN_NEW_CAMPAIGN`, or the saved
id on `SELECT_CAMPAIGN` for resume) so the submit and the SSE stream share one id.

## Conventions (follow these)
- **Theme tokens only** — colors/fonts come from `globals.css` `@theme`
  (`bg-obsidian`, `text-gold`, `text-parchment`, `font-display`, `font-rune`,
  `.parchment`, `.text-gilded`). No ad-hoc hex.
- **All fetching goes through hooks** (`src/hooks/*`), which call
  `src/lib/api.ts`. Components never call `fetch` directly.
- **`src/lib/api.ts`** centralizes every backend call and exports
  `ROOT_API = ""` — requests are same-origin and proxied to the backend by
  `next.config.mjs` `rewrites()` (so **no CORS**). Set `BACKEND_ORIGIN` env to
  point the proxy elsewhere.
- Reuse `src/components/ui/*` (`Button`, `Card`, `Modal`, `NavButton`, `Loader`,
  `Carousel`, `SectionShell`, `DissolveOverlay`) for visual consistency.
- Images use plain `<img>` (placeholders are SVG; remote art is the 5etools
  mirror). Cover art is placeholder-first; swap real art by editing
  `src/lib/games.ts`.

## Backend integration
Proxied routes (see `next.config.mjs`): `/tools/*`, `/campaigns`, `/campaign/*`,
`/state/*`, `/health/*`, `/run`, `/run_sse`, `/apps/*`, `/feedback`, `/session/*`,
`/ambient` (→ backend `/`) and `/ambient/:path*` (the event SSE).
Key `lib/api.ts` calls: `getClasses` (party builder), `getCampaigns` (resume
list), `getCampaign(id, includeHistory)` (turn history), `submitTurn` (ambient
push), `sessionStreamUrl` (SSE), `sendDecision` (`/run` HITL approve/reject).
`APP_NAME="app"` and `HITL_INTERRUPT_ID="hitl_approval"` must match the backend.

**Ambient `data` payload**: sent as a **raw JSON object** (not base64). Real GCP
Pub/Sub needs base64, but this local bridge posts straight to the ambient
handler, whose `_extract_player_action` accepts an object directly.

## Gotchas (learned the hard way)
- **Next config must be `.mjs`, not `.ts`** here: `next dev` in this version
  rejects `next.config.ts` ("not supported"). Keep `next.config.mjs`.
- If `next dev` suddenly runs an ancient Next (e.g. "v9.3.3", `findPagesDir`
  errors), the install is corrupted — check `package.json` `next` version and
  `node_modules/.ignored/next`. Fix the version pin (16.2.9) and reinstall.
- `package.json` may carry a stray `"packageManager": "pnpm@…"` from
  scaffolding; we use **pnpm**.

## Layout
```
src/app/        layout.tsx (fonts), globals.css (theme), page.tsx, game/page.tsx
src/components/ui/      reusable primitives
src/components/landing/ Hero, HowToPlay, StillsCarousel
src/components/game/    GameStage + the five views + ClassDnaProfile/PartyMemberRow
src/components/game/console/  ConsoleHost/Provider + LayoutSwitcher, layouts/,
                              panels/, parts/, events.ts, snapshot.ts, scroll.ts
src/context/    GameContext.tsx (reducer + provider + step machine; holds
                campaignId + autoStart for the console)
src/hooks/      useClasses, useCampaigns, useCampaignHistory, useDissolve, useAssemble
src/lib/        api.ts (ROOT_API=""), types.ts (incl. SessionEvent), games.ts
public/placeholders/   SVG placeholder art
```
