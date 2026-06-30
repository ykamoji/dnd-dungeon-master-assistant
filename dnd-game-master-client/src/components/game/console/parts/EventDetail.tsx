"use client";

import type { SessionEvent, SessionPart } from "@/lib/types";
import { eventStep } from "../events";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[10px] uppercase tracking-widest text-gold">{children}</p>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="scroll-thin mt-1 max-h-48 overflow-auto rounded-md border border-stone-2 bg-obsidian-2 p-2 text-[11px] leading-relaxed text-parchment-dim">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function PartView({ part }: { part: SessionPart }) {
  if (part.function_call) {
    return (
      <div>
        <Label>Tool call · {part.function_call.name}</Label>
        <Json value={part.function_call.args} />
      </div>
    );
  }
  if (part.function_response) {

    return (
      <div>
        <Label>Tool result · {part.function_response.name}</Label>
        <Json value={part.function_response.response} />
      </div>
    );
  }
  if (part.text && part.thought) {
    return (
      <div>
        <Label>Reasoning</Label>
        <p className="whitespace-pre-wrap font-body text-sm italic text-parchment-dim">
          {typeof part.text === "string" ? part.text : <Json value={part.text} />}
        </p>
      </div>
    );
  }
  if (part.text) {
    return (
      <div className="whitespace-pre-wrap font-body text-sm text-parchment">
        {typeof part.text === "string" ? <p>{part.text}</p> : <Json value={part.text} />}
      </div>
    );
  }
  return null;
}

/** Full, structured layout of a single streamed session event (req 6). */
export function EventDetail({ event }: { event: SessionEvent }) {
  const { icon, title } = eventStep(event);
  const time = event.timestamp
    ? new Date(event.timestamp * 1000).toLocaleTimeString()
    : "";
  const stateDelta = event.actions?.state_delta ?? null;
  const deltaEntries = stateDelta
    ? Object.entries(stateDelta).filter(([, v]) => v !== null && v !== undefined && v !== "")
    : [];

  return (
    <div className="parchment scroll-thin space-y-4 overflow-y-auto rounded-card border border-gold/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-sm text-parchment">
          <span aria-hidden>{icon}</span>
          {title}
        </span>
        <span className="font-garamond text-[11px] text-parchment-dim">
          {event.author}
          {time && ` · ${time}`}
        </span>
      </div>

      {(event.content?.parts ?? []).map((part, i) => (
        <PartView key={i} part={part} />
      ))}

      {deltaEntries.length > 0 && (
        <div>
          <Label>State changes</Label>
          <dl className="mt-1 space-y-0.5">
            {deltaEntries.map(([k, v]) => {
              let parsedV = v;
              let isJson = false;
              if (typeof v === "object" && v !== null) {
                isJson = true;
              } else if (typeof v === "string") {
                try {
                  const parsed = JSON.parse(v);
                  if (typeof parsed === "object" && parsed !== null) {
                    parsedV = parsed;
                    isJson = true;
                  }
                } catch {
                  // Not a JSON string, leave as is
                }
              }

              return (
                <div key={k} className={`flex text-[15px] ${isJson ? "flex-col gap-1" : "gap-2 items-center"}`}>
                  <dt className="shrink-0 text-gold/80">{k}</dt>
                  <dd className="min-w-0 break-words text-parchment-dim w-full">
                    {isJson ? <Json value={parsedV} /> : (typeof v === "string" ? v : JSON.stringify(v))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}
