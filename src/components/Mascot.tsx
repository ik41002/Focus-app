const BUDDY = {
  name: "Sprout",
  idle: "🌱",
  happy: "🌿",
} as const;

export function Mascot({
  celebrating,
  streakDays,
}: {
  celebrating: boolean;
  streakDays: number;
}) {
  const face = celebrating ? BUDDY.happy : BUDDY.idle;
  return (
    <div className="mascot">
      <div className={`mascot__bubble ${celebrating ? "mascot__bubble--pop" : ""}`}>
        <span className="mascot__emoji" role="img" aria-label={BUDDY.name}>
          {face}
        </span>
      </div>
      <p className="mascot__name">{BUDDY.name}</p>
      {streakDays > 0 ? (
        <p className="mascot__caption">
          {streakDays}-day streak — you’re doing amazing!
        </p>
      ) : (
        <p className="mascot__caption">Keep showing up — we grow together.</p>
      )}
    </div>
  );
}
