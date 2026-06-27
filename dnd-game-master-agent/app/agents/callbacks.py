import re
from typing import Optional
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.tools import BaseTool, ToolContext
from google.genai import types

_INJECTION_PATTERNS = [
    r"ignore\s+(your|previous|all)\s+(instructions|rules|prompts)",
    r"you\s+are\s+now\s+a",
    r"pretend\s+to\s+be",
    r"act\s+as\s+(if\s+you\s+are\s+)?a",
    r"forget\s+(everything|your\s+instructions)",
    r"system\s*prompt",
    r"jailbreak",
]

_OUT_OF_SCOPE_PATTERNS = [
    r"write\s+(me\s+)?(a\s+)?(python|javascript|code|script|program)",
    r"what('s|\s+is)\s+the\s+weather",
    r"(stock|crypto)\s+price",
    r"(translate|summarize)\s+this\s+(article|document|text)",
    r"help\s+me\s+with\s+my\s+(homework|essay|resume)",
]

_INJECTION_REFUSAL = (
    "⚔️ I'm your D&D Game Master — I can only help with in-game actions, "
    "NPC dialogue, and campaign management. Let's get back to the adventure!"
)
_OUT_OF_SCOPE_REFUSAL = (
    "🎲 That's outside the realm of this adventure! I can help you with combat, "
    "NPC conversations, or campaign management. What would you like to do?"
)


def evaluate_input_safety(text: str) -> tuple[bool, str, str]:
    """Pure guardrail check used by both the callback and the workflow node.

    Returns (is_safe, rejection_reason, refusal_message). For safe input the
    reason and message are empty strings.
    """
    user_lower = (text or "").lower()

    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, user_lower):
            return False, "Prompt injection detected", _INJECTION_REFUSAL

    for pattern in _OUT_OF_SCOPE_PATTERNS:
        if re.search(pattern, user_lower):
            return False, "Out-of-scope request", _OUT_OF_SCOPE_REFUSAL

    return True, "", ""


async def guardrail_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Before-model callback: short-circuits with a safe refusal if input is unsafe."""
    user_text = ""
    if llm_request.contents:
        for content in reversed(llm_request.contents):
            if content.role == "user" and content.parts:
                user_text = " ".join(
                    p.text for p in content.parts if hasattr(p, "text") and p.text
                )
                break

    is_safe, reason, refusal = evaluate_input_safety(user_text)
    callback_context.state["is_safe"] = is_safe
    callback_context.state["rejection_reason"] = reason
    if not is_safe:
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part.from_text(text=refusal)],
            )
        )
    return None

async def init_turn_state(callback_context: CallbackContext) -> None:
    """Initialize clean state at the start of every supervisor invocation."""
    callback_context.state["last_agent"] = []
    callback_context.state["tools_fired"] = []
    callback_context.state["intent"] = ""
    callback_context.state["eval_feedback"] = ""
    callback_context.state["player_rejected"] = False
    if "campaign_id" not in callback_context.state:
        callback_context.state["campaign_id"] = "default-campaign"

    # Capture the player's message so the specialist instruction templates can
    # resolve {last_player_action}. Without this the very first delegation fails
    # with `KeyError: Context variable not found: last_player_action`.
    player_text = ""
    user_content = callback_context.user_content
    if user_content and user_content.parts:
        player_text = " ".join(
            p.text for p in user_content.parts if getattr(p, "text", None)
        ).strip()
    callback_context.state["last_player_action"] = player_text

def make_track_agent_callback(agent_name: str):
    """Factory: creates a before_agent_callback that tracks agent name and resets tools."""
    async def _track(callback_context: CallbackContext) -> None:
        agents = callback_context.state.get("last_agent", [])
        agents.append(agent_name)
        callback_context.state["last_agent"] = agents
        callback_context.state["tools_fired"] = []
    return _track

async def track_tool_callback(
    tool: BaseTool, args: dict, tool_context: ToolContext, tool_response: dict
) -> Optional[dict]:
    """After-tool callback: appends the tool name to state.tools_fired."""
    fired = tool_context.state.get("tools_fired", [])
    fired.append(tool.name)
    tool_context.state["tools_fired"] = fired
    return None
