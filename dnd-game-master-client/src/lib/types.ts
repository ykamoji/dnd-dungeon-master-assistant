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
  skills?: string[]; // Array of selected skills
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
  gender?: string;
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
  /** Proficient skills — optional; rendered when the backend supplies them. */
  skills?: string[];
}

/** The party's mechanical state, keyed by character name. */
export interface PartyState {
  characters: Record<string, CharacterState>;
}

/** The party's state */
export interface PartyBreakDown {
  level: number;
  perception: number;
  health: number;
  money: number;
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
  invocation_id?: string;
}

/** One turn snapshot in a campaign's history. */
export interface TurnSnapshot {
  scene?: string | null;
  description?: string | null;
  narrative?: string | null;
  npc_name?: string | null;
  dialogue?: DialogueLine[] | null;
  party?: PartyState | null;
  party_breakdown?: PartyBreakDown | null;
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
// Session events streamed from GET /ambient/sessions/{id}/stream (SSE).
// Mirrors the backend SessionEvent pydantic model (snake_case).
// ---------------------------------------------------------------------------

export interface SessionFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface SessionFunctionResponse {
  name: string;
  response: unknown;
}

export interface SessionPart {
  text?: any;
  thought?: boolean;
  function_call?: SessionFunctionCall;
  function_response?: SessionFunctionResponse;
}

export interface SessionContent {
  parts: SessionPart[];
}

/** Open record: `tools_fired` plus any extra state keys (intent, turn_count…). */
export type SessionStateDelta = Record<string, unknown> & {
  tools_fired?: unknown;
};

export interface SessionActions {
  state_delta?: SessionStateDelta;
  end_of_agent?: boolean;
}

/** One streamed session event (one `data:` frame from the SSE endpoint). */
export interface SessionEvent {
  id: string;
  invocation_id: string;
  timestamp: number;
  author: string;
  content?: SessionContent | null;
  actions?: SessionActions | null;
}
