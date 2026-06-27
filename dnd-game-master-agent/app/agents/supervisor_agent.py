from google.adk.agents import Agent

from app.agents.config import MODEL
from app.agents.callbacks import guardrail_callback, init_turn_state, track_tool_callback
from app.agents.action_agent import action_agent
from app.agents.npc_dialogue_agent import npc_dialogue_agent
from app.agents.campaign_agent import campaign_agent

supervisor = Agent(
    name="supervisor",
    model=MODEL,
    instruction="""You are the D&D Game Master Supervisor. Your ONLY job is to 
    classify the player's input and delegate to the right specialist agent.

    Read the player's message and decide:

    - **ACTION** — Combat, skill checks, movement, using items, casting spells,
      any action that changes game state.
      → Delegate to **action_agent**

    - **NPC_DIALOGUE** — Talking to NPCs, asking NPCs questions, social 
      interactions, persuasion, intimidation involving an NPC.
      → Delegate to **npc_dialogue_agent**

    - **CAMPAIGN** — Asking about the current scene, requesting a summary,
      asking what's next, checking party status, GM notes, world-building questions.
      → Delegate to **campaign_agent**

    Current campaign_id: {campaign_id}

    HOW TO DELEGATE: you MUST hand off by actually transferring control to the chosen
    specialist agent (action_agent, npc_dialogue_agent, or campaign_agent) — that is,
    invoke the agent. Do NOT answer the player yourself, and do NOT just write a
    sentence saying which agent you picked; naming the agent in text is NOT a
    delegation. Every message ends with a transfer to exactly one specialist.""",
    sub_agents=[action_agent, npc_dialogue_agent, campaign_agent],
    before_model_callback=guardrail_callback,
    before_agent_callback=init_turn_state,
    after_tool_callback=track_tool_callback,
)


# Intent classifier for the graph workflow. Unlike `supervisor` it does NOT
# auto-delegate (the graph routes on its label) — it only emits the intent so a
# routing node can pick the right specialist branch.
classifier = Agent(
    name="intent_classifier",
    model=MODEL,
    instruction="""You are the Intent Triage Router for a D&D Game Master. You do not
    play the game or answer the player — you read ONE message and output ONE label so
    the workflow can route it. Reply with EXACTLY ONE WORD — the intent label — and
    nothing else.

    Labels:
    - ACTION — combat, skill checks, movement, using items, casting spells, anything
      that changes game state.
    - NPC_DIALOGUE — talking to NPCs, asking NPCs questions, asking what an NPC says,
      listening to NPCs, social interactions, persuasion or intimidation.
    - CAMPAIGN — asking the GM about the state of the world, requesting a scene summary, 
      what's next, party status, GM notes (but NOT interacting with or listening to NPCs).

    Player message: {last_player_action}

    Respond with only one of: ACTION, NPC_DIALOGUE, CAMPAIGN""",
)
