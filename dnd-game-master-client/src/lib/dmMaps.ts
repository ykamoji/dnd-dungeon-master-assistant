/**
 * DM-facing Area Maps for Tomb of Annihilation.
 *
 * Mirrors the "Area Maps (DM)" table in
 * `assets/Tomb-of-Annihilation/ASSETS.md`. Each entry stores the bare file name;
 * the full image URL is `TOA_ASSET_BASE + file` (the 5etools GitHub mirror).
 */

/** 5etools mirror base for ToA assets. Whole URL = base + file name. */
export const TOA_ASSET_BASE =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/ToA/";

/** Build the full asset URL from a bare ASSETS.md file name. */
export function toaAssetUrl(file: string): string {
  return `${TOA_ASSET_BASE}${file}`;
}

export interface DmMap {
  /** Bare file name from ASSETS.md (URL column). */
  file: string;
  /** Human description shown in the dropdown (Description column). */
  label: string;
}

/** Area Maps (DM) — detailed maps with DM secrets, in adventure page order. */
export const DM_AREA_MAPS: DmMap[] = [
  { file: "005-0202.webp", label: "Map 1.1: Port Nyanzaru" },
  { file: "014-0210.webp", label: "Map 1.2: Merchant Prince's Villa" },
  { file: "018-0302.webp", label: "Map 2.1: Chult" },
  { file: "019-0303.webp", label: "Map 2.2: Ataaz Muhahah" },
  { file: "021-0305.webp", label: "Map 2.3: Camp Righteous" },
  { file: "023-0306.webp", label: "Map 2.4: Camp Vengeance" },
  { file: "025-0307.webp", label: "Map 2.5: Dungrunglung" },
  { file: "027-0308.webp", label: "Map 2.6: Firefinger" },
  { file: "029-0309.webp", label: "Map 2.7: Fort Beluarian" },
  { file: "032-0312.webp", label: "Map 2.8: Heart of Ubtao" },
  { file: "034-0313.webp", label: "Map 2.9: Hrakhamar" },
  { file: "037-0315.webp", label: "Map 2.10: Jahaka Anchorage" },
  { file: "040-0317.webp", label: "Map 2.11: Kir Sabal" },
  { file: "043-0319.webp", label: "Map 2.12: Nangalore" },
  { file: "045-0320.webp", label: "Map 2.13: Wreck of the Star Goddess" },
  { file: "046-0321.webp", label: "Map 2.14: Wyrmheart Mine" },
  { file: "049-0323.webp", label: "Map 2.15: Yellyark" },
  { file: "053-304.webp", label: "Map 3.1: Omu" },
  { file: "056-305.webp", label: "Map 3.2: Nine Shrines of Omu" },
  { file: "061-402.webp", label: "Map 4.1: Fane of the Night Serpent" },
  { file: "066-505.webp", label: "Map 5.1: Rotten Halls" },
  { file: "069-506.webp", label: "Map 5.2: Dungeon of Deception" },
  { file: "074-509.webp", label: "Map 5.3: Vault of Reflection" },
  { file: "077-512.webp", label: "Map 5.4: Chambers of Horror" },
  { file: "082-515.webp", label: "Map 5.5: Gears of Hate" },
  { file: "086-520.webp", label: "Map 5.6: Cradle of the Death God" },
];
