import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FocusChart } from "./components/FocusChart";
import { FocusMonthHeatmap } from "./components/FocusMonthHeatmap";
import { RecentSessionsPie } from "./components/RecentSessionsPie";
import { BuddyEnvironment } from "./components/BuddyEnvironment";
import { SproutBuddy } from "./components/SproutBuddy";
import { StudyPlanner } from "./components/StudyPlanner";
import "./App.css";
import { applyThemeToDocument, THEMES } from "./themes";
import { APP_FONT_STACK, loadState, saveState } from "./storage";
import {
  dailyFocusSeriesBySubject,
  focusSecondsForDate,
  newFocusSessionId,
  nextStreakState,
  todayKey,
} from "./streak";
import type { Appearance, StudyPlanItem, ThemeId } from "./types";
import { COINS_PER_FOCUS_MINUTE, STREAK_BONUS_COINS } from "./types";

type Phase = "idle" | "running" | "paused";
type AppTab = "focus" | "history" | "planner" | "buddy";

const PRESETS = [25, 45, 60] as const;

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

function formatMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHoursMinutes(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function newStudyPlanId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const PLANNED_TIME_LEEWAY_MIN = 5;
/** Extra minutes after planned end when checking bonus overlap only (not for the Start button). */
const PLANNED_BONUS_END_LEEWAY_MIN = 5;

function hhmmToMinutes(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const h = Number.parseInt(hRaw, 10);
  const m = Number.parseInt(mRaw, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isPlanTimeMatch(plan: { date: string; startTime: string; endTime: string }, at: Date | null) {
  if (!at) return false;
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const day = String(at.getDate()).padStart(2, "0");
  const dateKey = `${year}-${month}-${day}`;
  if (plan.date !== dateKey) return false;

  const startMin = hhmmToMinutes(plan.startTime);
  const endMin = hhmmToMinutes(plan.endTime);
  if (startMin == null || endMin == null) return false;

  const atMin = at.getHours() * 60 + at.getMinutes();
  // Leeway only before start (e.g. start up to 5 min early). End time is strict.
  const startWithLeeway = Math.max(0, startMin - PLANNED_TIME_LEEWAY_MIN);
  return atMin >= startWithLeeway && atMin < endMin;
}

function normalizeSubject(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function subjectMatchesPlan(sessionLabel: string, planSubject: string) {
  const a = normalizeSubject(sessionLabel);
  const b = normalizeSubject(planSubject);
  return a.length > 0 && a === b;
}

function localDateKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function secondsSinceMidnightLocal(d: Date) {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/** True if the focused interval overlaps the planned block (same local day), with start leeway + small tail after end. */
function planBonusTimeOverlaps(
  plan: { date: string; startTime: string; endTime: string },
  startedAt: Date,
  focusedSeconds: number
) {
  if (plan.date !== localDateKeyFromDate(startedAt)) return false;
  const startMin = hhmmToMinutes(plan.startTime);
  const endMin = hhmmToMinutes(plan.endTime);
  if (startMin == null || endMin == null || endMin <= startMin) return false;

  const planStartSec = Math.max(0, startMin * 60 - PLANNED_TIME_LEEWAY_MIN * 60);
  const planEndSec = endMin * 60 + PLANNED_BONUS_END_LEEWAY_MIN * 60;
  const sessStartSec = secondsSinceMidnightLocal(startedAt);
  const sessEndSec = sessStartSec + focusedSeconds;
  return sessStartSec < planEndSec && sessEndSec > planStartSec;
}

/** Same local day as session start and focus topic matches planned subject (case-insensitive). */
function planBonusSubjectMatches(
  plan: { date: string; subject: string },
  startedAt: Date,
  sessionLabel: string
) {
  if (plan.date !== localDateKeyFromDate(startedAt)) return false;
  return subjectMatchesPlan(sessionLabel, plan.subject);
}

function qualifiesForPlannedBonus(
  plan: StudyPlanItem,
  startedAt: Date | null,
  focusedSeconds: number,
  sessionLabel: string
) {
  if (!startedAt || focusedSeconds < 1) return false;
  return (
    planBonusTimeOverlaps(plan, startedAt, focusedSeconds) ||
    planBonusSubjectMatches(plan, startedAt, sessionLabel)
  );
}

function isPlannedStudyTime(
  studyPlan: StudyPlanItem[],
  startedAt: Date | null,
  focusedSeconds: number,
  sessionLabel: string
) {
  return studyPlan.some(
    (item) =>
      !item.completed &&
      !item.missed &&
      qualifiesForPlannedBonus(item, startedAt, focusedSeconds, sessionLabel)
  );
}

export function App() {
  const [state, setState] = useState(() => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [phase, setPhase] = useState<Phase>("idle");
  const [goalMin, setGoalMin] = useState(() => loadState().lastPreset);
  const [customMin, setCustomMin] = useState("");
  const [remainingSec, setRemainingSec] = useState(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [appTab, setAppTab] = useState<AppTab>("focus");
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState(() => loadState().lastSessionLabel);
  const [renameTodayFrom, setRenameTodayFrom] = useState("");
  const [renameTodayTo, setRenameTodayTo] = useState("");
  const [renameTodayCount, setRenameTodayCount] = useState("2");
  const startedGoalSecRef = useRef(0);
  const sessionStartedAtRef = useRef<Date | null>(null);
  /** Wall-clock end time (ms) so the countdown stays accurate when the tab is backgrounded. */
  const sessionEndsAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const sessionLabelRef = useRef(sessionLabel);
  sessionLabelRef.current = sessionLabel;

  const appearance = state.appearance;

  useEffect(() => {
    const t = THEMES[appearance.themeId];
    applyThemeToDocument(t, APP_FONT_STACK);
  }, [appearance.themeId]);

  const goalSeconds = useMemo(() => Math.max(1, goalMin) * 60, [goalMin]);

  const chartSeries = useMemo(
    () => dailyFocusSeriesBySubject(state.sessions, new Date(), 7),
    [state.sessions]
  );
  const recentSessions = useMemo(
    () => [...state.sessions].slice(-12).reverse(),
    [state.sessions]
  );

  const [pieSelectedDateKey, setPieSelectedDateKey] = useState<string | null>(null);

  const pieSessions = useMemo(() => {
    if (pieSelectedDateKey) {
      return state.sessions.filter((s) => s.date === pieSelectedDateKey);
    }
    return recentSessions;
  }, [pieSelectedDateKey, state.sessions, recentSessions]);

  const pieContextDateLabel = useMemo(() => {
    if (!pieSelectedDateKey) return undefined;
    return new Date(`${pieSelectedDateKey}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [pieSelectedDateKey]);

  const todayFocusSeconds = useMemo(
    () => focusSecondsForDate(state.sessions, todayKey()),
    [state.sessions]
  );
  const focusBuddyMood = useMemo(() => {
    if (celebrate) return "radiant" as const;
    if (todayFocusSeconds <= 0) return "waiting" as const;
    if (todayFocusSeconds < 25 * 60) return "content" as const;
    return "radiant" as const;
  }, [celebrate, todayFocusSeconds]);

  const clearTick = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const persist = useCallback((next: typeof state) => {
    setState(next);
    saveState(next);
  }, []);

  const persistActiveSession = useCallback(
    (activeSession: typeof state.activeSession) => {
      persist({ ...stateRef.current, activeSession });
    },
    [persist]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const renameTodaySessionLabels = useCallback(() => {
    const from = renameTodayFrom.trim();
    const to = renameTodayTo.trim();
    const requestedCount = Number.parseInt(renameTodayCount, 10);
    if (!from || !to) {
      showToast("Enter both the current and new topic names.");
      return;
    }
    if (Number.isNaN(requestedCount) || requestedCount < 1) {
      showToast("Enter how many recent sessions to rename (at least 1).");
      return;
    }
    if (normalizeSubject(from) === normalizeSubject(to)) {
      showToast("Those two topic names are the same.");
      return;
    }

    const nowKey = todayKey();
    const matchingIndexes = stateRef.current.sessions
      .map((session, idx) =>
        session.date === nowKey && normalizeSubject(session.label) === normalizeSubject(from)
          ? idx
          : -1
      )
      .filter((idx) => idx >= 0);
    const indexesToRename = new Set(matchingIndexes.slice(-requestedCount));
    const renamedCount = indexesToRename.size;

    if (renamedCount < 1) {
      showToast(`No "${from}" sessions found for today.`);
      return;
    }
    const nextSessions = stateRef.current.sessions.map((session, idx) =>
      indexesToRename.has(idx) ? { ...session, label: to } : session
    );

    const nextLastSessionLabel =
      normalizeSubject(stateRef.current.lastSessionLabel) === normalizeSubject(from)
        ? to
        : stateRef.current.lastSessionLabel;
    persist({
      ...stateRef.current,
      sessions: nextSessions,
      lastSessionLabel: nextLastSessionLabel,
    });
    setSessionLabel((prev) => (normalizeSubject(prev) === normalizeSubject(from) ? to : prev));
    setRenameTodayFrom("");
    setRenameTodayTo("");
    showToast(
      `Renamed ${renamedCount} most recent "${from}" session${
        renamedCount === 1 ? "" : "s"
      } from today.`
    );
  }, [persist, renameTodayCount, renameTodayFrom, renameTodayTo, showToast]);

  const creditSession = useCallback(
    (focusedSeconds: number, startedAtFromCaller: Date | null) => {
      const effectiveStartedAt = startedAtFromCaller ?? sessionStartedAtRef.current;
      const s = stateRef.current;
      const wholeMinutes = Math.floor(focusedSeconds / 60);
      if (wholeMinutes < 1) {
        showToast("Focus at least 1 minute to earn sparkles ✨");
        sessionStartedAtRef.current = null;
        return;
      }
      const baseCoins = wholeMinutes * COINS_PER_FOCUS_MINUTE;
      const streakInfo = nextStreakState(s.streakDays, s.lastFocusDate, todayKey());
      const bonus = streakInfo.streakJustIncreased ? STREAK_BONUS_COINS : 0;
      const label = sessionLabelRef.current.trim();
      const isPlanned = isPlannedStudyTime(s.studyPlan, effectiveStartedAt, focusedSeconds, label);
      const earned = (baseCoins + bonus) * (isPlanned ? 2 : 1);
      const entry = {
        id: newFocusSessionId(),
        date: todayKey(),
        seconds: focusedSeconds,
        label,
      };

      persist({
        ...s,
        totalFocusSeconds: s.totalFocusSeconds + focusedSeconds,
        sparkleCoins: s.sparkleCoins + earned,
        streakDays: streakInfo.streakDays,
        lastFocusDate: streakInfo.lastFocusDate,
        sessions: [...s.sessions, entry],
        lastSessionLabel: label,
      });

      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1600);

      const streakBit = streakInfo.streakJustIncreased
        ? ` Streak bonus +${STREAK_BONUS_COINS}!`
        : "";
      const plannedBit = isPlanned ? " Planned-time bonus x2!" : "";
      const labelBit = label ? ` · ${label}` : "";
      showToast(
        `+${earned} sparkles · ${wholeMinutes} min focus${labelBit}${
          streakBit ? "." + streakBit : ""
        }${plannedBit}`
      );
      sessionStartedAtRef.current = null;
    },
    [persist, showToast]
  );

  const syncRunningTimerFromClock = useCallback(() => {
    const endMs = sessionEndsAtRef.current;
    if (endMs == null) return;
    const rem = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
    setRemainingSec(rem);
    if (rem <= 0) {
      clearTick();
      sessionEndsAtRef.current = null;
      setPhase("idle");
      persistActiveSession(null);
      const g = startedGoalSecRef.current;
      const sessionStart = sessionStartedAtRef.current;
      window.setTimeout(() => creditSession(g, sessionStart), 0);
    }
  }, [clearTick, creditSession, persistActiveSession]);

  const armFocusInterval = useCallback((durationSec: number) => {
    clearTick();
    sessionEndsAtRef.current = Date.now() + durationSec * 1000;
    tickRef.current = window.setInterval(syncRunningTimerFromClock, 1000);
  }, [clearTick, syncRunningTimerFromClock]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && sessionEndsAtRef.current != null) {
        syncRunningTimerFromClock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncRunningTimerFromClock]);

  useEffect(() => {
    const saved = state.activeSession;
    if (!saved) return;

    startedGoalSecRef.current = Math.max(1, saved.goalSec);
    sessionStartedAtRef.current = new Date(saved.startedAtIso);
    sessionLabelRef.current = saved.label;
    setSessionLabel(saved.label);

    if (saved.phase === "paused") {
      setRemainingSec(Math.max(0, saved.remainingSec));
      setPhase("paused");
      return;
    }

    const endMs = saved.endsAtMs;
    if (endMs == null) {
      persistActiveSession(null);
      return;
    }

    const rem = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
    if (rem <= 0) {
      persistActiveSession(null);
      setPhase("idle");
      setRemainingSec(0);
      window.setTimeout(
        () => creditSession(startedGoalSecRef.current, sessionStartedAtRef.current),
        0
      );
      return;
    }

    sessionEndsAtRef.current = endMs;
    setRemainingSec(rem);
    setPhase("running");
    tickRef.current = window.setInterval(syncRunningTimerFromClock, 1000);
  }, [creditSession, persistActiveSession, state.activeSession, syncRunningTimerFromClock]);

  const startSession = () => {
    if (phase !== "idle") return;
    startedGoalSecRef.current = goalSeconds;
    sessionStartedAtRef.current = new Date();
    setRemainingSec(goalSeconds);
    setPhase("running");
    persist({ ...stateRef.current, lastPreset: goalMin });
    persistActiveSession({
      phase: "running",
      goalSec: goalSeconds,
      remainingSec: goalSeconds,
      startedAtIso: sessionStartedAtRef.current.toISOString(),
      endsAtMs: Date.now() + goalSeconds * 1000,
      label: sessionLabelRef.current.trim(),
    });

    armFocusInterval(goalSeconds);
  };

  const startPlannedSession = (plan: StudyPlanItem) => {
    if (phase !== "idle" || plan.completed || plan.missed) return;
    const startMin = hhmmToMinutes(plan.startTime);
    const endMin = hhmmToMinutes(plan.endTime);
    if (startMin == null || endMin == null || endMin <= startMin) {
      showToast("Could not start this plan due to invalid times.");
      return;
    }
    const durationMin = Math.max(1, Math.min(180, endMin - startMin));
    const durationSec = durationMin * 60;
    const cleanSubject = plan.subject.trim();
    if (cleanSubject) {
      setSessionLabel(cleanSubject);
      sessionLabelRef.current = cleanSubject;
    }
    setGoalMin(durationMin);
    setCustomMin(String(durationMin));
    setAppTab("focus");
    startedGoalSecRef.current = durationSec;
    sessionStartedAtRef.current = new Date();
    setRemainingSec(durationSec);
    setPhase("running");
    persist({
      ...stateRef.current,
      lastPreset: durationMin,
      lastSessionLabel: cleanSubject || stateRef.current.lastSessionLabel,
    });
    persistActiveSession({
      phase: "running",
      goalSec: durationSec,
      remainingSec: durationSec,
      startedAtIso: sessionStartedAtRef.current.toISOString(),
      endsAtMs: Date.now() + durationSec * 1000,
      label: sessionLabelRef.current.trim(),
    });

    armFocusInterval(durationSec);
  };

  const endSessionEarly = () => {
    if (phase === "idle") return;
    clearTick();
    const endMs = sessionEndsAtRef.current;
    sessionEndsAtRef.current = null;
    const remFromClock = phase === "running" && endMs != null
      ? Math.max(0, Math.ceil((endMs - Date.now()) / 1000))
      : remainingSec;
    const elapsed = startedGoalSecRef.current - remFromClock;
    setPhase("idle");
    setRemainingSec(0);
    persistActiveSession(null);
    creditSession(elapsed, sessionStartedAtRef.current);
  };

  const pauseSession = () => {
    if (phase !== "running") return;
    clearTick();
    const endMs = sessionEndsAtRef.current;
    sessionEndsAtRef.current = null;
    const remFromClock =
      endMs != null ? Math.max(0, Math.ceil((endMs - Date.now()) / 1000)) : remainingSec;
    setRemainingSec(remFromClock);
    setPhase("paused");
    persistActiveSession({
      phase: "paused",
      goalSec: startedGoalSecRef.current,
      remainingSec: remFromClock,
      startedAtIso: (sessionStartedAtRef.current ?? new Date()).toISOString(),
      endsAtMs: null,
      label: sessionLabelRef.current.trim(),
    });
    showToast("Timer paused.");
  };

  const resumeSession = () => {
    if (phase !== "paused") return;
    const resumedEndMs = Date.now() + remainingSec * 1000;
    setPhase("running");
    persistActiveSession({
      phase: "running",
      goalSec: startedGoalSecRef.current,
      remainingSec,
      startedAtIso: (sessionStartedAtRef.current ?? new Date()).toISOString(),
      endsAtMs: resumedEndMs,
      label: sessionLabelRef.current.trim(),
    });
    armFocusInterval(remainingSec);
    showToast("Back to focus.");
  };

  const cancelSession = () => {
    if (phase === "idle") return;
    clearTick();
    sessionEndsAtRef.current = null;
    sessionStartedAtRef.current = null;
    setPhase("idle");
    setRemainingSec(0);
    persistActiveSession(null);
    showToast("Session cancelled — your progress wasn’t saved.");
  };

  useEffect(() => () => clearTick(), [clearTick]);

  const progress =
    phase !== "idle" && startedGoalSecRef.current > 0
      ? 1 - remainingSec / startedGoalSecRef.current
      : 0;
  const strokeDashoffset = CIRC * (1 - Math.min(1, Math.max(0, progress)));

  const updateAppearance = (patch: Partial<Appearance>) => {
    const nextApp = { ...state.appearance, ...patch };
    persist({ ...state, appearance: nextApp });
  };

  const displayTime =
    phase !== "idle" ? remainingSec : goalSeconds;

  return (
    <>
      <div className="app">
        <header className="app__header">
          <div className="app__title-block">
            <h1>Focus Garden</h1>
            <p>Grow your streak — earn sparkles for calm, phone-away focus.</p>
          </div>
          <div className="wallet" title="Total sparkles">
            <span className="wallet__icon" aria-hidden>
              ✨
            </span>
            <span>{state.sparkleCoins}</span>
          </div>
        </header>

        <div className="app-tabs" role="tablist" aria-label="App sections">
          <button
            type="button"
            role="tab"
            id="tab-focus"
            aria-selected={appTab === "focus"}
            aria-controls="panel-focus"
            className={`app-tabs__btn ${appTab === "focus" ? "app-tabs__btn--active" : ""}`}
            onClick={() => setAppTab("focus")}
          >
            Focus
          </button>
          <button
            type="button"
            role="tab"
            id="tab-history"
            aria-selected={appTab === "history"}
            aria-controls="panel-history"
            disabled={phase !== "idle"}
            title={phase !== "idle" ? "Finish or cancel your session to view history" : undefined}
            className={`app-tabs__btn ${appTab === "history" ? "app-tabs__btn--active" : ""}`}
            onClick={() => setAppTab("history")}
          >
            History
          </button>
          <button
            type="button"
            role="tab"
            id="tab-planner"
            aria-selected={appTab === "planner"}
            aria-controls="panel-planner"
            className={`app-tabs__btn ${appTab === "planner" ? "app-tabs__btn--active" : ""}`}
            onClick={() => setAppTab("planner")}
          >
            Study planner
          </button>
          <button
            type="button"
            role="tab"
            id="tab-buddy"
            aria-selected={appTab === "buddy"}
            aria-controls="panel-buddy"
            disabled={phase !== "idle"}
            title={phase !== "idle" ? "Finish or cancel your session to visit your buddy" : undefined}
            className={`app-tabs__btn ${appTab === "buddy" ? "app-tabs__btn--active" : ""}`}
            onClick={() => setAppTab("buddy")}
          >
            Buddy
          </button>
        </div>

        {appTab === "focus" && (
          <div
            className="app-focus-panel"
            id="panel-focus"
            role="tabpanel"
            aria-labelledby="tab-focus"
          >
        <div className="app__main">
          <div className="app__buddy">
            <SproutBuddy mood={focusBuddyMood} />
            <p className="buddy-environment__name">Sprout</p>
            <p className="mascot__caption">
              {state.streakDays > 0
                ? `${state.streakDays}-day streak - you're doing amazing!`
                : "Keep showing up - we grow together."}
            </p>
          </div>

          <section className="timer-card timer-card--aside" aria-labelledby="timer-heading">
          <h2 id="timer-heading" className="timer-card__label">
            Session
          </h2>
          <div className="focus-topic">
            <label htmlFor="focus-topic" className="focus-topic__label">
              What are you focusing on?
            </label>
            <input
              id="focus-topic"
              type="text"
              className="focus-topic__input"
              placeholder="e.g. Reading, deep work, course…"
              maxLength={120}
              disabled={phase !== "idle"}
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              onBlur={(e) =>
                persist({ ...stateRef.current, lastSessionLabel: e.currentTarget.value.trim() })
              }
            />
          </div>
          <div className="presets" role="group" aria-label="Duration presets">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className={`preset-btn ${goalMin === m ? "preset-btn--active" : ""}`}
                disabled={phase !== "idle"}
                onClick={() => {
                  setGoalMin(m);
                  setCustomMin("");
                }}
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="custom-row">
            <label htmlFor="custom-min">Custom</label>
            <input
              id="custom-min"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              placeholder="minutes"
              disabled={phase !== "idle"}
              value={customMin}
              onChange={(e) => {
                const v = e.target.value;
                setCustomMin(v);
                const n = parseInt(v, 10);
                if (!Number.isNaN(n) && n >= 1 && n <= 180) setGoalMin(n);
              }}
              onBlur={() => {
                if (customMin === "" || parseInt(customMin, 10) < 1) setGoalMin(25);
              }}
            />
          </div>

          <div className="ring-wrap">
            <div className="timer-ring" aria-live="polite">
              <svg viewBox="0 0 100 100" aria-hidden>
                <circle className="timer-ring__bg" cx="50" cy="50" r={RADIUS} />
                <circle
                  className="timer-ring__fg"
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  strokeDasharray={CIRC}
                  strokeDashoffset={phase !== "idle" ? strokeDashoffset : 0}
                  style={{
                    opacity: phase !== "idle" ? 1 : 0.35,
                  }}
                />
              </svg>
              <div className="timer-ring__center">
                <span className="timer-ring__time">{formatMMSS(displayTime)}</span>
                <span className="timer-ring__sub">
                  {phase === "running" ? "remaining" : phase === "paused" ? "paused" : "planned focus"}
                </span>
              </div>
            </div>
          </div>

          <div className="actions">
            {phase === "idle" ? (
              <button type="button" className="btn btn--primary" onClick={startSession}>
                Start focus
              </button>
            ) : (
              <>
                <div className="actions__row">
                  <button type="button" className="btn btn--primary" disabled>
                    {phase === "running" ? "Focusing…" : "Paused"}
                  </button>
                </div>
                <div className="actions__row">
                  {phase === "running" ? (
                    <button type="button" className="btn btn--ghost" onClick={pauseSession}>
                      Pause
                    </button>
                  ) : (
                    <button type="button" className="btn btn--ghost" onClick={resumeSession}>
                      Resume
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost" onClick={endSessionEarly}>
                    Finish &amp; save
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={cancelSession}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="reward-hint">
            You earn {COINS_PER_FOCUS_MINUTE} sparkles per full focus minute. When your streak
            grows, you get a one-time +{STREAK_BONUS_COINS} bonus that session.
          </p>
          </section>
        </div>

        <div className="stats-row">
          <div className="stat-pill">
            <div className="stat-pill__value">{formatHoursMinutes(state.totalFocusSeconds)}</div>
            <div className="stat-pill__label">Total focus</div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill__value">{state.streakDays} day{state.streakDays === 1 ? "" : "s"}</div>
            <div className="stat-pill__label">Streak</div>
          </div>
        </div>
          </div>
        )}

        {appTab === "history" && (
          <div
            className="app-history"
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
          >
            <section className="focus-history" aria-labelledby="focus-history-heading">
              <h2 id="focus-history-heading" className="focus-history__title">
                This week
              </h2>
              <FocusChart series={chartSeries} themeId={appearance.themeId} />
            </section>

            <div className="history-month-recent">
              <section className="focus-history focus-history--month" aria-labelledby="focus-month-heading">
                <h2 id="focus-month-heading" className="focus-history__title">
                  This month
                </h2>
                <FocusMonthHeatmap
                  sessions={state.sessions}
                  selectedDateKey={pieSelectedDateKey}
                  onSelectDate={setPieSelectedDateKey}
                />
              </section>

              {(pieSelectedDateKey != null || recentSessions.length > 0) && (
                <section
                  className="recent-sessions recent-sessions--aside"
                  aria-labelledby="recent-sessions-heading"
                >
                  <h2 id="recent-sessions-heading" className="recent-sessions__title">
                    {pieSelectedDateKey ? "Day focus" : "Recent sessions"}
                  </h2>
                  <p className="recent-sessions__subtitle">
                    {pieSelectedDateKey ? (
                      <>
                        Topics on {pieContextDateLabel}. Tap the same day again to show recent
                        sessions.
                      </>
                    ) : (
                      <>
                        Last twelve sessions, grouped by topic (same name adds to one slice). Tap a
                        day in the calendar to see that day instead.
                      </>
                    )}
                  </p>
                  <RecentSessionsPie
                    sessions={pieSessions}
                    variant={pieSelectedDateKey ? "day" : "recent"}
                    contextDateLabel={pieContextDateLabel}
                    themeId={appearance.themeId}
                  />
                </section>
              )}
            </div>
          </div>
        )}

        {appTab === "buddy" && (
          <div
            className="app-buddy-panel"
            id="panel-buddy"
            role="tabpanel"
            aria-labelledby="tab-buddy"
          >
            <BuddyEnvironment
              todayFocusSeconds={todayFocusSeconds}
              onGoFocus={() => setAppTab("focus")}
            />
          </div>
        )}

        {appTab === "planner" && (
          <div
            className="app-planner-panel"
            id="panel-planner"
            role="tabpanel"
            aria-labelledby="tab-planner"
          >
            <StudyPlanner
              plans={state.studyPlan}
              canStartPlanNow={(plan) => phase === "idle" && isPlanTimeMatch(plan, new Date())}
              onStartPlanFocus={startPlannedSession}
              onAddPlan={({ date, startTime, endTime, subject }) => {
                const nextItem = {
                  id: newStudyPlanId(),
                  date,
                  startTime,
                  endTime,
                  subject,
                  completed: false,
                  missed: false,
                };
                persist({ ...stateRef.current, studyPlan: [...stateRef.current.studyPlan, nextItem] });
                showToast(`Added study block: ${subject}`);
              }}
              onRemovePlan={(id) => {
                const before = stateRef.current.studyPlan;
                const next = before.filter((item) => item.id !== id);
                if (next.length === before.length) return;
                persist({ ...stateRef.current, studyPlan: next });
                showToast("Removed study block.");
              }}
              onTogglePlanCompleted={(id, completed) => {
                const s = stateRef.current;
                const plan = s.studyPlan.find((p) => p.id === id);
                if (!plan || plan.completed === completed) return;
                const nextPlans = s.studyPlan.map((p) =>
                  p.id === id ? { ...p, completed, missed: completed ? false : p.missed } : p
                );
                let lifetime = s.studyPlanLifetimeCheckoffs;
                if (completed) lifetime += 1;
                persist({ ...s, studyPlan: nextPlans, studyPlanLifetimeCheckoffs: lifetime });
              }}
              onTogglePlanMissed={(id, missed) => {
                const s = stateRef.current;
                const plan = s.studyPlan.find((p) => p.id === id);
                if (!plan || plan.missed === missed) return;
                const nextPlans = s.studyPlan.map((p) =>
                  p.id === id ? { ...p, missed, completed: missed ? false : p.completed } : p
                );
                let lifetimeMisses = s.studyPlanLifetimeMisses;
                if (missed) lifetimeMisses += 1;
                persist({ ...s, studyPlan: nextPlans, studyPlanLifetimeMisses: lifetimeMisses });
              }}
            />
          </div>
        )}

        {appTab === "focus" && (
          <section className="session-rename-card" aria-label="Rename recent focus sessions">
            <h2>Rename recent sessions</h2>
            <p className="focus-topic-rename__hint">Fix only today's most recent matching labels.</p>
            <div className="focus-topic-rename__row">
              <input
                type="text"
                className="focus-topic__input"
                placeholder="Rename from (today only)"
                maxLength={120}
                disabled={phase !== "idle"}
                value={renameTodayFrom}
                onChange={(e) => setRenameTodayFrom(e.target.value)}
              />
              <input
                type="text"
                className="focus-topic__input"
                placeholder="Rename to"
                maxLength={120}
                disabled={phase !== "idle"}
                value={renameTodayTo}
                onChange={(e) => setRenameTodayTo(e.target.value)}
              />
              <input
                type="number"
                className="focus-topic__input focus-topic-rename__count"
                min={1}
                max={20}
                step={1}
                placeholder="Count"
                aria-label="How many most recent matching sessions to rename"
                disabled={phase !== "idle"}
                value={renameTodayCount}
                onChange={(e) => setRenameTodayCount(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn--ghost focus-topic-rename__btn"
              onClick={renameTodaySessionLabels}
              disabled={phase !== "idle"}
            >
              Rename recent matching sessions (today)
            </button>
          </section>
        )}

        <button
          type="button"
          className="panel-toggle"
          onClick={() => setShowCustomize((s) => !s)}
          aria-expanded={showCustomize}
        >
          <span aria-hidden>🎨</span> Look &amp; feel
        </button>

        {showCustomize && (
          <aside className="customize" aria-label="Customize appearance">
            <h2>Make it yours</h2>

            <div className="field">
              <span className="field__label">Color mood</span>
              <div className="chip-row">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${appearance.themeId === id ? "chip--on" : ""}`}
                    onClick={() => updateAppearance({ themeId: id })}
                  >
                    {THEMES[id].emoji} {THEMES[id].label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className={`toast ${toast ? "toast--show" : ""}`} role="status">
          {toast}
        </div>
      </div>
    </>
  );
}
