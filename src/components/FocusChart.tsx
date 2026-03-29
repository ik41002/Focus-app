import { useMemo } from "react";
import type { DailyFocusPoint } from "../streak";
import { calendarDayParts } from "../streak";

type Props = {
  series: DailyFocusPoint[];
};

const BAR_MAX_H = 96;

export function FocusChart({ series }: Props) {
  const { maxSec, cells } = useMemo(() => {
    const maxSec = series.reduce((m, p) => Math.max(m, p.seconds), 0);
    const scaleMax = Math.max(1, maxSec);
    const cells = series.map((p) => {
      const { weekday, dateLine } = calendarDayParts(p.dateKey);
      const barH = p.seconds > 0 ? (p.seconds / scaleMax) * BAR_MAX_H : 0;
      return { ...p, weekday, dateLine, barH };
    });
    return { maxSec, cells };
  }, [series]);

  return (
    <div className="focus-week" role="img" aria-label="Focus time per day, last seven days">
      <div className="focus-week__grid">
        {cells.map((c) => (
          <div
            key={c.dateKey}
            className="focus-week__day"
            title={`${c.dateKey}: ${formatDuration(c.seconds)}`}
          >
            <div className="focus-week__head">
              <span className="focus-week__weekday">{c.weekday}</span>
              <span className="focus-week__date">{c.dateLine}</span>
            </div>
            <div className="focus-week__track">
              <div className="focus-week__fill" style={{ height: `${c.barH}px` }} />
            </div>
            <div className="focus-week__dur">
              {c.seconds > 0 ? formatDuration(c.seconds) : "—"}
            </div>
          </div>
        ))}
      </div>
      <p className="focus-chart__max-hint">
        {maxSec > 0 ? (
          <>Peak day: {formatDuration(maxSec)}</>
        ) : (
          <>No focus logged this week yet.</>
        )}
      </p>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}
