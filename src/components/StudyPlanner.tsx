import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { StudyPlanItem } from "../types";

const DURATION_PRESETS = [25, 45, 60] as const;

function formatPlanDate(date: string) {
  const asDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(asDate.getTime())) return date;
  return asDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

export function StudyPlanner({
  plans,
  completedPlans,
  forgottenPlans,
  canStartPlanNow,
  onStartPlanFocus,
  onAddPlan,
  onRemovePlan,
  onRemoveCompletedPlan,
  onRemoveForgottenPlan,
}: {
  plans: StudyPlanItem[];
  completedPlans: StudyPlanItem[];
  forgottenPlans: StudyPlanItem[];
  canStartPlanNow: (plan: StudyPlanItem) => boolean;
  onStartPlanFocus: (plan: StudyPlanItem) => void;
  onAddPlan: (input: { date: string; startTime: string; endTime: string; subject: string }) => void;
  onRemovePlan: (id: string) => void;
  onRemoveCompletedPlan: (id: string) => void;
  onRemoveForgottenPlan: (id: string) => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");
  const [subject, setSubject] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | "custom">(60);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  const sortedPlans = useMemo(() => [...plans].sort(comparePlanItems), [plans]);
  const sortedCompletedPlans = useMemo(() => [...completedPlans].sort(comparePlanItems), [completedPlans]);
  const sortedForgottenPlans = useMemo(() => [...forgottenPlans].sort(comparePlanItems), [forgottenPlans]);

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
      <section className="study-planner__card" aria-labelledby="study-planner-heading">
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

      <section className="study-planner__card" aria-labelledby="study-plan-list-heading">
        <h2 id="study-plan-list-heading" className="study-planner__title">
          Upcoming plan
        </h2>

        {sortedPlans.length === 0 ? (
          <p className="study-planner__empty">
            No focus blocks yet. Add your first one to start shaping your week.
          </p>
        ) : (
          <ul className="study-planner__list" data-now-tick={nowTick}>
            {sortedPlans.map((plan) => (
              <li key={plan.id} className="study-planner__item">
                <div className="study-planner__item-main">
                  <p className="study-planner__item-subject">{plan.subject}</p>
                  <p className="study-planner__item-time">
                    {formatPlanDate(plan.date)} · {plan.startTime} - {plan.endTime}
                  </p>
                </div>
                <div className="study-planner__item-actions">
                  {canStartPlanNow(plan) && (
                    <button
                      type="button"
                      className="btn btn--primary study-planner__start"
                      onClick={() => onStartPlanFocus(plan)}
                      aria-label={`Start planned focus for ${plan.subject}`}
                    >
                      Start focus now
                    </button>
                  )}
                  <button
                    type="button"
                    className="study-planner__remove"
                    onClick={() => onRemovePlan(plan.id)}
                    aria-label={`Remove ${plan.subject} on ${plan.date} from ${plan.startTime} to ${plan.endTime}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="study-planner__card" aria-labelledby="study-plan-completed-heading">
        <h2 id="study-plan-completed-heading" className="study-planner__title">
          Completed plan
        </h2>
        {sortedCompletedPlans.length === 0 ? (
          <p className="study-planner__empty">Completed planned sessions will appear here.</p>
        ) : (
          <ul className="study-planner__list">
            {sortedCompletedPlans.map((plan) => (
              <li key={plan.id} className="study-planner__item">
                <div className="study-planner__item-main">
                  <p className="study-planner__item-subject">{plan.subject}</p>
                  <p className="study-planner__item-time">
                    {formatPlanDate(plan.date)} · {plan.startTime} - {plan.endTime}
                  </p>
                </div>
                <div className="study-planner__item-actions">
                  <button
                    type="button"
                    className="study-planner__remove"
                    onClick={() => onRemoveCompletedPlan(plan.id)}
                    aria-label={`Remove completed ${plan.subject} on ${plan.date}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="study-planner__card" aria-labelledby="study-plan-forgotten-heading">
        <h2 id="study-plan-forgotten-heading" className="study-planner__title">
          Forgotten box
        </h2>
        {sortedForgottenPlans.length === 0 ? (
          <p className="study-planner__empty">Missed planned sessions are kept here so they are not forgotten.</p>
        ) : (
          <ul className="study-planner__list">
            {sortedForgottenPlans.map((plan) => (
              <li key={plan.id} className="study-planner__item">
                <div className="study-planner__item-main">
                  <p className="study-planner__item-subject">{plan.subject}</p>
                  <p className="study-planner__item-time">
                    {formatPlanDate(plan.date)} · {plan.startTime} - {plan.endTime}
                  </p>
                </div>
                <div className="study-planner__item-actions">
                  <button
                    type="button"
                    className="study-planner__remove"
                    onClick={() => onRemoveForgottenPlan(plan.id)}
                    aria-label={`Remove forgotten ${plan.subject} on ${plan.date}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
