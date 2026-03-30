const BUDDY = {
  name: "Sprout",
  idle: "🌱",
  happy: "🌿",
  /** Buddy tab: no credited focus yet today */
  waiting: "🥀",
  /** Buddy tab: some focus today */
  content: "🌿",
  /** Buddy tab: a solid day of focus */
  radiant: "🌳",
} as const;

export type BuddyEnvironmentMood = "waiting" | "content" | "radiant";

export function Mascot({
  celebrating,
  streakDays,
  environmentMood,
}: {
  celebrating: boolean;
  streakDays: number;
  /** When set (buddy tab), drives face and caption instead of idle/celebration */
  environmentMood?: BuddyEnvironmentMood;
}) {
  const face = environmentMood
    ? environmentMood === "waiting"
      ? BUDDY.waiting
      : environmentMood === "content"
        ? BUDDY.content
        : BUDDY.radiant
    : celebrating
      ? BUDDY.happy
      : BUDDY.idle;

  const bubblePop =
    environmentMood === "radiant" || (!environmentMood && celebrating);

  const caption = environmentMood
    ? environmentMood === "waiting"
      ? "Sprout is feeling gloomy — focus today to bring the garden back to life."
      : environmentMood === "content"
        ? "Sprout is perking up — you’ve already nourished the garden today."
        : "Sprout is beaming — you gave this day real depth."
    : streakDays > 0
      ? `${streakDays}-day streak — you’re doing amazing!`
      : "Keep showing up — we grow together.";

  return (
    <div className="mascot">
      <div
        className={`mascot__bubble ${bubblePop ? "mascot__bubble--pop" : ""} ${
          environmentMood === "waiting" ? "mascot__bubble--dim" : ""
        }`}
      >
        <span className="mascot__emoji" role="img" aria-label={BUDDY.name}>
          {face}
        </span>
      </div>
      <p className="mascot__name">{BUDDY.name}</p>
      <p className="mascot__caption">{caption}</p>
    </div>
  );
}
