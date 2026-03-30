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

export interface StudyPlanItem {
  id: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  /** 24h time HH:mm */
  startTime: string;
  /** 24h time HH:mm */
  endTime: string;
  subject: string;
  /** Manually marked done in the planner */
  completed: boolean;
  /** Manually marked missed (mutually exclusive with completed) */
  missed: boolean;
}

export interface PersistedState {
  version: 8;
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
  /** Planned future focus blocks */
  studyPlan: StudyPlanItem[];
  /** Times you marked a planned block complete (only increases on check-off, not on uncheck) */
  studyPlanLifetimeCheckoffs: number;
  /** Times you marked a planned block missed (only increases when checking missed on, not on uncheck) */
  studyPlanLifetimeMisses: number;
}

export const COINS_PER_FOCUS_MINUTE = 2;
export const STREAK_BONUS_COINS = 5;
