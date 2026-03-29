import type { MascotId } from "../types";

const MASCOTS: Record<MascotId, { label: string; idle: string; happy: string }> = {
  sprout: { label: "Sprout", idle: "🌱", happy: "🌿" },
  star: { label: "Little star", idle: "✨", happy: "⭐" },
  moon: { label: "Moon", idle: "🌙", happy: "🌕" },
  cloud: { label: "Cloud", idle: "☁️", happy: "🌈" },
};

export function Mascot({
  mascotId,
  celebrating,
  streakDays,
}: {
  mascotId: MascotId;
  celebrating: boolean;
  streakDays: number;
}) {
  const m = MASCOTS[mascotId];
  const face = celebrating ? m.happy : m.idle;
  return (
    <div className="mascot">
      <div className={`mascot__bubble ${celebrating ? "mascot__bubble--pop" : ""}`}>
        <span className="mascot__emoji" role="img" aria-label={m.label}>
          {face}
        </span>
      </div>
      {streakDays > 0 && (
        <p className="mascot__caption">
          {streakDays}-day streak — you’re doing amazing!
        </p>
      )}
    </div>
  );
}
