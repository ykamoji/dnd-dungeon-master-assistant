# conversation egress

Pushes the CLI agent conversation logs into a MongoDB `vibe_coding` database.

## What it does

- Reads JSON logs from `.claude/agent_logs` and `.agents/agent_logs`
  (ignores `debug_payload.json`).
- Inserts each log entry into the `logs` collection, tagging it with:
  - `cli_agent` — `claude` for `.claude/agent_logs`, `antigravity` for `.agents/agent_logs`
  - `session_id` — the JSON file name (without extension)
  - `user_id` — the id of the `google_hackathon` user
- Ensures a single `google_hackathon` user in the `user` collection
  (`user_id`, `name`, `email`, `role`, `created_at`); reused if it already exists.

Re-running is safe and additive: each entry is keyed by
`(session_id, cli_agent, entry_index)`, so existing logs are left untouched and
only new entries (e.g. newly appended conversation turns) are inserted.

## Setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI` (and optionally `DB_NAME`).
2. Run it:

```bash
uv run egress.py            # push to MongoDB
uv run egress.py --dry-run  # parse logs only, no DB writes
```
