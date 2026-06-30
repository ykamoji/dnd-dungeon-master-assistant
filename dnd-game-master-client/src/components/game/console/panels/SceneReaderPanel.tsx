"use client";

import { type ReactNode, useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useConsole } from "../ConsoleProvider";
import { intentMeta } from "../snapshot";
import { AssetGallery } from "../parts/AssetGallery";
import { PartyStatGrid } from "../parts/PartyStatGrid";
import { TraceStream } from "../parts/TraceStream";
import type { CombatEntry, DialogueLine, TraceStep } from "@/lib/types";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-gold">
      {children}
    </p>
  );
}

function DialogueBlock({ lines }: { lines: DialogueLine[] }) {
  return (
    <div className="space-y-2">
      {lines.map((d, i) => (
        <p key={i} className="font-body text-parchment">
          <span className="font-display text-sm text-gold-bright">{d.speaker}</span>
          {d.emotion && (
            <span className="font-rune text-xs text-parchment-dim"> ({d.emotion})</span>
          )}
          <span className="text-parchment-dim">: </span>
          <span className="italic">“{d.text}”</span>
        </p>
      ))}
    </div>
  );
}

function CombatTable({ log }: { log: CombatEntry[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left font-display text-[10px] uppercase tracking-widest text-gold">
          <th className="py-1 pr-2">Action</th>
          <th className="py-1 pr-2">Target</th>
          <th className="py-1 pr-2">Roll</th>
          <th className="py-1">Result</th>
        </tr>
      </thead>
      <tbody>
        {log.map((e, i) => (
          <tr key={i} className="border-t border-stone-2 text-parchment">
            <td className="py-1 pr-2">{e.action}</td>
            <td className="py-1 pr-2 text-parchment-dim">{e.target}</td>
            <td className="py-1 pr-2 text-parchment-dim">{e.roll}</td>
            <td className="py-1">{e.result}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SuggestionChips({
  title,
  items,
  onPick,
}: {
  title: string;
  items: string[];
  onPick: (text: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {items.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-gold/30 bg-obsidian-2 px-3 py-1 text-left text-sm text-parchment transition-colors hover:border-gold hover:text-gold-bright"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The in-flight turn: the live trace while the Dungeon Master works, and the
 * draft once it pauses for approval. Shown in the reader so the GM watches the
 * scene take shape where the result will appear (req 1, req 5).
 */
function PendingView({
  trace,
  awaiting,
  draft,
}: {
  trace: TraceStep[];
  awaiting: boolean;
  draft: string | null;
}) {
  return (
    <div className="flex h-full flex-col gap-4 pb-2">
      <header>
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-gold">
          {awaiting ? "Draft awaiting your approval" : "The Dungeon Master is at work"}
        </p>
        <h2 className="text-gilded mt-1 font-display text-2xl font-bold tracking-wide">
          {awaiting ? "Review the turn" : "Weaving the scene…"}
        </h2>
      </header>

      {awaiting && draft && (
        <div className="parchment scroll-thin max-h-[45%] overflow-y-auto rounded-card border border-gold/40 p-4">
          <p className="whitespace-pre-wrap font-body text-parchment">{draft}</p>
        </div>
      )}

      <div className="parchment scroll-thin min-h-0 flex-1 overflow-hidden rounded-card border border-stone-2 p-4">
        <TraceStream trace={trace} running={!awaiting} />
      </div>
    </div>
  );
}

/**
 * The scene/outcome reader (req 1.2 + req 3) — one component for both a clicked
 * historical turn and the just-completed outcome. Fed the active TurnSnapshot.
 */
export function SceneReaderPanel() {
  const {
    activeSnapshot,
    historyLoading,
    history,
    progress,
    summary,
    setComposerDraft,
    viewPending,
    runStatus,
    trace,
    pendingDraft,
  } = useConsole();
  const [partyModalOpen, setPartyModalOpen] = useState(false);

  // While a turn is in flight, the reader shows the live trace / pending draft.
  if (viewPending) {
    return (
      <PendingView
        trace={trace}
        awaiting={runStatus === "awaiting_approval"}
        draft={pendingDraft}
      />
    );
  }

  if (historyLoading && history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader label="Reading the scene…" />
      </div>
    );
  }

  if (!activeSnapshot) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="parchment max-w-md rounded-card border border-gold/30 p-8">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-gold">
            The table is set
          </p>
          <h2 className="text-gilded mt-3 font-display text-3xl font-bold tracking-wide">
            Your adventure awaits
          </h2>
          <p className="mt-3 font-rune text-parchment-dim">
            Issue your first command to the Dungeon Master, and the unfolding scene
            will appear here.
          </p>
        </div>
      </div>
    );
  }

  const s = activeSnapshot;
  const meta = s.metadata ?? {};
  const chapterLine = [meta.chapter, meta.section].filter(Boolean).join(" · ");
  const showDescription = s.description && s.description !== s.narrative;

  return (
    <div className="flex h-full gap-8 overflow-hidden pr-2">
      {/* Left Column: Metadata & Actions */}
      <div className="scroll-thin flex w-1/3 flex-shrink-0 flex-col gap-6 overflow-y-auto pb-6">
        <header>
          {chapterLine && (
            <p className="font-rune text-xs uppercase tracking-widest text-parchment-dim">
              {chapterLine}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-gilded font-display text-3xl font-bold tracking-wide">
              {s.scene || "The scene unfolds"}
            </h2>
            <span className="rounded-full border border-gold/30 px-2 py-0.5 font-rune text-xs text-gold whitespace-nowrap">
              {intentMeta(s.intent).icon} {intentMeta(s.intent).label}
            </span>
          </div>
          {typeof progress === "number" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone">
                <div
                  className="h-full bg-gold"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <span className="font-display text-[10px] text-parchment-dim">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </header>

        {summary && (
          <p className="border-l-2 border-gold/30 pl-3 font-body text-sm italic text-parchment-dim">
            {summary}
          </p>
        )}

        <Button variant="secondary" onClick={() => setPartyModalOpen(true)} className="w-full">
          View Party Details
        </Button>

        <SuggestionChips
          title="Suggested Actions"
          items={meta.suggested_actions ?? []}
          onPick={setComposerDraft}
        />
        <SuggestionChips
          title="Where to next?"
          items={meta.next_scene_suggestions ?? []}
          onPick={setComposerDraft}
        />
      </div>

      {/* Right Column: Main Content */}
      <div className="scroll-thin flex flex-1 flex-col gap-6 overflow-y-auto border-l border-gold/20 pl-8 pb-6">
        <AssetGallery assets={meta.assets} alt={s.scene ?? "Scene"} />

        {showDescription && (
          <p className="font-body text-lg leading-relaxed text-parchment-dim">
            {s.description}
          </p>
        )}
        {s.narrative && (
          <p className="font-body text-lg leading-relaxed text-parchment">{s.narrative}</p>
        )}

        {s.dialogue && s.dialogue.length > 0 && (
          <section>
            <SectionLabel>Dialogue</SectionLabel>
            <DialogueBlock lines={s.dialogue} />
          </section>
        )}

        {meta.combat_log && meta.combat_log.length > 0 && (
          <section>
            <SectionLabel>Combat Log</SectionLabel>
            <CombatTable log={meta.combat_log} />
            {meta.math_breakdown && (
              <p className="mt-2 font-mono text-xs text-parchment-dim">{meta.math_breakdown}</p>
            )}
          </section>
        )}

        {s.initiative && s.initiative.length > 0 && (
          <section>
            <SectionLabel>Initiative</SectionLabel>
            <p className="font-body text-parchment">{s.initiative.join(" → ")}</p>
          </section>
        )}

        {meta.gm_notes && (
          <section className="parchment rounded-card border border-gold/30 p-4">
            <SectionLabel>GM Notes</SectionLabel>
            <p className="whitespace-pre-wrap font-body text-sm text-parchment-dim">
              {meta.gm_notes}
            </p>
          </section>
        )}
      </div>

      <Modal
        open={partyModalOpen}
        onClose={() => setPartyModalOpen(false)}
        title="Party Status"
        size="lg"
      >
        <PartyStatGrid party={s.party} />
      </Modal>
    </div>
  );
}
