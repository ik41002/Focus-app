import type { Appearance, PersistedState } from "./types";

const KEY = "focus-garden-state-v1";

const defaultAppearance: Appearance = {
  themeId: "lavender",
};

/** Soft / Quicksand — fixed app typography */
export const APP_FONT_STACK = '"Quicksand", system-ui, sans-serif';

export const defaultState: PersistedState = {
  version: 3,
  totalFocusSeconds: 0,
  sparkleCoins: 0,
  streakDays: 0,
  lastFocusDate: null,
  appearance: defaultAppearance,
  lastPreset: 25,
  sessions: [],
  lastSessionLabel: "",
  studyPlan: [],
};

function migrate(raw: unknown): PersistedState {
  const base = { ...defaultState, appearance: { ...defaultAppearance } };
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const ver = p.version;
  if (ver !== 1 && ver !== 2 && ver !== 3) return base;

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
    };
  }

  const sessions = Array.isArray(p.sessions) ? (p.sessions as PersistedState["sessions"]) : [];
  const studyPlan = Array.isArray(p.studyPlan) ? (p.studyPlan as PersistedState["studyPlan"]) : [];
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
