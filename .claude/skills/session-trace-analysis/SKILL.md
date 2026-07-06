---
name: session-trace-analysis
description: >-
  How to investigate the D&D Dungeon Master agent's runtime behavior using
  scripts/dump_session_trace.py, which dumps the ADK session.db event stream —
  model thoughts, tool/function calls, function responses, and state deltas for
  a session. Use this skill WHENEVER you are analyzing, debugging, or
  investigating what this app's agents actually did at runtime: why an agent
  did or didn't call a tool (e.g. update_campaign, get_campaign), why the output
  looks wrong or empty, what an agent was "thinking", why MongoDB / campaign
  state didn't update, why a turn was routed to a given intent, or any question
  of the form "what happened in that session/turn?". Reach for this BEFORE
  reading MongoDB or guessing from the code: MongoDB only stores final committed
  state, while session.db holds the full per-event decision trace that explains
  the behavior.
---

# Session Trace Analysis

When something about the agent's behavior is surprising — a tool didn't fire,
state didn't persist, the wrong specialist ran, the output is malformed — the
answer is almost always in the **event stream**, not in the final database
state. This app records every event (LLM thoughts, tool calls, tool responses,
state deltas) to ADK's local SQLite session store. `scripts/dump_session_trace.py`
renders that stream into a readable timeline.

## The key mental model: two stores, different purposes

- **`app/.adk/session.db`** (ADK `DatabaseSessionService`) — the full, ordered
  event stream for every turn: what each agent thought, which tools it called
  with what args, what came back, and how state changed. This is where you
  investigate *decisions*.
- **MongoDB** (`campaigns` collection) — only the *final committed* campaign
  state. It tells you the end result, never the reasoning. If you only look
  here, you cannot tell *why* something happened (or didn't).

So: to answer "why did the model do X / skip Y", read the trace. Reading Mongo
will mislead you because it can look empty/unchanged for reasons the trace
explains.

## Running the script

Run from the agent directory (`dnd-game-master-agent/`). The script resolves the
db relative to its own location, so no path juggling is needed.

```bash
# Most common: dump the latest session as an annotated timeline
python scripts/dump_session_trace.py

# List all sessions (id, user, last-updated, event count) to pick one
python scripts/dump_session_trace.py --list

# A specific session
python scripts/dump_session_trace.py --session <session-id>

# Export raw events (one JSON object per line) for grep/jq or deeper digging
python scripts/dump_session_trace.py --jsonl trace.jsonl

# Disable ANSI color (also auto-disabled when piped)
python scripts/dump_session_trace.py --no-color

# Point at a different db if needed
python scripts/dump_session_trace.py --db path/to/session.db
```

Stdlib-only (sqlite3 + json) — no dependencies, no network, opens the db
read-only.

## Reading the output

Each event is printed under `[HH:MM:SS] <author>` (the agent/node that emitted
it), grouped by invocation. Parts are annotated with glyphs:

| Glyph | Meaning | What to look for |
|-------|---------|------------------|
| `💬 TEXT` | The model's visible output | The actual response / draft / final JSON |
| `💭 THOUGHT` | The model's reasoning (thought part) | **Why** it decided to do or skip something |
| `🛠 FUNCTION_CALL` | A tool the model invoked, with args | Whether a tool fired and what it was called with |
| `⤷ FUNCTION_RESPONSE` | What the tool returned | `null`/empty results that change downstream behavior |
| `◆ state_delta` | State keys this event changed | `tools_fired`, `intent`, `gm_response`, result keys |

The final **Summary** line reports total events and how many function calls were
emitted, and prints a warning when **zero** tool calls happened — a fast signal
that a model talked itself out of every tool.

## Analysis workflow: "why didn't tool X fire?"

This is the most common investigation. Work top-down:

1. **Find the responsible agent's events** — e.g. for persistence, look at
   `output_agent`; for combat, `action_executor`. Scan to the
   `--session` of interest with `--list` first if it's not the latest.
2. **Check for a `🛠 FUNCTION_CALL`** to the tool. If absent, the model never
   asked for it.
3. **Read the `💭 THOUGHT` right before** the response. The model usually states
   its reasoning explicitly ("no game state needs updating", "no data to pass").
   That reasoning is the root cause, in the model's own words.
4. **Check `◆ state_delta` → `tools_fired`.** This is the observability record
   of what ran. Empty `tools_fired` confirms nothing fired.
5. **Inspect upstream `⤷ FUNCTION_RESPONSE`s.** A `get_campaign` returning
   `null`, or an empty specialist result, often explains why a later step had
   nothing to act on.

## Critical nuance: callback-driven tools are NOT function calls

Some tools run from Python **callbacks**, not as model-issued tool calls. The
clearest example: `output_agent` persists via `persist_campaign_callback`
(an `after_agent_callback`), which calls `update_campaign` directly. Because it
is not the *model* calling a tool, it will **not** appear as a `🛠 FUNCTION_CALL`
in the trace. Instead it surfaces as a `◆ state_delta` that appends
`update_campaign` to `tools_fired`.

So when checking whether persistence happened:
- Look for `update_campaign` in `tools_fired` (via `state_delta`), **not** for a
  `🛠 FUNCTION_CALL`.
- If `update_campaign` is in `tools_fired` but Mongo still looks unchanged,
  inspect the `gm_response` the callback parsed: malformed/markdown-fenced JSON
  parses to empty, so the call runs but writes only a timestamp. The `💬 TEXT`
  of the `output_agent` event shows exactly what was produced (e.g. a
  ` ```json ` fence) — that's your culprit.

## Common findings and what they mean

| Symptom in trace | Likely cause |
|------------------|--------------|
| Zero `🛠 FUNCTION_CALL`, model `💭 THOUGHT` rationalizes skipping | Model treated a tool as optional; instruction/params too permissive |
| `update_campaign` in `tools_fired` but Mongo unchanged | `gm_response` was unparseable (markdown fence / prose), so fields were `None` |
| `get_campaign` `⤷ FUNCTION_RESPONSE: {"result": null}` | No campaign in store yet; downstream has no state to build on |
| Long, waffling `💭 THOUGHT` that reverses itself | Weak model (e.g. local Ollama / Gemma) talking itself out of an instruction |
| Wrong specialist ran | Check `intent_classifier`'s `💬 TEXT` and the `intent` `state_delta` |

## When to escalate beyond the script

`dump_session_trace.py` is for *local* investigation of the SQLite event stream.
For production-scale or cross-session observability (latency spans, prompt/
response logging, BigQuery analytics), use Cloud Trace and the
`google-agents-cli-observability` skill instead — that is the right tool once the
question moves from "what happened in this one local session" to "what is
happening across deployed traffic".
