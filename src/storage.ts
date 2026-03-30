import type { Appearance, PersistedState } from "./types";

const KEY = "focus-garden-state-v1";

const defaultAppearance: Appearance = {
  themeId: "lavender",
};

/** Soft / Quicksand — fixed app typography */
export const APP_FONT_STACK = '"Quicksand", system-ui, sans-serif';

export const defaultState: PersistedState = {
  version: 8,
  totalFocusSeconds: 0,
  sparkleCoins: 0,
  streakDays: 0,
  lastFocusDate: null,
  appearance: defaultAppearance,
  lastPreset: 25,
  sessions: [],
  lastSessionLabel: "",
  studyPlan: [],
  studyPlanLifetimeCheckoffs: 0,
  studyPlanLifetimeMisses: 0,
};

function migrate(raw: unknown): PersistedState {
  const base = { ...defaultState, appearance: { ...defaultAppearance } };
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const ver = p.version;
  if (ver !== 1 && ver !== 2 && ver !== 3 && ver !== 4 && ver !== 5 && ver !== 6 && ver !== 7 && ver !== 8)
    return base;

  const appearance = {
    ...defaultAppearance,
    ...(typeof p.appearance === "object" && p.appearance !== null
      ? (p.appearance as Appearance)
      : {}),
  };

  if (ver === 1) {
    return {
      ...base,
      totalFocusSeconds: typeof p.totalFocusSeconds === "number" ? p.totalFocusSeconds : 0,
      sparkleCoins: typeof p.sparkleCoins === "number" ? p.sparkleCoins : 0,
      streakDays: typeof p.streakDays === "number" ? p.streakDays : 0,
      lastFocusDate:
        typeof p.lastFocusDate === "string" || p.lastFocusDate === null
          ? (p.lastFocusDate as string | null)
          : null,
      lastPreset: typeof p.lastPreset === "number" ? p.lastPreset : 25,
      appearance,
      sessions: [],
      lastSessionLabel: "",
      studyPlan: [],
      studyPlanLifetimeCheckoffs: 0,
      studyPlanLifetimeMisses: 0,
    };
  }

  const sessions = Array.isArray(p.sessions) ? (p.sessions as PersistedState["sessions"]) : [];
  const studyPlan = Array.isArray(p.studyPlan)
    ? p.studyPlan
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const id = typeof row.id === "string" ? row.id : null;
          const date = typeof row.date === "string" ? row.date : null;
          const subject = typeof row.subject === "string" ? row.subject : null;
          if (!id || !date || !subject) return null;

          const legacyTime = typeof row.time === "string" ? row.time : "16:00";
          const startTime = typeof row.startTime === "string" ? row.startTime : legacyTime;
          const endTime =
            typeof row.endTime === "string"
              ? row.endTime
              : startTime === "23:59"
                ? "23:59"
                : "17:00";
          const completed = typeof row.completed === "boolean" ? row.completed : false;
          const missed = typeof row.missed === "boolean" ? row.missed : false;
          const resolvedMissed = completed ? false : missed;

          return { id, date, subject, startTime, endTime, completed, missed: resolvedMissed };
        })
        .filter((item): item is PersistedState["studyPlan"][number] => item != null)
    : [];
  const studyPlanLifetimeCheckoffs =
    typeof p.studyPlanLifetimeCheckoffs === "number" ? p.studyPlanLifetimeCheckoffs : 0;
  const studyPlanLifetimeMisses =
    typeof p.studyPlanLifetimeMisses === "number" ? p.studyPlanLifetimeMisses : 0;
  return {
    ...base,
    totalFocusSeconds: typeof p.totalFocusSeconds === "number" ? p.totalFocusSeconds : 0,
    sparkleCoins: typeof p.sparkleCoins === "number" ? p.sparkleCoins : 0,
    streakDays: typeof p.streakDays === "number" ? p.streakDays : 0,
    lastFocusDate:
      typeof p.lastFocusDate === "string" || p.lastFocusDate === null
        ? (p.lastFocusDate as string | null)
        : null,
    lastPreset: typeof p.lastPreset === "number" ? p.lastPreset : 25,
    appearance,
    sessions,
    lastSessionLabel: typeof p.lastSessionLabel === "string" ? p.lastSessionLabel : "",
    studyPlan,
    studyPlanLifetimeCheckoffs,
    studyPlanLifetimeMisses,
    version: 8,
  };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState, appearance: { ...defaultAppearance } };
    return migrate(JSON.parse(raw));
  } catch {
    return { ...defaultState, appearance: { ...defaultAppearance } };
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
