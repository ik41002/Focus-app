import { useMemo, useState, type FormEvent } from "react";
import type { StudyPlanItem } from "../types";

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
  return a.time.localeCompare(b.time);
}

export function StudyPlanner({
  plans,
  onAddPlan,
  onRemovePlan,
}: {
  plans: StudyPlanItem[];
  onAddPlan: (input: { date: string; time: string; subject: string }) => void;
  onRemovePlan: (id: string) => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("16:00");
  const [subject, setSubject] = useState("");

  const sortedPlans = useMemo(() => [...plans].sort(comparePlanItems), [plans]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanSubject = subject.trim();
    if (!cleanSubject) return;
    onAddPlan({ date, time, subject: cleanSubject });
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
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
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
          <ul className="study-planner__list">
            {sortedPlans.map((plan) => (
              <li key={plan.id} className="study-planner__item">
                <div className="study-planner__item-main">
                  <p className="study-planner__item-subject">{plan.subject}</p>
                  <p className="study-planner__item-time">
                    {formatPlanDate(plan.date)} at {plan.time}
                  </p>
                </div>
                <button
                  type="button"
                  className="study-planner__remove"
                  onClick={() => onRemovePlan(plan.id)}
                  aria-label={`Remove ${plan.subject} on ${plan.date} at ${plan.time}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
