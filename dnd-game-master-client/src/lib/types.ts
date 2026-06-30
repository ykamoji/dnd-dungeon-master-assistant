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
