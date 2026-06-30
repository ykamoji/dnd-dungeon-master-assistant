"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  getSessionEvents,
  sendDecision,
  submitTurn as submitTurnApi,
} from "@/lib/api";
import type { RunEvent, TraceStep, TurnSnapshot } from "@/lib/types";
import { useGame } from "@/context/GameContext";
import { GAME_CATALOG } from "@/lib/games";
import { extractDraft, friendlyStep, isApprovalPause } from "./trace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type RunStatus =
  | "idle"
  | "running"
  | "awaiting_approval"
  | "rejecting"
  | "error";

/** Optional dice results to fold into the submitted command. */
export interface DiceRolls {
  d20?: number | null;
  d100?: number | null;
}

interface ConsoleState {
  activeIndex: number; // index into history (the persisted turns)
  /** When true, the reader/map show the in-flight turn instead of a snapshot. */
  viewPending: boolean;
  runStatus: RunStatus;
  trace: TraceStep[];
  pendingDraft: string | null;
  composerDraft: string;
  error: string | null;
}

const initialState: ConsoleState = {
  activeIndex: -1,
  viewPending: false,
  runStatus: "idle",
  trace: [],
  pendingDraft: null,
  composerDraft: "",
  error: null,
};

type Action =
  | { type: "SELECT_TURN"; index: number }
  | { type: "SELECT_PENDING" }
  | { type: "SET_COMPOSER"; text: string }
  | { type: "RUN_START" }
  | { type: "RESUME_RUN" }
  | { type: "SET_TRACE"; trace: TraceStep[] }
  | { type: "AWAIT_APPROVAL"; draft: string }
  | { type: "RUN_DONE" }
  | { type: "REJECTING" }
  | { type: "REJECTED" }
  | { type: "RUN_ERROR"; message: string };

function reducer(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case "SELECT_TURN":
      return { ...state, activeIndex: action.index, viewPending: false };
    case "SELECT_PENDING":
      return { ...state, viewPending: true };
    case "SET_COMPOSER":
      return { ...state, composerDraft: action.text };
    case "RUN_START":
      return {
        ...state,
        runStatus: "running",
        viewPending: true,
        trace: [],
        pendingDraft: null,
        error: null,
      };
    case "RESUME_RUN":
      return { ...state, runStatus: "running", viewPending: true, pendingDraft: null };
    case "SET_TRACE":
      return { ...state, trace: action.trace };
    case "AWAIT_APPROVAL":
      return {
        ...state,
        runStatus: "awaiting_approval",
        viewPending: true,
        pendingDraft: action.draft,
      };
    case "RUN_DONE":
      return { ...state, runStatus: "idle", viewPending: false, pendingDraft: null };
    case "REJECTING":
      return { ...state, runStatus: "rejecting", pendingDraft: null };
    case "REJECTED":
      return {
        ...state,
        runStatus: "idle",
        viewPending: false,
        trace: [],
        pendingDraft: null,
      };
    case "RUN_ERROR":
      return { ...state, runStatus: "error", viewPending: false, error: action.message };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface ConsoleContextValue {
  campaignId: string | null;
  campaignName: string;
  history: TurnSnapshot[];
  historyLoading: boolean;
  progress: number | null;
  summary: string | null;
  activeIndex: number;
  activeSnapshot: TurnSnapshot | null;
  /** A turn is in flight (running / awaiting approval / rejecting). */
  pending: boolean;
  /** The reader/map should display the in-flight turn rather than a snapshot. */
  viewPending: boolean;
  runStatus: RunStatus;
  trace: TraceStep[];
  pendingDraft: string | null;
  composerDraft: string;
  error: string | null;
  submitTurn: (args: { text: string; dice?: DiceRolls }) => void;
  approve: () => void;
  reject: () => void;
  selectTurn: (index: number) => void;
  selectPending: () => void;
  setComposerDraft: (text: string) => void;
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

function formatDice(dice?: DiceRolls): string {
  if (!dice) return "";
  const parts: string[] = [];
  if (dice.d20 != null) parts.push(`d20=${dice.d20}`);
  if (dice.d100 != null) parts.push(`d100=${dice.d100}`);
  return parts.length ? `(rolled ${parts.join(", ")})` : "";
}

const POLL_MS = 500;
// The ambient POST runs the entire turn synchronously server-side and can
// legitimately take a while (multiple agent/tool calls). A dev proxy or flaky
// connection can drop the response with a 500 long before the backend is done
// — but the backend keeps working and logs no error. This is how long we keep
// watching for the real outcome before giving up.
const OUTCOME_GRACE_MS = 90_000;
const OUTCOME_RECHECK_MS = 2_000;

/** Build the friendly trace from the full event list, collapsing repeats. */
function buildTrace(events: RunEvent[]): TraceStep[] {
  const steps: TraceStep[] = [];
  for (const ev of events) {
    const fs = friendlyStep(ev);
    if (!fs) continue;
    if (steps.length && steps[steps.length - 1].label === fs.label) continue;
    steps.push({ id: `t${steps.length}`, icon: fs.icon, label: fs.label, raw: ev });
  }
  return steps;
}

function lastIsApprovalPause(events: RunEvent[]): boolean {
  const last = events[events.length - 1];
  return Boolean(last && isApprovalPause(last));
}

interface ConsoleProviderProps {
  history: TurnSnapshot[];
  historyLoading: boolean;
  progress: number | null;
  summary: string | null;
  reloadHistory: () => void;
  campaignId: string | null;
  children: ReactNode;
}

/**
 * Owns ALL shared console state and the run lifecycle: submit a turn via the
 * ambient Pub/Sub endpoint, poll the session events API for the live trace and
 * the HITL pause, then approve/reject through /run. Feature panels are pure
 * consumers, so every layout behaves identically.
 */
export function ConsoleProvider({
  history,
  historyLoading,
  progress,
  summary,
  reloadHistory,
  campaignId,
  children,
}: ConsoleProviderProps) {
  const { state: game } = useGame();
  const [state, dispatch] = useReducer(reducer, initialState);

  // The session id is the campaign id (the ambient handler keys the session by
  // the Pub/Sub subscription, which we set to the campaign id).
  const userIdRef = useRef<string>("");
  if (!userIdRef.current) userIdRef.current = "user";

  const statusRef = useRef<RunStatus>("idle");
  const pendingRef = useRef(false);
  const historyRef = useRef(history);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    statusRef.current = state.runStatus;
    pendingRef.current = state.runStatus !== "idle" && state.runStatus !== "error";
  }, [state.runStatus]);

  // When persisted history grows (initial load or a completed turn), snap the
  // reader to the newest turn — unless a turn is in flight (keep the pending view).
  useEffect(() => {
    if (history.length && !pendingRef.current) {
      dispatch({ type: "SELECT_TURN", index: history.length - 1 });
    }
  }, [history.length]);

  const campaignName = useMemo(() => {
    const entry = GAME_CATALOG.find((g) => g.id === game.selectedGameId);
    return entry?.title ?? game.selectedGameId ?? campaignId ?? "the adventure";
  }, [game.selectedGameId, campaignId]);

  const bootstrapPreamble = useCallback(() => {
    const roster = game.party
      .filter((p) => p.name.trim())
      .map((p) => `${p.name} the ${p.role || p.className} (${p.className})`)
      .join("; ");
    return `[New campaign] Adventure: "${campaignName}". Party: ${
      roster || "to be determined"
    }. Set up the campaign and party, then begin:`;
  }, [game.party, campaignName]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Apply a freshly-fetched event list: update the trace, and if the run has
  // paused for approval, surface the draft. Returns true when awaiting approval.
  const applyEvents = useCallback((events: RunEvent[]): boolean => {
    dispatch({ type: "SET_TRACE", trace: buildTrace(events) });
    if (lastIsApprovalPause(events)) {
      statusRef.current = "awaiting_approval";
      dispatch({ type: "AWAIT_APPROVAL", draft: extractDraft(events) });
      return true;
    }
    return false;
  }, []);

  const startPolling = useCallback(
    (sid: string) => {
      stopPolling();
      const tick = async () => {
        try {
          const events = await getSessionEvents(sid, userIdRef.current);
          if (events.length && applyEvents(events)) stopPolling();
        } catch {
          // transient — keep polling
        }
      };
      tick(); // immediate, so the first (quick) event shows without delay
      pollRef.current = setInterval(tick, POLL_MS);
    },
    [applyEvents, stopPolling],
  );

  // Called once the ambient POST (or a resume) resolves: stop polling, do a final
  // read, and either settle into "awaiting approval" or finalize the turn.
  const settleAfterRun = useCallback(
    async (sid: string) => {
      stopPolling();
      const events = await getSessionEvents(sid, userIdRef.current).catch(() => []);
      const awaiting = events.length ? applyEvents(events) : false;
      if (!awaiting) {
        statusRef.current = "idle";
        dispatch({ type: "RUN_DONE" });
        reloadHistory(); // outcome → history grows → reader snaps to it
      }
    },
    [applyEvents, reloadHistory, stopPolling],
  );

  /**
   * The ambient/decision POST itself failed (e.g. a proxy timeout), but the
   * backend may well have kept running. Rather than declaring the turn dead,
   * keep watching: the poll loop (already running) will catch a HITL pause as
   * soon as it lands, and we additionally watch for the turn persisting
   * without one (e.g. a refusal). Only error out if neither happens in time.
   */
  const waitForOutcome = useCallback(
    (sid: string, startHistoryLen: number): Promise<void> =>
      new Promise((resolve) => {
        const deadline = Date.now() + OUTCOME_GRACE_MS;
        const check = async () => {
          if (statusRef.current !== "running") {
            resolve(); // the poll tick already resolved this (approval / etc.)
            return;
          }
          if (historyRef.current.length > startHistoryLen) {
            stopPolling();
            statusRef.current = "idle";
            dispatch({ type: "RUN_DONE" });
            resolve();
            return;
          }
          if (Date.now() >= deadline) {
            // Last-chance read in case the pause landed between ticks.
            const events = await getSessionEvents(sid, userIdRef.current).catch(() => []);
            if (events.length && applyEvents(events)) {
              resolve();
              return;
            }
            stopPolling();
            statusRef.current = "error";
            dispatch({
              type: "RUN_ERROR",
              message:
                "Lost contact while this turn was processing. It may still finish in the background — try again in a moment.",
            });
            resolve();
            return;
          }
          reloadHistory();
          setTimeout(check, OUTCOME_RECHECK_MS);
        };
        check();
      }),
    [applyEvents, reloadHistory, stopPolling],
  );

  const submitTurn = useCallback(
    async ({ text, dice }: { text: string; dice?: DiceRolls }) => {
      if (statusRef.current !== "idle" && statusRef.current !== "error") return;
      const action = [formatDice(dice), text.trim()].filter(Boolean).join(" ");
      if (!action) return;
      const sid = campaignId;
      if (!sid) {
        dispatch({ type: "RUN_ERROR", message: "No campaign selected" });
        return;
      }
      const isFirstNewTurn = game.branch === "new" && historyRef.current.length === 0;
      const finalAction = isFirstNewTurn ? `${bootstrapPreamble()} ${action}` : action;
      const startLen = historyRef.current.length;

      statusRef.current = "running";
      dispatch({ type: "RUN_START" });
      startPolling(sid);
      try {
        await submitTurnApi({ sessionId: sid, userId: userIdRef.current, action: finalAction });
      } catch {
        // Don't kill polling/show a dead-end error here — the request may have
        // failed in transit (e.g. a dev-proxy timeout) while the backend kept
        // working. Keep watching for the real outcome instead.
        await waitForOutcome(sid, startLen);
        return;
      }
      await settleAfterRun(sid);
    },
    [
      campaignId,
      game.branch,
      bootstrapPreamble,
      startPolling,
      settleAfterRun,
      waitForOutcome,
    ],
  );

  const approve = useCallback(async () => {
    if (statusRef.current !== "awaiting_approval" || !campaignId) return;
    const startLen = historyRef.current.length;
    statusRef.current = "running";
    dispatch({ type: "RESUME_RUN" });
    startPolling(campaignId);
    try {
      await sendDecision({ sessionId: campaignId, userId: userIdRef.current, approved: true });
    } catch {
      await waitForOutcome(campaignId, startLen);
      return;
    }
    await settleAfterRun(campaignId);
  }, [campaignId, startPolling, settleAfterRun, waitForOutcome]);

  const reject = useCallback(async () => {
    if (statusRef.current !== "awaiting_approval" || !campaignId) return;
    statusRef.current = "rejecting";
    stopPolling();
    dispatch({ type: "REJECTING" });
    try {
      await sendDecision({ sessionId: campaignId, userId: userIdRef.current, approved: false });
    } catch {
      // Non-fatal: the turn isn't persisted on rejection anyway.
    }
    statusRef.current = "idle";
    dispatch({ type: "REJECTED" });
    dispatch({ type: "SELECT_TURN", index: historyRef.current.length - 1 });
  }, [campaignId, stopPolling]);

  const selectTurn = useCallback((index: number) => {
    dispatch({ type: "SELECT_TURN", index });
  }, []);
  const selectPending = useCallback(() => {
    dispatch({ type: "SELECT_PENDING" });
  }, []);
  const setComposerDraft = useCallback((text: string) => {
    dispatch({ type: "SET_COMPOSER", text });
  }, []);

  // On fresh mount, restore a turn that's already paused at the HITL gate so the
  // approval bar shows immediately (e.g. after a reload mid-approval).
  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    (async () => {
      const events = await getSessionEvents(campaignId, userIdRef.current).catch(() => []);
      if (cancelled || !events.length || !lastIsApprovalPause(events)) return;
      statusRef.current = "awaiting_approval";
      pendingRef.current = true;
      applyEvents(events);
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, applyEvents]);

  // Clean up polling on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  const pending = state.runStatus !== "idle" && state.runStatus !== "error";
  const activeSnapshot =
    !state.viewPending && history.length
      ? history[Math.min(Math.max(state.activeIndex, 0), history.length - 1)]
      : null;

  const value: ConsoleContextValue = {
    campaignId,
    campaignName,
    history,
    historyLoading,
    progress,
    summary,
    activeIndex: state.activeIndex,
    activeSnapshot,
    pending,
    viewPending: state.viewPending,
    runStatus: state.runStatus,
    trace: state.trace,
    pendingDraft: state.pendingDraft,
    composerDraft: state.composerDraft,
    error: state.error,
    submitTurn,
    approve,
    reject,
    selectTurn,
    selectPending,
    setComposerDraft,
  };

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole(): ConsoleContextValue {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error("useConsole must be used within a ConsoleProvider");
  return ctx;
}
