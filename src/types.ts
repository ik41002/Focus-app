export type ThemeId = "sakura" | "mint" | "lavender" | "peach" | "sky";

export type MascotId = "sprout" | "star" | "moon" | "cloud";

export interface Appearance {
  themeId: ThemeId;
  mascotId: MascotId;
  /** 0 = subtle, 1 = default, 2 = extra round */
  roundness: 0 | 1 | 2;
}

export interface PersistedState {
  version: 1;
  totalFocusSeconds: number;
  sparkleCoins: number;
  streakDays: number;
  lastFocusDate: string | null; // YYYY-MM-DD local
  appearance: Appearance;
  /** minutes */
  lastPreset: number;
}

export const COINS_PER_FOCUS_MINUTE = 2;
export const STREAK_BONUS_COINS = 5;
