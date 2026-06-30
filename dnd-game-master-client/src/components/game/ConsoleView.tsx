"use client";

import { ConsoleHost } from "./console/ConsoleHost";

/**
 * The game console — the screen where play happens. The 3-panel, layout-swappable
 * experience lives under `./console`; this view simply mounts the host.
 */
export function ConsoleView() {
  return <ConsoleHost />;
}
