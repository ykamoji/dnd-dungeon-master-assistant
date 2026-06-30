"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { SectionShell } from "@/components/ui/SectionShell";
import { useGame } from "@/context/GameContext";
import { GAME_CATALOG } from "@/lib/games";

/** New-campaign step 1: pick an adventure. Only ToA is playable. */
export function CampaignSelectView() {
  const { dispatch } = useGame();
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <SectionShell>
      <div className="mb-8 text-center">
        <h2 className="text-gilded font-display text-3xl font-bold tracking-wide sm:text-4xl">
          Choose Your Adventure
        </h2>
        <p className="mt-3 font-rune text-parchment-dim">
          Select a published campaign to embark upon.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CATALOG.map((game) => (
          <Card
            key={game.id}
            title={game.title}
            description={game.blurb}
            imageUrl={game.coverUrl}
            badge={game.available ? undefined : "Coming Soon"}
            disabled={!game.available}
            onClick={() =>
              game.available
                ? dispatch({ type: "SELECT_GAME", gameId: game.id })
                : setComingSoon(game.title)
            }
          />
        ))}
      </div>

      <Modal
        open={comingSoon !== null}
        title="Not Yet Unsealed"
        onClose={() => setComingSoon(null)}
      >
        <p>
          <span className="text-gold-bright">{comingSoon}</span> is still being
          prepared by the Game Master. For now, only{" "}
          <span className="text-gold-bright">Tomb of Annihilation</span> is ready
          to play.
        </p>
      </Modal>
    </SectionShell>
  );
}
