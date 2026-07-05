// Static catalogs: the selectable campaigns and the "best party" preset.
// Cover art uses local placeholders + the 5etools mirror the backend already
// references; swap in real art by changing coverUrl.

import type { GameCatalogEntry, PartyMember } from "./types";

const TOA_MIRROR =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/ToA";

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: "princes-of-the-apocalypse",
    title: "Princes of the Apocalypse",
    blurb:
      "A terrible threat gathers in the North. Throughout this region of the Forgotten Realms, savage marauders bring destruction.",
    coverUrl: "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/PotA/000-poa01-01.webp",
    available: false,
  },
  {
    id: "tomb-of-annihilation",
    title: "Tomb of Annihilation",
    blurb:
      "A death curse withers the resurrected. Brave the jungles of Chult to find its source in the Tomb of the Nine Gods.",
    coverUrl: `${TOA_MIRROR}/004-0201.webp`,
    available: true,
  },
  {
    id: "hoard-of-the-dragon-queen",
    title: "Hoard of the Dragon Queen",
    blurb:
      "The Cult of the Dragon has been active in Faerûn for centuries. It has focused on making undead dragons to fulfill a prophecy most of that time, but that's changing.",
    coverUrl: "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/HotDQ/006-tod-01-01.webp",
    available: false,
  },
];

/** Hard-coded recommended party (spec 4.2.6). Roles are preset labels. */
export const PRELOAD_PARTY: Omit<PartyMember, "id">[] = [
  { name: "David", className: "Ranger", role: "The Navigator" },
  { name: "Vanessa", className: "Rogue", role: "The Trap Breaker" },
  { name: "Blake", className: "Paladin", role: "The Anchor" },
  { name: "Catherine", className: "Cleric", role: "The Healer" },
  { name: "Marina", className: "Wizard", role: "The Utility" },
];

/** Landing-page slideshow stills (placeholders + ToA mirror art). */
export const LANDING_STILLS: { src: string; alt: string }[] = [
  { src: `landing/bg_1.png`, alt: "bg_1" },
  { src: `landing/bg_4.png`, alt: "bg_4" },
  { src: `landing/bg_2.png`, alt: "bg_2" },
  { src: `landing/bg_3.png`, alt: "bg_3" },
];
