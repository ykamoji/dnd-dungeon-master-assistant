# D&D Game Master Assistant — Video Teleprompter Script

**Hard limit: 5:00.** Target ≈ **4:40** to leave buffer.
Pace: read at a slight clip with genuine energy (~150 wpm). Keep the demo to ~90 seconds.
`[SCREEN]` = what should be visible. `[CUE]` = action to take. Bold text is what you speak.

Running total is cumulative and approximate — glance at it to stay on pace.

---

## Slide 1 — Title / Hook  ·  ~0:16  ·  (→ 0:16)

[SCREEN] Title slide (D&D Game Master Assistant, d20).

> **"A raptor bursts from the jungle — roll initiative."** Behind that one sentence, a Dungeon Master is doing three jobs at once: the rules math, the acting, and the memory of everything that's ever happened. I built an AI that does all three — a multi-agent Dungeon Master, on Google's ADK.

---

## Slide 2 — The Problem  ·  ~0:15  ·  (→ 0:31)

[SCREEN] "One human. Three jobs. At once." (Rules & Combat · NPC Voices · Memory & Bookkeeping)

> Running D&D live is three expert jobs at once — rules math, improv acting, and bookkeeping. Do all three at speed and the game stalls, rules get fudged, the world goes flat. That's the problem.

---

## Slide 3 — Why Agents  ·  ~0:15  ·  (→ 0:46)

[SCREEN] "Why agents? Because one prompt can't."

> Why not one big prompt? Different jobs, different failure modes — one prompt hallucinates numbers, breaks character, or forgets the campaign. The fix is a team of specialists coordinated by a workflow: a multi-agent system.

---

## Slide 4 — Architecture  ·  ~0:25  ·  (→ 1:11)

[SCREEN] The ADK 2.0 graph workflow (interactive).

> Here's the architecture — an ADK graph. Every message enters at *prepare*, behind a security guardrail. A classifier routes intent to one of three specialists, each a self-correcting loop. Every response pauses at a human-approval gate before it's saved.

[CUE] **Click a request chip (Combat).** Stop talking. Let the path light up through the graph for 2–3 seconds.

> Watch the request light up the path.

---

## Slide 5 — Security  ·  ~0:16  ·  (→ 1:27)

[SCREEN] "Safety at the gate."

> Safety lives at the gate. Before any agent runs, the guardrail screens for prompt injection and out-of-scope asks, and returns a safe, in-character refusal. Persistence is deterministic, output is validated, and no secrets touch the code.

---

## Slide 6 — Anatomy of a Specialist  ·  ~0:21  ·  (→ 1:48)

[SCREEN] "A self-correcting loop" (executor ↔ evaluator).

> This is where quality comes from. An executor drafts the answer, calling tools in parallel for real data. Then an evaluator checks it twice — does it match the schema, and does it actually answer the player? On fail, it retries, up to three times. Bad answers get caught before anyone sees them.

---

## Slide 7 — Grounding & Tools  ·  ~0:18  ·  (→ 2:06)

[SCREEN] "Grounded in real data — never improvised."

> None of this is improvised. Live memory in MongoDB, the real D&D 5e rules via Open5e, 461 official stat blocks, and a lore librarian — an agent used as a tool — that fetches the exact adventure text with provenance, using a manifest router, no vector database.

---

## Slide 8 — State & Persistence  ·  ~0:21  ·  (→ 2:27)

[SCREEN] "Ephemeral by default. Durable by design."

> Cloud Run's memory is ephemeral, so I made it durable. The game world lives in MongoDB; the per-run trace lives in ADK's memory, mirrored back to MongoDB by a persistence plugin. A paused turn survives a restart — your cleric's last four hit points waiting exactly where you left them — and the app stays cloud-agnostic, deployable anywhere.

---

## Slide 9 — The Build  ·  ~0:19  ·  (→ 2:46)

[SCREEN] "100% vibe-coded" (trace panel + dashboard link).

> Every line was vibe-coded — natural-language prompts in Antigravity and Claude Code, scaffolded and tested with the Google Agents CLI. My favorite part: a custom skill that reads ADK's own traces, so the agent debugs itself. And every prompt I wrote is live on a dashboard.

---

## Slide 10 — Live Demo  ·  ~1:35  ·  (→ 4:21)

[SCREEN] Cut to the live app.

> Enough slides — let's play.

[CUE] Run the demo. Narrate lightly over the actions; let the app breathe. Target ~90 seconds:
1. **Start a campaign / build the party** — "First, session zero: name the campaign, pick the party." (~15s)
2. **Combat** — type *"I attack the goblin with my longsword."* "Real dice math, and the HP updates." (~20s)
3. **NPC** — type *"I ask Syndra Silvane what she knows."* "Grounded, in-character — straight from the module." (~20s)
4. **Trace + approval** — "Every turn shows which agent ran and which tools fired. I approve it at the gate." (~20s)
5. **Injection** — type an injection attempt. "And a jailbreak gets blocked at the door." (~10s)

---

## Slide 11 — Roadmap  ·  ~0:13  ·  (→ 4:34)

[SCREEN] "What's next" timeline.

> Build, tests, and deployment are done — two Cloud Run services with Secret Manager and Cloud Trace. Next is speed: lower-latency Gemini, streaming responses, and parallel tool calls.

---

## Slide 12 — Close  ·  ~0:09  ·  (→ 4:43)

[SCREEN] "Five concepts. One adventure."

> Five of the six course concepts, one adventure. Thanks for watching — now go roll some dice.

---

### Pacing checklist
- Total ≈ **4:43** at 150 wpm with a 90-second demo. If you run long, trim the demo first, not the narration.
- Slide 4: the graph animation is your best visual — say less, show more.
- Bookend: you open on "roll initiative," you close on "roll some dice." Hit both.
- Do one timed practice pass before recording.
