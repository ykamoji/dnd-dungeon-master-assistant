import type { ComponentType } from "react";
import { SceneCenterLayout } from "./SceneCenterLayout";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { MapHeroLayout } from "./MapHeroLayout";

export interface ConsoleLayout {
  id: string;
  label: string;
  Component: ComponentType;
}

/**
 * Registry of console layouts. Every layout arranges the SAME three feature
 * panels (journey map, scene reader, Game Master), so switching never changes
 * what the GM can do. Add a new layout by appending one entry here.
 */
export const LAYOUTS: ConsoleLayout[] = [
  { id: "scene-center", label: "Scene + Dock", Component: SceneCenterLayout },
  { id: "three-column", label: "Three Columns", Component: ThreeColumnLayout },
  { id: "map-hero", label: "Map Board", Component: MapHeroLayout },
];

export const DEFAULT_LAYOUT_ID = LAYOUTS[0].id;

export function getLayout(id: string): ConsoleLayout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
