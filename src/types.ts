export type ThemeId = "sakura" | "mint" | "lavender" | "peach" | "sky";

export interface Appearance {
  themeId: ThemeId;
}

export interface FocusSession {
  id: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  seconds: number;
  /** What you focused on (may be empty) */
  label: string;
}

export interface PersistedState {
  version: 2;
  totalFocusSeconds: number;
  sparkleCoins: number;
  streakDays: number;
  lastFocusDate: string | null; // YYYY-MM-DD local
  appearance: Appearance;
  /** minutes */
  lastPreset: number;
  /** Logged focus sessions (newest appended last) */
  sessions: FocusSession[];
  /** Prefills the “what are you focusing on?” field */
  lastSessionLabel: string;
}

export const COINS_PER_FOCUS_MINUTE = 2;
export const STREAK_BONUS_COINS = 5;
