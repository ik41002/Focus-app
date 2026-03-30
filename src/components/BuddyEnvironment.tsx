import { SproutBuddy, type BuddyMood } from "./SproutBuddy";

const RADIANT_MINUTES = 25;

function moodFromTodaySeconds(sec: number): BuddyMood {
  if (sec <= 0) return "waiting";
  if (sec < RADIANT_MINUTES * 60) return "content";
  return "radiant";
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
        <SproutBuddy mood={mood} />
        <p className="buddy-environment__name">Sprout</p>
        <p className="mascot__caption buddy-environment__caption">
          {mood === "waiting"
            ? "Sprout is feeling gloomy - focus today to bring the garden back to life."
            : mood === "content"
              ? "Sprout is perking up - you've already nourished the garden today."
              : "Sprout is beaming - you gave this day real depth."}
        </p>
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
