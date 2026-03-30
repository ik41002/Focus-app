import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { StudyPlanItem } from "../types";

const DURATION_PRESETS = [25, 45, 60] as const;

function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function comparePlanItems(a: StudyPlanItem, b: StudyPlanItem) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.startTime.localeCompare(b.startTime);
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hRaw, mRaw] = time.split(":");
  const h = Number.parseInt(hRaw, 10);
  const m = Number.parseInt(mRaw, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = h * 60 + m + minutesToAdd;
  const capped = Math.min(total, 23 * 60 + 59);
  const outH = Math.floor(capped / 60);
  const outM = capped % 60;
  return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

/** Monday 00:00 local week start for the week containing `d`. */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StudyPlanner({
  plans,
  canStartPlanNow,
  onStartPlanFocus,
  onAddPlan,
  onRemovePlan,
}: {
  plans: StudyPlanItem[];
  canStartPlanNow: (plan: StudyPlanItem) => boolean;
  onStartPlanFocus: (plan: StudyPlanItem) => void;
  onAddPlan: (input: { date: string; startTime: string; endTime: string; subject: string }) => void;
  onRemovePlan: (id: string) => void;
}) {
  const todayKeyValue = useMemo(() => localDateKey(), []);
  const [date, setDate] = useState(todayKeyValue);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");
  const [subject, setSubject] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | "custom">(60);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  /** 0 = this calendar week (Mon–Sun); ±1 = prev/next week */
  const [weekOffset, setWeekOffset] = useState(0);

  const sortedPlans = useMemo(() => [...plans].sort(comparePlanItems), [plans]);

  const weekContext = useMemo(() => {
    const anchor = addDays(new Date(), weekOffset * 7);
    const monday = startOfWeekMonday(anchor);
    const dayCells = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const dateKey = localDateKeyFromDate(d);
      const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayNum = d.toLocaleDateString(undefined, { day: "numeric" });
      const isToday = dateKey === todayKeyValue;
      return { dateKey, weekday, dayNum, isToday, date: d };
    });
    const rangeLabel = (() => {
      const a = dayCells[0].date;
      const b = dayCells[6].date;
      const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
      const left = a.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const right = sameMonth
        ? b.toLocaleDateString(undefined, { day: "numeric", year: "numeric" })
        : b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return `${left} – ${right}`;
    })();
    return { dayCells, rangeLabel };
  }, [weekOffset, todayKeyValue]);

  const plansForWeekDays = useMemo(() => {
    const map = new Map<string, StudyPlanItem[]>();
    for (const cell of weekContext.dayCells) {
      map.set(cell.dateKey, []);
    }
    const weekKeys = new Set(weekContext.dayCells.map((c) => c.dateKey));
    for (const p of sortedPlans) {
      if (weekKeys.has(p.date)) {
        map.get(p.date)!.push(p);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [sortedPlans, weekContext.dayCells]);

  const plansOutsideWeek = useMemo(() => {
    const weekKeys = new Set(weekContext.dayCells.map((c) => c.dateKey));
    return sortedPlans.filter((p) => !weekKeys.has(p.date));
  }, [sortedPlans, weekContext.dayCells]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((v) => v + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanSubject = subject.trim();
    if (!cleanSubject) return;
    if (endTime <= startTime) {
      setTimeError("End time must be later than start time.");
      return;
    }
    setTimeError(null);
    onAddPlan({ date, startTime, endTime, subject: cleanSubject });
    setSubject("");
  };

  return (
    <div className="study-planner">
      <section className="study-planner__card study-planner__card--form" aria-labelledby="study-planner-heading">
        <h2 id="study-planner-heading" className="study-planner__title">
          Study planner
        </h2>
        <p className="study-planner__subtitle">
          Plan when you will focus and what subject you want to tackle.
        </p>

        <form className="study-planner__form" onSubmit={submit}>
          <label className="study-planner__field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label className="study-planner__field">
            <span>Start</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                const nextStart = e.target.value;
                setStartTime(nextStart);
                if (selectedDuration !== "custom") {
                  setEndTime(addMinutesToTime(nextStart, selectedDuration));
                }
                if (timeError) setTimeError(null);
              }}
              required
            />
          </label>

          <div className="study-planner__field study-planner__field--wide">
            <span>Duration</span>
            <div className="study-planner__durations">
              {DURATION_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`preset-btn ${selectedDuration === minutes ? "preset-btn--active" : ""}`}
                  onClick={() => {
                    setSelectedDuration(minutes);
                    setEndTime(addMinutesToTime(startTime, minutes));
                    if (timeError) setTimeError(null);
                  }}
                >
                  {minutes} min
                </button>
              ))}
              <button
                type="button"
                className={`preset-btn ${selectedDuration === "custom" ? "preset-btn--active" : ""}`}
                onClick={() => setSelectedDuration("custom")}
              >
                Custom end
              </button>
            </div>
          </div>

          <label className="study-planner__field">
            <span>End</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setSelectedDuration("custom");
                if (timeError) setTimeError(null);
              }}
              required
            />
          </label>

          <label className="study-planner__field study-planner__field--wide">
            <span>Subject</span>
            <input
              type="text"
              value={subject}
              maxLength={100}
              placeholder="e.g. Biology - chapter 4"
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn btn--primary">
            Add focus block
          </button>
          {timeError && <p className="study-planner__error">{timeError}</p>}
        </form>
      </section>

      <section
        className="study-planner__card study-planner__card--week"
        aria-labelledby="study-plan-week-heading"
        data-now-tick={nowTick}
      >
        <div className="study-planner__week-head">
          <h2 id="study-plan-week-heading" className="study-planner__title">
            Week overview
          </h2>
          <div className="study-planner__week-toolbar" role="group" aria-label="Week navigation">
            <button
              type="button"
              className="study-planner__week-nav"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
            >
              ‹
            </button>
            <span className="study-planner__week-range" aria-live="polite">
              {weekContext.rangeLabel}
            </span>
            <button
              type="button"
              className="study-planner__week-nav"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
            >
              ›
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                className="study-planner__week-today"
                onClick={() => setWeekOffset(0)}
              >
                This week
              </button>
            )}
          </div>
        </div>
        <p className="study-planner__week-hint">Monday–Sunday · times are local</p>

        {sortedPlans.length === 0 ? (
          <p className="study-planner__empty">
            No focus blocks yet. Add your first one above to fill this week.
          </p>
        ) : (
          <>
            <div className="study-planner__week-scroll">
              <div className="study-planner__week-grid">
                {weekContext.dayCells.map((cell) => {
                  const dayPlans = plansForWeekDays.get(cell.dateKey) ?? [];
                  return (
                    <div
                      key={cell.dateKey}
                      className={`study-planner__week-day ${cell.isToday ? "study-planner__week-day--today" : ""}`}
                    >
                      <div className="study-planner__week-day-head">
                        <span className="study-planner__week-day-name">{cell.weekday}</span>
                        <span className="study-planner__week-day-num">{cell.dayNum}</span>
                      </div>
                      <ul className="study-planner__week-blocks">
                        {dayPlans.length === 0 ? (
                          <li className="study-planner__week-empty">—</li>
                        ) : (
                          dayPlans.map((plan) => (
                            <li key={plan.id} className="study-planner__week-block">
                              <p className="study-planner__week-block-subject" title={plan.subject}>
                                {plan.subject}
                              </p>
                              <p className="study-planner__week-block-time">
                                {plan.startTime}–{plan.endTime}
                              </p>
                              <div className="study-planner__week-block-actions">
                                {canStartPlanNow(plan) && (
                                  <button
                                    type="button"
                                    className="btn btn--primary study-planner__start"
                                    onClick={() => onStartPlanFocus(plan)}
                                    aria-label={`Start planned focus for ${plan.subject}`}
                                  >
                                    Start
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="study-planner__remove"
                                  onClick={() => onRemovePlan(plan.id)}
                                  aria-label={`Remove ${plan.subject}`}
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
            {plansOutsideWeek.length > 0 && (
              <p className="study-planner__week-footnote">
                {plansOutsideWeek.length} block{plansOutsideWeek.length === 1 ? "" : "s"} on other
                weeks (use arrows to browse).
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
