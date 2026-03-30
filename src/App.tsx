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

type Phase = "idle" | "running";
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
  const startWithLeeway = Math.max(0, startMin - PLANNED_TIME_LEEWAY_MIN);
  const endWithLeeway = Math.min(23 * 60 + 59, endMin + PLANNED_TIME_LEEWAY_MIN);
  return atMin >= startWithLeeway && atMin < endWithLeeway;
}

function isPlannedStudyTime(
  studyPlan: { date: string; startTime: string; endTime: string }[],
  startedAt: Date | null
) {
  return studyPlan.some((item) => isPlanTimeMatch(item, startedAt));
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
  const startedGoalSecRef = useRef(0);
  const sessionStartedAtRef = useRef<Date | null>(null);
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const creditSession = useCallback(
    (focusedSeconds: number, startedAt: Date | null) => {
      const s = stateRef.current;
      const wholeMinutes = Math.floor(focusedSeconds / 60);
      if (wholeMinutes < 1) {
        showToast("Focus at least 1 minute to earn sparkles ✨");
        return;
      }
      const baseCoins = wholeMinutes * COINS_PER_FOCUS_MINUTE;
      const streakInfo = nextStreakState(s.streakDays, s.lastFocusDate, todayKey());
      const bonus = streakInfo.streakJustIncreased ? STREAK_BONUS_COINS : 0;
      const isPlanned = isPlannedStudyTime(s.studyPlan, startedAt);
      const earned = (baseCoins + bonus) * (isPlanned ? 2 : 1);
      const label = sessionLabelRef.current.trim();
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
    },
    [persist, showToast]
  );

  const startSession = () => {
    if (phase === "running") return;
    startedGoalSecRef.current = goalSeconds;
    sessionStartedAtRef.current = new Date();
    setRemainingSec(goalSeconds);
    setPhase("running");
    persist({ ...stateRef.current, lastPreset: goalMin });

    tickRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearTick();
          setPhase("idle");
          const g = startedGoalSecRef.current;
          const startedAt = sessionStartedAtRef.current;
          sessionStartedAtRef.current = null;
          window.setTimeout(() => creditSession(g, startedAt), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPlannedSession = (plan: StudyPlanItem) => {
    if (phase === "running") return;
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

    tickRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearTick();
          setPhase("idle");
          const g = startedGoalSecRef.current;
          const startedAt = sessionStartedAtRef.current;
          sessionStartedAtRef.current = null;
          window.setTimeout(() => creditSession(g, startedAt), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endSessionEarly = () => {
    if (phase !== "running") return;
    clearTick();
    const elapsed = startedGoalSecRef.current - remainingSec;
    const startedAt = sessionStartedAtRef.current;
    sessionStartedAtRef.current = null;
    setPhase("idle");
    setRemainingSec(0);
    creditSession(elapsed, startedAt);
  };

  const cancelSession = () => {
    if (phase !== "running") return;
    clearTick();
    sessionStartedAtRef.current = null;
    setPhase("idle");
    setRemainingSec(0);
    showToast("Session paused — your progress wasn’t saved.");
  };

  useEffect(() => () => clearTick(), [clearTick]);

  const progress =
    phase === "running" && startedGoalSecRef.current > 0
      ? 1 - remainingSec / startedGoalSecRef.current
      : 0;
  const strokeDashoffset = CIRC * (1 - Math.min(1, Math.max(0, progress)));

  const updateAppearance = (patch: Partial<Appearance>) => {
    const nextApp = { ...state.appearance, ...patch };
    persist({ ...state, appearance: nextApp });
  };

  const displayTime =
    phase === "running" ? remainingSec : goalSeconds;

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
            disabled={phase === "running"}
            title={phase === "running" ? "Finish or cancel your session to view history" : undefined}
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
            disabled={phase === "running"}
            title={phase === "running" ? "Finish or cancel your session to visit your buddy" : undefined}
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
              disabled={phase === "running"}
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
                disabled={phase === "running"}
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
              disabled={phase === "running"}
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
                  strokeDashoffset={phase === "running" ? strokeDashoffset : 0}
                  style={{
                    opacity: phase === "running" ? 1 : 0.35,
                  }}
                />
              </svg>
              <div className="timer-ring__center">
                <span className="timer-ring__time">{formatMMSS(displayTime)}</span>
                <span className="timer-ring__sub">
                  {phase === "running" ? "remaining" : "planned focus"}
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
                    Focusing…
                  </button>
                </div>
                <div className="actions__row">
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
                const nextItem = { id: newStudyPlanId(), date, startTime, endTime, subject };
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
            />
          </div>
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
