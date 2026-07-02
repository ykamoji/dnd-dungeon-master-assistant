"use client";

import { type ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AssetGallery } from "./AssetGallery";
import { PartyStatGrid } from "./PartyStatGrid";
import { intentMeta } from "../snapshot";
import { useConsole } from "../ConsoleProvider";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { resolveVoiceName } from "@/lib/voices";
import type { CombatEntry, DialogueLine, TurnSnapshot } from "@/lib/types";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-gold">
      {children}
    </p>
  );
}

function DialogueBlock({
  lines,
  turnKey,
}: {
  lines: DialogueLine[];
  /** Session+turn prefix so cached voices are scoped to this turn. */
  turnKey: string;
}) {
  const { activeKey, status, error, toggle } = useTextToSpeech();
  return (
    <div className="space-y-2">
      {lines.map((d, i) => {
        // Same NPC keeps one voice across turns (see resolveVoiceName).
        const voiceName = resolveVoiceName(d.speaker, d.gender);
        const key = `${turnKey}:${i}:${d.emotion ?? ""}:${voiceName}`;
        const lineStatus = activeKey === key ? status : "idle";
        return (
          <p key={i} className="font-body text-parchment cursor-pointer select-none" onClick={() => toggle(key, d.text, d.emotion, voiceName)}>
            <span className="font-display text-sm text-gold-bright">{d.speaker}</span>
            ({d.emotion && (
              <span className="font-rune text-xs text-parchment-dim"> {d.emotion}</span>
            )}
            {d.gender && (
              <span className="font-rune text-xs text-parchment-dim">, {d.gender}</span>
            )})
            <span className="text-parchment-dim">: </span>
            <SpeakButton
              status={lineStatus}
            />
            <br />
            <span className="italic">{d.text}</span>
          </p>
        );
      })}
      {error && (
        <p className="mt-1 font-body text-xs text-blood-bright">{error}</p>
      )}
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
            className="rounded-full cursor-pointer border border-gold/30 bg-obsidian-2 px-3 py-1 text-left text-sm text-parchment transition-colors hover:border-gold hover:text-gold-bright"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SnapshotLayout({
  snapshot,
  progress,
  summary,
  current,
  setComposerDraft,
}: {
  snapshot: TurnSnapshot;
  progress?: number | null;
  summary?: string | null;
  current?: boolean;
  setComposerDraft: (text: string) => void;
}) {
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const { campaignId } = useConsole();
  const s = snapshot;
  const meta = s.metadata ?? {};
  // Cache voices per session + turn (see useTextToSpeech).
  const turnKey = `${campaignId ?? "session"}:${s.created_dt ?? "turn"}`;
  const chapterLine = [meta.chapter, meta.section].filter(Boolean).join(" · ");
  const showDescription = s.description && s.description !== s.narrative;

  let suggestedActions = meta.suggested_actions ?? [];
  if (s.intent?.toUpperCase() === "SETUP" && suggestedActions.length === 0) {
    suggestedActions = [
      "Lets start our adventure into the new world",
      "Tell me about the world",
      "Lets begin exploring",
    ];
  }

  return (
    <div className={`flex h-full gap-4 overflow-hidden pr-2 ${!current ? "pb-10" : ""}`}>
      {/* Left Column: Metadata & Actions */}
      <div className="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex w-1/3 flex-shrink-0 flex-col gap-6 overflow-y-auto pb-6">
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
            <span className="rounded-full border border-gold/30 px-3 py-1 font-rune text-md text-gold whitespace-nowrap">
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
          items={suggestedActions}
          onPick={setComposerDraft}
        />
        <SuggestionChips
          title="Where to next?"
          items={meta.next_scene_suggestions ?? []}
          onPick={setComposerDraft}
        />
      </div>

      {/* Right Column: Main Content */}
      <div className="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-1 flex-col gap-6 overflow-y-auto border-l border-gold/20 pl-3 pb-6">
        <AssetGallery assets={meta.assets} alt={s.scene ?? "Scene"} />

        {showDescription && (
          <p className="font-body text-md leading-relaxed text-parchment-dim">
            {s.description}
          </p>
        )}
        {s.narrative && (
          <div className="font-body text-md leading-relaxed text-parchment space-y-4">
            <ReactMarkdown
              components={{
                strong: ({ node, ...props }) => <strong className="font-bold text-gold" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-display text-gold mt-4 mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-display text-gold mt-4 mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-md font-display text-gold mt-3 mb-2" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gold/50 pl-4 italic text-parchment-dim" {...props} />,
              }}
            >
              {s.narrative}
            </ReactMarkdown>
          </div>
        )}

        {s.dialogue && s.dialogue.length > 0 && (
          <section>
            <SectionLabel>Dialogue</SectionLabel>
            <DialogueBlock lines={s.dialogue} turnKey={turnKey} />
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

        {s.initiative && Array.isArray(s.initiative) && s.initiative.length > 0 && (
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
