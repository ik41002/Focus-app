import type { Appearance, PersistedState } from "./types";

const KEY = "focus-garden-state-v1";

const defaultAppearance: Appearance = {
  themeId: "lavender",
  mascotId: "sprout",
};

/** Soft / Quicksand — fixed app typography */
export const APP_FONT_STACK = '"Quicksand", system-ui, sans-serif';

export const defaultState: PersistedState = {
  version: 1,
  totalFocusSeconds: 0,
  sparkleCoins: 0,
  streakDays: 0,
  lastFocusDate: null,
  appearance: defaultAppearance,
  lastPreset: 25,
};

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState, appearance: { ...defaultAppearance } };
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1) return { ...defaultState, appearance: { ...defaultAppearance } };
    return {
      ...defaultState,
      ...parsed,
      appearance: { ...defaultAppearance, ...parsed.appearance },
    };
  } catch {
    return { ...defaultState, appearance: { ...defaultAppearance } };
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
