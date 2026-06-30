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
- `npm run dev` — dev server on http://localhost:3000
- `npm run build` / `npm start` — production build / serve
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
  modal shows the class "DNA sheet". "Preload Best Party" loads the 5 presets
  from `PRELOAD_PARTY`. Confirm → `START_DISSOLVE`.
- `ResumeView` — `useCampaigns()` list of saved games as cards. Select →
  `START_DISSOLVE`.
- `ConsoleView` — **intentionally an empty themed placeholder** (the interactive
  game console is a later task).

Transitions: campaign→party is a fade; party→console and resume→console use the
**`DissolveOverlay`** (`useDissolve` hook) — snapshot → particle drift → on
complete `FINISH_DISSOLVE` jumps to the console step.

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
Proxied routes (see `next.config.mjs`): `/tools/*`, `/campaigns`,
`/campaign/*`, `/state/*`, `/health/*`, `/run`, `/feedback`, `/session/*`.
Key calls: `GET /tools/classes` (class DNA profiles → party builder),
`GET /campaigns` (saved-game summaries → resume list).

## Gotchas (learned the hard way)
- **Next config must be `.mjs`, not `.ts`** here: `next dev` in this version
  rejects `next.config.ts` ("not supported"). Keep `next.config.mjs`.
- If `next dev` suddenly runs an ancient Next (e.g. "v9.3.3", `findPagesDir`
  errors), the install is corrupted — check `package.json` `next` version and
  `node_modules/.ignored/next`. Fix the version pin (16.2.9) and reinstall.
- `package.json` may carry a stray `"packageManager": "pnpm@…"` from
  scaffolding; we use **npm**.

## Layout
```
src/app/        layout.tsx (fonts), globals.css (theme), page.tsx, game/page.tsx
src/components/ui/      reusable primitives
src/components/landing/ Hero, HowToPlay, StillsCarousel
src/components/game/    GameStage + the five views + ClassDnaProfile/PartyMemberRow
src/context/    GameContext.tsx (reducer + provider + step machine)
src/hooks/      useClasses, useCampaigns, useDissolve
src/lib/        api.ts (ROOT_API=""), types.ts, games.ts (catalog + presets)
public/placeholders/   SVG placeholder art
```
