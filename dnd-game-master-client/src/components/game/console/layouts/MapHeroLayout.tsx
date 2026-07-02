"use client";

import { JourneyMapPanel } from "../panels/JourneyMapPanel";
import { SceneReaderPanel } from "../panels/SceneReaderPanel";
import { GameMasterPanel } from "../panels/GameMasterPanel";

/** Map as the board (hero) · scene reader as a side drawer · GM bottom bar. */
export function MapHeroLayout() {
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_18rem] gap-4">
      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_50rem]">
        <div className="parchment min-h-0 rounded-card border border-stone-2 p-4">
          <JourneyMapPanel orientation="hero" />
        </div>
        <div className="parchment min-h-0 rounded-card border border-stone-2 p-5">
          <SceneReaderPanel />
        </div>
      </div>
      <div className="parchment min-h-0 rounded-card border border-stone-2 p-4">
        <GameMasterPanel />
      </div>
    </div>
  );
}
