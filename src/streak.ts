/** Local calendar date YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
