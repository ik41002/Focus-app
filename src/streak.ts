import type { FocusSession } from "./types";
import { subjectGroupKey } from "./subjectColors";

/** Local calendar date YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Total credited focus seconds on a calendar day (sum of sessions for `dateKey`). */
export function focusSecondsForDate(sessions: FocusSession[], dateKey: string): number {
  let t = 0;
  for (const s of sessions) {
    if (s.date === dateKey) t += s.seconds;
  }
  return t;
}

export function yesterdayKey(d = new Date()): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - 1);
  return todayKey(copy);
}

export interface StreakUpdate {
  streakDays: number;
  lastFocusDate: string;
  streakJustIncreased: boolean;
}

/** Update streak after a credited focus session on `sessionDate` (defaults to today). */
export function nextStreakState(
  prevStreak: number,
  lastFocusDate: string | null,
  sessionDate = todayKey()
): StreakUpdate {
  if (lastFocusDate === sessionDate) {
    return {
      streakDays: prevStreak,
      lastFocusDate: sessionDate,
      streakJustIncreased: false,
    };
  }
  const y = yesterdayKey(new Date(sessionDate + "T12:00:00"));
  if (lastFocusDate === y) {
    return {
      streakDays: prevStreak + 1,
      lastFocusDate: sessionDate,
      streakJustIncreased: true,
    };
  }
  return {
    streakDays: 1,
    lastFocusDate: sessionDate,
    streakJustIncreased: prevStreak === 0,
  };
}

/** One point per calendar day for charts (seconds aggregated from sessions). */
export interface DailyFocusPoint {
  dateKey: string;
  seconds: number;
}

/** Oldest → newest local calendar keys covering the last `numDays` days including `endDate`. */
export function lastNDaysKeys(endDate: Date, numDays: number): string[] {
  const out: string[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

/** Totals focus seconds per day for the sliding window ending on `endDate`. */
export function dailyFocusSeries(
  sessions: FocusSession[],
  endDate: Date,
  numDays: number
): DailyFocusPoint[] {
  const keys = lastNDaysKeys(endDate, numDays);
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, 0);
  for (const s of sessions) {
    if (map.has(s.date)) map.set(s.date, (map.get(s.date) ?? 0) + s.seconds);
  }
  return keys.map((dateKey) => ({ dateKey, seconds: map.get(dateKey) ?? 0 }));
}

/** One subject’s share of focus on a single calendar day. */
export interface DaySubjectPart {
  subjectKey: string;
  displayLabel: string;
  seconds: number;
}

/** Per-day total plus breakdown by topic (normalized label). */
export interface DailyFocusBreakdown {
  dateKey: string;
  seconds: number;
  parts: DaySubjectPart[];
}

/** Like `dailyFocusSeries`, but splits each day by topic so bars can stack. */
export function dailyFocusSeriesBySubject(
  sessions: FocusSession[],
  endDate: Date,
  numDays: number
): DailyFocusBreakdown[] {
  const keys = lastNDaysKeys(endDate, numDays);
  const out: DailyFocusBreakdown[] = [];

  for (const dateKey of keys) {
    const partsMap = new Map<string, DaySubjectPart>();
    for (const s of sessions) {
      if (s.date !== dateKey) continue;
      const sk = subjectGroupKey(s.label);
      const cur = partsMap.get(sk);
      if (cur) {
        cur.seconds += s.seconds;
      } else {
        partsMap.set(sk, {
          subjectKey: sk,
          displayLabel: s.label.trim(),
          seconds: s.seconds,
        });
      }
    }
    const parts = [...partsMap.values()].sort((a, b) => b.seconds - a.seconds);
    const seconds = parts.reduce((a, p) => a + p.seconds, 0);
    out.push({ dateKey, seconds, parts });
  }
  return out;
}

export function weekdayShortLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Weekday + calendar date for history UI (locale-aware). */
export function calendarDayParts(dateKey: string): { weekday: string; dateLine: string } {
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    dateLine: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  };
}

export function newFocusSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** One slot in a Sun–Sat month grid; `dateKey` null = padding outside the month. */
export interface MonthCalendarCell {
  dateKey: string | null;
  seconds: number;
}

/** Focus seconds per day for `year` / `monthIndex` (0–11), plus a padded Sun–Sat grid. */
export function monthFocusCalendar(
  sessions: FocusSession[],
  year: number,
  monthIndex: number
): { cells: MonthCalendarCell[]; maxSeconds: number } {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.date.startsWith(prefix)) continue;
    byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.seconds);
  }

  let maxSeconds = 0;
  for (const v of byDay.values()) maxSeconds = Math.max(maxSeconds, v);

  const numDays = new Date(year, monthIndex + 1, 0).getDate();
  const leading = new Date(year, monthIndex, 1).getDay();
  const cells: MonthCalendarCell[] = [];

  for (let i = 0; i < leading; i++) {
    cells.push({ dateKey: null, seconds: 0 });
  }
  for (let day = 1; day <= numDays; day++) {
    const dk = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const seconds = byDay.get(dk) ?? 0;
    cells.push({ dateKey: dk, seconds });
  }
  const total = leading + numDays;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 0; i < trailing; i++) {
    cells.push({ dateKey: null, seconds: 0 });
  }

  return { cells, maxSeconds };
}
