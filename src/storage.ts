import type { Appearance, PersistedState } from "./types";

const KEY = "focus-garden-state-v1";

const defaultAppearance: Appearance = {
  themeId: "lavender",
  fontId: "fredoka",
  mascotId: "sprout",
  roundness: 1,
};

export const defaultState: PersistedState = {
  version: 1,
  totalFocusSeconds: 0,
  sparkleCoins: 0,
  streakDays: 0,
  lastFocusDate: null,
  appearance: defaultAppearance,
  lastPreset: 25,
};

function fontStack(fontId: Appearance["fontId"]): string {
  switch (fontId) {
    case "fredoka":
      return '"Fredoka", system-ui, sans-serif';
    case "quicksand":
      return '"Quicksand", system-ui, sans-serif';
    case "dmSans":
      return '"DM Sans", system-ui, sans-serif';
    default:
      return '"Fredoka", system-ui, sans-serif';
  }
}

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

export { fontStack };
