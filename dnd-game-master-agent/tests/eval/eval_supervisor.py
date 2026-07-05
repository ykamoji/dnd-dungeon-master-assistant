import asyncio
import time
import pytest
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from app.agents.supervisor_agent import classifier

# 15 test cases, 5 for each intent
TEST_CASES = [
    # ACTION (changes game, party, or character state)
    ("I draw my sword and attack the approaching goblin.", "ACTION"),
    ("I try to sneak past the sleeping guards without making a sound.", "ACTION"),
    ("I cast Fireball centered on the group of orcs.", "ACTION"),
    ("I drink my potion of healing.", "ACTION"),
    ("I use my thieves' tools to pick the lock on the heavy iron door.", "ACTION"),
    
    # NPC_DIALOGUE (talking, asking, social interaction)
    ("What do you know about the Soulmonger, Syndra?", "NPC_DIALOGUE"),
    ("I glare at the merchant and try to intimidate him into lowering the price.", "NPC_DIALOGUE"),
    ("Bartender, what rumors have you heard lately around Port Nyanzaru?", "NPC_DIALOGUE"),
    ("Please, good sir, we mean no harm. Can you let us pass?", "NPC_DIALOGUE"),
    ("I ask Wakanga O'tamu if he has any magical items for sale.", "NPC_DIALOGUE"),
    
    # CAMPAIGN (game state, world info, party status, scene summary)
    ("What time of day is it currently?", "CAMPAIGN"),
    ("Can you give me a quick summary of what happened last session?", "CAMPAIGN"),
    ("Who is currently in our party and what are their HP levels?", "CAMPAIGN"),
    ("What are the suggested next actions for us right now?", "CAMPAIGN"),
    ("Describe the layout of this ancient temple room again.", "CAMPAIGN"),

    # User's edge case
    ("Attempting to speak with a key merchant or local authority figure to gather rumors.", "CAMPAIGN"),
    ("Inspect Ekene-Afa's wares for hidden clues.", "NPC_DIALOGUE"),

    # Ambiguous / Boundary Test Cases
    ("I want to spend a few hours investigating the lower city for thieves' guild activity.", "CAMPAIGN"),
    ("I examine the shopkeeper's ledger for irregularities.", "NPC_DIALOGUE"),
    ("I ask the town guard about the recent murders.", "NPC_DIALOGUE"),
    ("I throw a rock at the mysterious stranger to get his attention.", "ACTION"),
    ("We set up camp and take a long rest.", "CAMPAIGN")
]

RATE_LIMIT_DELAY = 4.5  # Gemini free tier is 15 RPM
_tests_run = 0

@pytest.fixture(autouse=True)
def rate_limit_delay():
    """Space agent tests apart to respect Gemini free-tier limits (15 RPM)."""
    global _tests_run
    if _tests_run:
        time.sleep(RATE_LIMIT_DELAY)
    _tests_run += 1
    yield


@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected", TEST_CASES)
async def test_supervisor_classification(query, expected):
    """Test that the supervisor correctly classifies the user query."""
    session_service = InMemorySessionService()
    runner = Runner(agent=classifier, app_name="app", session_service=session_service)
    
    # We use a hash of the query for the session ID to avoid overlap
    session_id = f"eval_classifier_{hash(query)}"
    
    # Classifier uses {last_player_action} from the state
    initial_state = {
        "last_player_action": query
    }
    await session_service.create_session(app_name="app", user_id="test", session_id=session_id, state=initial_state)
    
    new_message = types.Content(role="user", parts=[types.Part.from_text(text=query)])
    
    result = None
    async for event in runner.run_async(user_id="test", session_id=session_id, new_message=new_message):
        if event.author == "intent_classifier" and event.content and event.content.parts:
            text = event.content.parts[0].text
            if text:
                result = text.strip().upper()
                # Extract just the label if the model was chatty
                for label in ["ACTION", "NPC_DIALOGUE", "CAMPAIGN"]:
                    if label in result:
                        result = label
                        break
                        
    assert result == expected, f"Query: '{query}' -> Expected {expected}, got {result}"
