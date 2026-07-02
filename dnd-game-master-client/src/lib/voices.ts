// Prebuilt Gemini Live voice names grouped by the gender they read best as.
// A voice is assigned to an NPC (by speaker name) the first time they speak and
// then reused for the rest of the session, so a character keeps one voice across
// turns. The assignment is persisted in sessionStorage (a single tab-scoped
// "global" store) and mirrored in a module map for fast lookups.

const MALE_VOICES = [
  "Puck",
  "Charon",
  "Fenrir",
  "Orus",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Rasalgethi",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Achird",
  "Zubenelgenubi",
  "Sadachbia",
  "Sadaltager",
];

const FEMALE_VOICES = [
  "Zephyr",
  "Kore",
  "Leda",
  "Aoede",
  "Callirrhoe",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Laomedeia",
  "Achernar",
  "Pulcherrima",
  "Vindemiatrix",
  "Sulafat",
];

const STORAGE_KEY = "npc-voices";

// speaker → assigned voice_name. Loaded once from sessionStorage.
const assigned = new Map<string, string>();
let loaded = false;

function loadStore() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      for (const [speaker, voice] of Object.entries(
        JSON.parse(raw) as Record<string, string>,
      )) {
        assigned.set(speaker, voice);
      }
    }
  } catch {
    /* ignore corrupt/unavailable storage */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(assigned)),
    );
  } catch {
    /* ignore quota/unavailable storage */
  }
}

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Resolve the voice_name for an NPC. Returns the same voice for the same speaker
 * across turns; assigns a random gender-appropriate voice on first encounter.
 */
export function resolveVoiceName(speaker?: string, gender?: string): string {
  loadStore();
  const key = speaker?.trim() || "unknown";
  const existing = assigned.get(key);
  if (existing) return existing;

  const g = (gender ?? "").trim().toLowerCase();
  const isFemale = g.startsWith("f") || g.startsWith("w"); // female / woman
  const voice = pickRandom(isFemale ? FEMALE_VOICES : MALE_VOICES);

  assigned.set(key, voice);
  persist();
  return voice;
}
