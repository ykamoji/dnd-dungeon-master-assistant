<center>
<img src="https://www.googleapis.com/download/storage/v1/b/kaggle-user-content/o/inbox%2F21423668%2F93ce875ba9eefed8a41fbb5ce319ee1f%2Fdm_logo.png?generation=1783284691871093&alt=media" width="300px" />
</center>

## Overview — D&D Dungeon Master Assistant

*Submission for the AI Agents: Intensive Vibe Coding Capstone Project (Freestyle track). A self-correcting, multi-agent Dungeon Master built on Google's ADK and Gemini.*

The D&D Dungeon Master Assistant is a playable web app that runs a full Dungeons & Dragons campaign with no human DM. Behind a security guardrail, an intent classifier routes each turn to one of three specialist agents — combat, NPC dialogue, or scene — each a self-correcting loop that drafts an answer, calls real tools for grounded data, and is fact-checked before a human-approval gate commits it to durable state. It runs the full *Tomb of Annihilation* adventure end to end and demonstrates five of the six course concepts.


## The Problem Statement

A **Dungeon Master** is one person wearing many hats. In a single breath they are a **novelist** narrating a scene, an **improv actor** voicing a dozen characters, a **rules lawyer** adjudicating combat from a dense rulebook, and a **continuity editor** tracking an entire evolving world. It takes years to do well — and if nobody at your table can (or wants to) do it, the game never happens. That missing person is the bottleneck keeping millions away from one of the world's great storytelling games.

The tempting fix is to throw a single large prompt at it: "be a Dungeon Master." That fails in a specific way, because the four jobs pull against each other: one model juggling all of them hallucinates rules, invents characters that were never in the module, fudges hit-point math, and loses track of who is even in the party. The hard part was never *generating text* — it is keeping a **long-running, stateful game** honest across dozens of turns. So instead of one narrator, this project builds four specialists and a referee that fact-checks every one of them.

## The Solution Statement

**What I built is a playable web app that runs a full D&D campaign.** You pick a campaign, assemble a party, and type what you want to do — *haggle with a merchant prince in Port Nyanzaru, or hold the line as raptors burst from the jungle* — and the game narrates the scene, voices the NPCs, resolves combat by the rulebook, shows the module's artwork, and asks you to approve each turn before it commits. Under the hood, an **ADK graph workflow** over FastAPI (with a Next.js play surface) runs the full five-chapter *Tomb of Annihilation* — 140 source files and 461 NPC and monster stat blocks.

## Why agents ?

Those four conflicting jobs are exactly what a multi-agent system is built for. Instead of one model juggling everything, the work is decomposed into **specialists** — each with a narrow mandate, its own model configuration, its own tools, and its own definition of "correct":

- A **Session Zero Coordinator** that runs once before play to build the campaign and party from the opening message.
- A **Combat & Rules Arbiter** that resolves actions strictly by D&D 5e mechanics and shows its math.
- A **Character Actor** that voices NPCs in-character.
- A **Lorekeeper & Scene Director** that frames scenes and tracks world progression.
- A **Module Librarian** that retrieves canonical source text so the others never invent lore.

This separation buys the one thing a single prompt cannot: every agent is **fact-checked** by a subagent before a single word reaches the player. Agents here are not a decorative wrapper; the correctness of a forty-turn campaign *depends* on the separation.

---

## Architecture

The workflow is deliberately a **graph, not a linear chain** — every DM message enters at a single node and is routed from there.

![](https://www.googleapis.com/download/storage/v1/b/kaggle-user-content/o/inbox%2F21423668%2F2d037431896316323c065a46fc47ecdc%2FArch.png?generation=1783250928455314&alt=media)

Three design decisions make this robust:

The **Prepare** node does the un-glamorous work. It resets per-turn state, decodes the incoming message (the client drives the game over a Pub/Sub API), runs the guardrails, derives the campaign identifier, and loads the current campaign state. It then emits a single routing decision — **block**, **setup**, or **proceed**.

**Setup** is a one-time event. On a campaign's first turn there is no party or world yet, so the entry node routes to the setup agent, which parses the opening message into a campaign name and roster, derives each class's starting HP and proficiencies, and builds the opening scene. A dedicated finalize step then persists the new campaign **deterministically** — never trusting the model to emit the database write itself — and refuses to create anything unless the setup result is explicitly ready.

**Approval** gates every turn. After a specialist produces a draft, the human-in-the-loop gate pauses the entire run and shows the draft to the players. Only on approval does the turn commit to the durable campaign — powered by ADK's **resumable-run support**, so a paused game resumes exactly where it left off.

### The Specialist Loop Agents

All three specialists — and the setup agent — share the **same self-correcting pattern**: an ADK `LoopAgent` pairs an **executor** (drafts the answer, calls tools) with an **evaluator** (validates the draft and either ends the loop or forces a retry with feedback, up to 3 iterations).

![](https://www.googleapis.com/download/storage/v1/b/kaggle-user-content/o/inbox%2F21423668%2Fafe4d23a2903f153df643af4d362214a%2Fspecialist_agent.png?generation=1783251382552490&alt=media)

The evaluator runs two gates in sequence. First a **structural gate**: it parses the model's reply and validates it against that specialist's strict **output schema**; if the draft doesn't conform, the exact validation errors go back to the executor as precise corrections for the next attempt. Second, a **semantic gate**: a separate LLM acting as a "Quality Assurance Judge" grades whether the draft addresses the player's query, respects the rules, and avoids hallucination, returning pass or fail. Only when *both* gates pass does the evaluator end the loop and hand the result forward. The judge also fails open: if the grading call errors, the turn proceeds rather than blocking the game.

This is what keeps a long game honest: a hallucinated hit-point, or *a shopkeeper conjured from thin air who was never in Port Nyanzaru*, is caught and corrected before the player ever sees it.

### The 3 Specialists

Each executor is **stateless** — a pure function of the state injected into its prompt (campaign snapshot, player message, retry feedback). And each is told, emphatically, that it knows nothing — party state, stat blocks, lore — until a tool returns it; simulating a tool result is forbidden.

- **Combat & Rules Arbiter.** When a *velociraptor bursts from the undergrowth*, this agent rolls the attack in the open — *1d20+4 vs AC 15, a hit for 7 piercing* — shows every die roll and modifier, and reports resulting HP and conditions *only* when a tool confirms them. It runs on the highest-reasoning model configuration and can call every tool — party state, stat blocks, rules, and the Module Librarian.

- **Character Actor.** Voices NPCs in-character. It pulls the NPC's "DNA profile" (personality, motivation, voice) from the stat-block lookup, fetches the module's *written* lines from the **Librarian**, and grounds the dialogue in both — voice from the profile, content from the module. It might deliver *Syndra Silvane's desperate plea to end the death curse* in one breath and *a dockside vendor's haggling* in the next.

- **Lorekeeper & Scene Director.** It knows that *Chult is a death-cursed jungle and that the tomb at its heart is quietly draining souls*, and frames each scene accordingly. It tracks how far the campaign has progressed and surfaces the matching art — drawing chapter, section, and image references from the Librarian rather than inventing them.

### Tools and the Module Librarian

The central structural move: **the Module Librarian** is itself an agent, exposed to the other agents as a tool. It is the *only* component allowed to touch the adventure's source text. This enforces a clean boundary: specialists reason about mechanics and narrative, and delegate every "what does the module actually say?" question to one librarian.

![](https://www.googleapis.com/download/storage/v1/b/kaggle-user-content/o/inbox%2F21423668%2F521c41a5469241f10b45280f4cdd2855%2Ftools.png?generation=1783252507570345&alt=media)

The Librarian's contract is strict and deliberate. Its **tool description** tells callers exactly what to pass — a natural-language question naming what to look up, never a campaign ID, session ID, or player state. Its prompt bakes in the entire knowledge and asset indexes, so it knows which files exist before reading any source text, and returns a structured result with the answer, its source file, and the matched art. Executors call all their tools in a **single parallel batch** rather than one at a time — a latency optimization ADK supports natively.

The supporting tools are plain Python functions: a **party-state lookup** reads live party and scene data from the database; a **character lookup** reads NPC and monster stats from the module's 461-entry appendix; and a **rules lookup** reads the open-source Open5e dataset — 1,400+ spells, 1,600+ magic items, 3,200+ monsters, and all 12 classes. Lightweight callbacks record which agents and tools fired every turn, for full observability.

---

## State, Sessions, and Durability

State is split cleanly: **campaigns** — the durable game world (party, scene, progress, history) — live in **MongoDB**, while **sessions** — the per-run decision trace — live in ADK's session service. When that service is in-memory (the Cloud Run default), a persistence plugin backs it with MongoDB and rehydrates on boot, so a paused, awaiting-approval turn survives a serverless restart on any cloud, becoming cloud agnostic — your *cleric's last 4 hit points* and the *half-fought battle with a giant crocodile* waiting exactly where you left them.

## Demonstrated course concepts

The five concepts on display:

1. **Multi-agent system (ADK)** — the core. A graph workflow orchestrating an intent classifier, three self-correcting specialist loops, a one-time setup subgraph, and an agent-exposed-as-a-tool, all with structured, schema-validated I/O.
2. **Security features** — an input guardrail at the graph entry blocks prompt-injection and out-of-scope requests with safe, canned refusals; every specialist is forbidden from acting on data a tool hasn't verified; the file-reading tool guards against directory traversal; and no secrets live in code.
3. **Deployability** — the backend and client each deploy as a Cloud Run service with committed scripts and Dockerfiles, fronted by ADK's built-in FastAPI server.
4. **Agent skills (Agents CLI)** — the repo uses the Google Agents CLI scaffolding, and I authored a **custom skill, `session-trace-analysis`**, that renders ADK's per-run event stream — model thoughts, tool calls, state changes — into a readable debugging timeline.
5. **Antigravity** — the entire app was built with agentic "vibe coding" in Antigravity and Claude Code.

## The Journey to Perfection

The whole system was built through **agentic development** — Antigravity and Claude Code — with every prompt archived publicly. The hardest part was not writing agents but *debugging* them: when a turn misbehaved, the final database state told me nothing about *why*. So I built the `session-trace-analysis` skill to read ADK's per-event decision trace, and handed that trace to the coding agent to fix issues precisely. The codebase is guarded by **unit, integration and eval tests** — covering the guardrails, the agents, and the full approval-and-resume workflow — run after every change.

[Browse every prompt behind the build](https://agent-cli-dashboard.onrender.com/dashboard/group/D%26D%20Game%20Master%20Assistant?demo=Google+Kaggle+Vibe+Coding&expand=true)

## Try it

[Live Demo](https://dnd-dungeon-master-client-101298305706.us-east1.run.app/) — deployed on GCP Cloud Run; it may not always be available due to resource constraints.

The [public GitHub repository](https://github.com/ykamoji/dnd-dungeon-master-assistant) carries the complete setup, deployment, and architecture guides in its `README.md`. **No API keys or secrets are committed**; every credential is supplied through environment variables.

The goal is simple: **a Dungeon Master for every table that lacks one** — so that anyone who has never had someone to run the table can still open the door, roll the dice, and step into the jungle.