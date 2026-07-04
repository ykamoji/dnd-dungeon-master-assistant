from pydantic import BaseModel, ConfigDict, Field

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
    gender: str = Field(default="", description="Gender of the NPC speaking")

class CharacterUpdate(BaseModel):
    """One character's mechanical state, for persistence to campaign state.

    Modeled as a flat list entry (with `name`) rather than a map so it round-trips
    cleanly through model structured-output, which handles lists of objects more
    reliably than open-ended dictionaries.
    """
    # `class` is a Python keyword, so the attribute is `class_` with the JSON key
    # pinned to "class" via alias; populate_by_name lets us also build it as class_=.
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(description="Character name")
    role: str = Field(default="", description="The character's party role (e.g., 'Tank', 'Healer', 'Striker', 'Controller')")
    class_: str = Field(default="", alias="class", description="The character's D&D class (e.g., 'Wizard', 'Fighter', 'Cleric')")
    hp: int = Field(description="Current hit points")
    max_hp: int = Field(description="Maximum hit points")
    skills: list[str] = Field(default_factory=list, description="Skills that the character is proficient in")
    conditions: list[str] = Field(default_factory=list, description="Active status conditions")
    armors: list[str] = Field(default_factory=list, description="Armor equipped/owned AFTER this turn; include only when known/changed, never invent")
    spells: list[str] = Field(default_factory=list, description="Spells prepared/known AFTER this turn; include only when known/changed, never invent")
    weapons: list[str] = Field(default_factory=list, description="Weapons carried AFTER this turn; include only when known/changed, never invent")
    magicitems: list[str] = Field(default_factory=list, description="Magic items possessed AFTER this turn; include only when known/changed, never invent")

class PartyBreakDown(BaseModel):
    level: int = Field(description="Total level of all members")
    perception: int = Field(description="Highest passive perception in the party")
    health: int = Field(description="Combined current health of all members")
    money: int = Field(default=0, description="Total money in gold pieces shared by the party")
    

class Assets(BaseModel):
    """
    Image assets that match the current scene.
    """
    URL: str = Field(description="URL of the asset (e.g., '004-0201.webp')")
    description: str = Field(description="Description of the asset (e.g., 'Chapter 1: Port Nyanzaru')")
    

class StoryResult(BaseModel):
    """Structured lookup result returned by story_agent to the calling agents.

    story_agent answers a lore question about the Tomb of Annihilation module.
    `content` is the rich GM-style excerpt; the other fields make the provenance
    and art machine-readable for the caller.
    """
    found: bool = Field(default=False, description="True if a matching module entry was located; False if nothing in the indexes matched the question")
    chapter: str = Field(default="", description="Chapter this content belongs to (e.g., 'Ch 1 Port Nyanzaru')")
    section: str = Field(default="", description="Section/location/scene name within the chapter (e.g., 'Arrival')")
    source_path: str = Field(default="", description="Repo path of the markdown file the content was drawn from, for citation")
    content: str = Field(default="", description="Rich, detailed narrative excerpt synthesized from the module, written like a true D&D Game Master")
    assets: list[Assets] = Field(default_factory=list, description="List of asset file and description for every matching chapter, map, scene, NPC")


class CommonResult(BaseModel):
    """Common structured output fields shared by all specialist agents."""
    narrative: str = Field(description="Vivid description of what happened when the action resolved")
    scene_summary: str = Field(default="", description="Short, evocative summary/title of the current location and situation")
    chapter: str = Field(default="", description="Current chapter name, taken from story_agent")
    section: str = Field(default="", description="Current section/location name, taken from story_agent")
    gm_notes: str = Field(default="", description="Private GM notes: key NPCs present, threats, opportunities")
    assets: list[Assets] = Field(default_factory=list, description="List of asset file and description for every matching chapter, map, scene, NPC")
    suggested_actions: list[str] = Field(default_factory=list, description="2-3 concrete next moves the player can choose from")
    next_scene_suggestions: list[str] = Field(default_factory=list, description="2-3 suggested next scenes or story directions")


class SetupResult(CommonResult):
    """Structured output of the setup_executor (first-turn campaign/party init).

    Produced once, before the game loop starts. The setup_executor parses the
    campaign name and party from the player's opening message and derives each
    member's starting HP / loadout from their class. `ready` gates persistence:
    when False the turn is rejected and the player is told what's missing.
    """
    campaign_name: str = Field(default="", description="Campaign/adventure name from the player's message")
    ready: bool = Field(default=False, description="True ONLY when a campaign name AND every party member's name, role, and class are present")
    message: str = Field(default="", description="If not ready: exactly what the player must still provide. If ready: a short confirmation that the adventure can begin")
    progress: float | None = Field(default=None, description="Campaign completion percent (0-100); set ONLY if the campaign measurably advanced this turn, else null")
    party: list[CharacterUpdate] = Field(default_factory=list, description="Per-character HP/conditions AFTER this action; include only characters whose state is known. NEVER invent hp/max_hp")
    party_breakdown: PartyBreakDown | None = Field(default=None, description="Breakdown of the party's current state")



class ActionResult(CommonResult):
    """Structured output of the action_executor (combat & rules resolution)."""
    combat_log: list[CombatEntry] = Field(default_factory=list, description="One entry per attack/spell/check resolved this turn")
    math_breakdown: str = Field(default="", description="Explicit dice math: AC, attack rolls, modifiers, damage, saving throws")
    requires_roll: bool = Field(default=False, description="True if the next suggested action likely needs a dice roll")
    party: list[CharacterUpdate] = Field(default_factory=list, description="Per-character HP/conditions AFTER this action; include only characters whose state is known. NEVER invent hp/max_hp")
    party_breakdown: PartyBreakDown | None = Field(default=None, description="Breakdown of the party's current state")


class NpcResult(CommonResult):
    """Structured output of the npc_executor (in-character NPC dialogue)."""
    npc_name: str = Field(default="", description="Name of the NPC speaking")
    dialogue: list[DialogueLine] = Field(default_factory=list, description="Ordered in-character lines, each with speaker, text, and emotion")


class CampaignResult(CommonResult):
    """Structured output of the campaign_executor (scene/state management)."""
    progress: float | None = Field(default=None, description="Campaign completion percent (0-100); set ONLY if the campaign measurably advanced this turn, else null")
