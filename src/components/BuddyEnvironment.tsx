import { useEffect, useState } from "react";
import { SproutBuddy, type BuddyMood } from "./SproutBuddy";

const HOUR = 60 * 60;

function moodFromTodaySeconds(sec: number): BuddyMood {
  if (sec <= 0) return "waiting";
  if (sec < 3 * HOUR) return "fine";
  if (sec < 5 * HOUR) return "happy";
  if (sec < 8 * HOUR) return "excited";
  return "ecstatic";
}

function formatTodayMinutes(sec: number) {
  const m = Math.floor(sec / 60);
  if (m < 1) return "Less than a minute logged today";
  return `${m} min focused today`;
}

export function BuddyEnvironment({
  todayFocusSeconds,
  onGoFocus,
}: {
  todayFocusSeconds: number;
  onGoFocus: () => void;
}) {
  const mood = moodFromTodaySeconds(todayFocusSeconds);
  const [tapLine, setTapLine] = useState<string | null>(null);

  useEffect(() => {
    if (!tapLine) return;
    const t = window.setTimeout(() => setTapLine(null), 2200);
    return () => window.clearTimeout(t);
  }, [tapLine]);

  const handleBuddyTap = () => {
    const lines =
      mood === "waiting"
        ? ["...thanks for checking in.", "I miss our focus time.", "One session and we can start growing."]
        : mood === "fine"
          ? ["Nice start today.", "You're helping me feel steady.", "A little focus already makes a difference."]
          : mood === "happy"
            ? ["We're building real momentum.", "This day feels bright.", "You're taking great care of this garden."]
            : mood === "excited"
              ? ["Wow, this is a strong day!", "I'm buzzing with energy.", "You and I are in a deep flow."]
              : ["We did it!", "This garden is absolutely thriving.", "Eight hours and beyond - legendary focus."];
    setTapLine(lines[Math.floor(Math.random() * lines.length)]);
  };

  return (
    <div className="buddy-environment">
      <section className="buddy-environment__intro" aria-labelledby="buddy-env-heading">
        <h2 id="buddy-env-heading" className="buddy-environment__title">
          Buddy garden
        </h2>
        <p className="buddy-environment__lede">
          Sprout reflects how today’s focus feels: quiet mornings feel lonely until you show up, then
          the garden comes alive.
        </p>
      </section>

      <div className="buddy-environment__stage">
        <SproutBuddy mood={mood} interactive onTap={handleBuddyTap} />
        <p className="buddy-environment__name">Sprout</p>
        <p className="mascot__caption buddy-environment__caption">
          {mood === "waiting"
            ? "Sprout is feeling gloomy - focus today to bring the garden back to life."
            : mood === "fine"
              ? "Sprout feels fine - a gentle start is already helping the garden."
              : mood === "happy"
                ? "Sprout is happy - your 3-5 hours of focus are really paying off."
                : mood === "excited"
                  ? "Sprout is excited - this 5-8 hour stretch is powering the whole garden."
                  : "Sprout is ecstatic - 8+ hours of focus made today extraordinary."}
        </p>
        {tapLine && <p className="buddy-environment__reaction">"{tapLine}"</p>}
        <p className="buddy-environment__stat">{formatTodayMinutes(todayFocusSeconds)}</p>
        {mood === "waiting" && (
          <button type="button" className="btn btn--primary buddy-environment__cta" onClick={onGoFocus}>
            Start a focus session
          </button>
        )}
      </div>
    </div>
  );
}
