"use client";

import { JourneyMapPanel } from "../panels/JourneyMapPanel";
import { SceneReaderPanel } from "../panels/SceneReaderPanel";
import { GameMasterPanel } from "../panels/GameMasterPanel";

/** Classic VTT split: journey · scene reader · Dungeon Master rail. */
export function ThreeColumnLayout() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_24rem]">
      <aside className="parchment min-h-0 rounded-card border border-stone-2 p-3">
        <JourneyMapPanel orientation="vertical" />
      </aside>
      <div className="parchment min-h-0 rounded-card border border-stone-2 p-5">
        <SceneReaderPanel />
      </div>
      <aside className="parchment min-h-0 rounded-card border border-stone-2 p-4">
        <GameMasterPanel orientation="vertical" />
      </aside>
    </div>
  );
}
