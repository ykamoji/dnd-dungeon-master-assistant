# D&D Game Master Assistant

You are a helpful assistant for creating D&D multi agent game.

## Available Skills (Load on Demand)

These skills are checked into this repo under `.claude/skills/`. Load one by
mentioning `@.claude/skills/SKILL_NAME/SKILL.md` in your request:

- **Database Schema Validator**: `@.claude/skills/database-schema-validator/SKILL.md` — Validates SQL schema files for compliance
- **Git Commit Formatter**: `@.claude/skills/git-commit-formatter/SKILL.md` — Formats git commit messages according to Conventional Commits
- **Google Agents CLI ADK Code**: `@.claude/skills/google-agents-cli-adk-code/SKILL.md` — Agent Development Kit Python API patterns
- **Google Agents CLI Deploy**: `@.claude/skills/google-agents-cli-deploy/SKILL.md` — Deployment workflows and infrastructure
- **Google Agents CLI Eval**: `@.claude/skills/google-agents-cli-eval/SKILL.md` — Agent evaluation and testing
- **Google Agents CLI Observability**: `@.claude/skills/google-agents-cli-observability/SKILL.md` — Monitoring and logging setup
- **Google Agents CLI Publish**: `@.claude/skills/google-agents-cli-publish/SKILL.md` — Publishing agents
- **Google Agents CLI Scaffold**: `@.claude/skills/google-agents-cli-scaffold/SKILL.md` — Project scaffolding and setup
- **Google Agents CLI Workflow**: `@.claude/skills/google-agents-cli-workflow/SKILL.md` — Full development lifecycle
- **JSON to Pydantic**: `@.claude/skills/json-to-pydantic/SKILL.md` — Convert JSON data to Python Pydantic models
- **License Header Adder**: `@.claude/skills/license-header-adder/SKILL.md` — Adds license headers to source files
- **STRIDE Threat Model**: `@.claude/skills/stride-threat-model/SKILL.md` — STRIDE Threat Modeling
- **Session Trace Analysis**: `@.claude/skills/session-trace-analysis/SKILL.md` — Investigate agent runtime behavior via scripts/dump_session_trace.py (ADK session.db event stream)

## Built-in Skills

These are available by default:

- **Verify** — Verify code changes work as intended
- **Code Review** — Review code for correctness and improvements
- **Simplify** — Simplify code for efficiency and readability
- **Fewer Permission Prompts** — Reduce permission prompt frequency
- **Loop** — Run commands on recurring intervals
- **Run** — Launch and test the project app
- **Init** — Initialize CLAUDE.md documentation
- **Review** — Review pull requests
- **Security Review** — Security audit of pending changes

## Quick Reminders

- Keep responses concise and pragmatic
- Test homebrew mechanics before suggesting to players
- Ask for clarification if the campaign context is unclear

