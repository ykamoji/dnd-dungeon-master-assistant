"use client";

import { JourneyMapPanel } from "../panels/JourneyMapPanel";
import { SceneReaderPanel } from "../panels/SceneReaderPanel";
import { GameMasterPanel } from "../panels/GameMasterPanel";

/** Journey rail (left) · scene reader (center) · GM command dock (below). */
export function SceneCenterLayout() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="parchment hidden min-h-0 rounded-card border border-stone-2 p-3 lg:block">
        <JourneyMapPanel orientation="vertical" />
      </aside>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_20rem] gap-4">
        <div className="parchment min-h-0 rounded-card border border-stone-2 p-5">
          <SceneReaderPanel />
        </div>
        <div className="parchment min-h-0 rounded-card border border-stone-2 p-4">
          <GameMasterPanel />
        </div>
      </div>
    </div>
  );
}
