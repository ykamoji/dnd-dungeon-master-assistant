// Shared types for the D&D Game Master client.

/** One subclass/archetype of a class — used as a selectable party "role". */
export interface Archetype {
  name: string;
  slug: string;
  desc: string;
}

/** A class "DNA profile" returned by GET /tools/classes. */
export interface ClassProfile {
  name: string;
  slug: string;
  desc: string;
  hit_dice: string;
  hp_at_1st_level: string;
  prof_armor: string;
  prof_weapons: string;
  prof_saving_throws: string;
  prof_skills: string;
  spellcasting_ability: string;
  subtypes_name: string;
  archetypes: Archetype[];
}

/** A saved-campaign summary returned by GET /campaigns. */
export interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  summary?: string | null;
  progress?: number | null;
  updated_at?: string | null;
  scene?: string;
  cover_url?: string | null;
}

/** A single party member assembled in the party-selection view. */
export interface PartyMember {
  id: string;
  name: string;
  className: string; // D&D class (e.g. "Ranger")
  role: string; // archetype name, or a preset label like "The Navigator"
}

/** An entry in the campaign catalog shown in the campaign-select view. */
export interface GameCatalogEntry {
  id: string;
  title: string;
  blurb: string;
  coverUrl: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Campaign state (returned by GET /campaign/{id}[?include_history=true]).
// One TurnSnapshot per turn; the durable game state lives in MongoDB.
// ---------------------------------------------------------------------------

/** A line of NPC dialogue within a turn. */
export interface DialogueLine {
  speaker: string;
  text: string;
  emotion: string;
}

/** A single combat-log entry within a turn's metadata. */
export interface CombatEntry {
  action: string;
  target: string;
  roll: string;
  result: string;
}

export interface Assets {
  URL: string;
  description: string;
}

/** Mechanical state of one character at a given turn. */
export interface CharacterState {
  role: string;
  /** D&D class — serialized under the JSON key "class". */
  class: string;
  hp: number;
  max_hp: number;
  conditions: string[];
  armors: string[];
  spells: string[];
  weapons: string[];
  magicitems: string[];
}

/** The party's mechanical state, keyed by character name. */
export interface PartyState {
  characters: Record<string, CharacterState>;
}

/** Scene metadata for a turn (the GM-facing extras). */
export interface CampaignMetadata {
  chapter?: string | null;
  section?: string | null;
  assets?: Assets[] | null;
  gm_notes?: string | null;
  next_scene_suggestions?: string[];
  suggested_actions?: string[];
  combat_log?: CombatEntry[];
  math_breakdown?: string | null;
  requires_roll?: boolean;
}

/** One turn snapshot in a campaign's history. */
export interface TurnSnapshot {
  scene?: string | null;
  description?: string | null;
  narrative?: string | null;
  npc_name?: string | null;
  dialogue?: DialogueLine[] | null;
  initiative?: string[] | null;
  party?: PartyState | null;
  metadata?: CampaignMetadata | null;
  intent?: string | null;
  created_dt?: string;
}

/** The full campaign document. `state` carries 1 (latest) or N (history) turns. */
export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  summary?: string | null;
  progress?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
  state: TurnSnapshot[];
}

// ---------------------------------------------------------------------------
// ADK run events (from the session events API / run endpoints).
// ADK serializes with camelCase aliases (functionCall, longRunningToolIds…);
// snake_case variants are kept as a fallback so either form parses.
// ---------------------------------------------------------------------------

interface FnPart {
  id?: string;
  name?: string;
  args?: unknown;
  response?: unknown;
}

/** A single part of an event's content (text, function call, etc.). */
export interface EventPart {
  text?: string;
  thought?: boolean;
  functionCall?: FnPart;
  functionResponse?: FnPart;
  function_call?: FnPart;
  function_response?: FnPart;
}

/** A raw ADK event from the session events API. */
export interface RunEvent {
  id?: string;
  author?: string;
  timestamp?: number;
  content?: { role?: string; parts?: EventPart[] } | null;
  actions?: {
    stateDelta?: Record<string, unknown>;
    state_delta?: Record<string, unknown>;
  } | null;
  longRunningToolIds?: string[] | null;
  long_running_tool_ids?: string[] | null;
}

/** A humanized step in the trace stream, with the raw event kept for the toggle. */
export interface TraceStep {
  id: string;
  icon: string;
  label: string;
  raw: RunEvent;
}
