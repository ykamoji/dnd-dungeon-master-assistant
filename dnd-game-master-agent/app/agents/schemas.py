from pydantic import BaseModel, Field

class CombatEntry(BaseModel):
    """A single line in a combat log (one attack, one spell, etc.)."""
    action: str = Field(description="The action taken (e.g., 'Longsword Attack')")
    target: str = Field(default="", description="Who/what was targeted")
    roll: str = Field(default="", description="Dice notation and result (e.g., '1d20+5 = 18')")
    result: str = Field(default="", description="Outcome (e.g., 'Hit! 8 slashing damage')")

class DialogueLine(BaseModel):
    """A single line of NPC dialogue."""
    speaker: str = Field(description="Name of the NPC speaking")
    text: str = Field(description="What the NPC says")
    emotion: str = Field(default="neutral", description="Emotional tone (e.g., 'angry', 'fearful')")

class CharacterUpdate(BaseModel):
    """One character's mechanical state, for persistence to campaign state.

    Modeled as a flat list entry (with `name`) rather than a map so it round-trips
    cleanly through model structured-output, which handles lists of objects more
    reliably than open-ended dictionaries.
    """
    name: str = Field(description="Character name")
    hp: int = Field(description="Current hit points")
    max_hp: int = Field(description="Maximum hit points")
    conditions: list[str] = Field(default_factory=list, description="Active status conditions")

class GMResponse(BaseModel):
    """Unified output schema for the UI renderer.

    The UI reads `intent` to decide which fields to render.
    All fields have defaults so only the relevant ones need to be populated.
    """
    intent: str = Field(description="ACTION | NPC_DIALOGUE | CAMPAIGN")
    narrative: str = Field(description="Main narrative text for the player")
    # ACTION fields
    combat_log: list[CombatEntry] = Field(default_factory=list, description="Combat log entries")
    math_breakdown: str = Field(default="", description="Detailed math for rolls/checks")
    # NPC_DIALOGUE fields
    npc_name: str = Field(default="", description="Name of the NPC in dialogue")
    dialogue: list[DialogueLine] = Field(default_factory=list, description="Dialogue lines")
    # CAMPAIGN fields
    chapter: str = Field(default="", description="The current chapter of the adventure")
    section: str = Field(default="", description="The current section or location name")
    scene_summary: str = Field(default="", description="Summary of the current scene")
    gm_notes: str = Field(default="", description="Private GM notes")
    next_scene_suggestions: list[str] = Field(default_factory=list, description="Suggested next scenes")
    asset_urls: list[str] = Field(default_factory=list, description="Image URLs for the current scene")
    # Persistable campaign state — fill ONLY when known. An empty list / null
    # means "unchanged this turn"; the persistence layer carries the previous
    # value forward rather than blanking it. Do not invent values you don't have.
    progress: float | None = Field(default=None, description="Campaign completion percent (0-100), only if it advanced")
    initiative: list[str] = Field(default_factory=list, description="Turn order of combatants, if in/entering combat")
    party: list[CharacterUpdate] = Field(default_factory=list, description="Per-character mechanical state after this turn")
    # Common
    suggested_actions: list[str] = Field(default_factory=list, description="2-3 choices for the player")
    requires_roll: bool = Field(default=False, description="Whether the next action needs a dice roll")
    last_agent: list[str] = Field(default_factory=list, description="Observability: agents that ran")
    tools_fired: list[str] = Field(default_factory=list, description="Observability: tools that fired")
