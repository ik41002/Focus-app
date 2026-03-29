import { useMemo, useState, type CSSProperties } from "react";
import type { FocusSession } from "../types";
import { monthFocusCalendar, todayKey } from "../streak";

type Props = {
  sessions: FocusSession[];
};

/** Jan 1, 2023 is a Sunday — used only to label the seven columns Sun–Sat. */
const WEEKDAY_BASE = new Date(2023, 0, 1);

export function FocusMonthHeatmap({ sessions }: Props) {
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();

  const [viewY, setViewY] = useState(currentY);
  const [viewM, setViewM] = useState(currentM);

  const { cells, maxSeconds } = useMemo(
    () => monthFocusCalendar(sessions, viewY, viewM),
    [sessions, viewY, viewM]
  );

  const monthLabel = useMemo(
    () =>
      new Date(viewY, viewM, 1).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
    [viewY, viewM]
  );

  const weekdayLabels = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(WEEKDAY_BASE);
      d.setDate(WEEKDAY_BASE.getDate() + i);
      return d.toLocaleDateString(undefined, { weekday: "narrow" });
    });
  }, []);

  const today = todayKey();
  const canGoNext = viewY < currentY || (viewY === currentY && viewM < currentM);

  const goPrev = () => {
    if (viewM === 0) {
      setViewY((y) => y - 1);
      setViewM(11);
    } else {
      setViewM((m) => m - 1);
    }
  };

  const goNext = () => {
    if (!canGoNext) return;
    if (viewM === 11) {
      setViewY((y) => y + 1);
      setViewM(0);
    } else {
      setViewM((m) => m + 1);
    }
  };

  return (
    <div className="focus-month focus-month--compact" role="img" aria-label={`Focus heatmap for ${monthLabel}`}>
      <div className="focus-month__toolbar">
        <button
          type="button"
          className="focus-month__nav"
          onClick={goPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="focus-month__label">{monthLabel}</span>
        <button
          type="button"
          className="focus-month__nav"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="focus-month__weekdays" aria-hidden>
        {weekdayLabels.map((w) => (
          <span key={w} className="focus-month__weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="focus-month__grid">
        {cells.map((c, idx) => {
          if (c.dateKey == null) {
            return <div key={`pad-${idx}`} className="focus-month__cell focus-month__cell--pad" />;
          }
          const isToday = c.dateKey === today;
          const heat =
            maxSeconds > 0 && c.seconds > 0 ? Math.min(1, c.seconds / maxSeconds) : 0;
          const title = `${c.dateKey}: ${formatHeatLabel(c.seconds)}`;
          return (
            <div
              key={c.dateKey}
              className={`focus-month__cell focus-month__cell--day ${isToday ? "focus-month__cell--today" : ""}`}
              title={title}
              style={
                {
                  "--heat": String(heat),
                } as CSSProperties
              }
            >
              <span className="focus-month__day-num">{parseInt(c.dateKey.slice(8, 10), 10)}</span>
            </div>
          );
        })}
      </div>

      <p className="focus-month__hint">
        {maxSeconds > 0 ? (
          <>
            Darker = more focus that month (peak {formatHeatLabel(maxSeconds)} on a single day).
          </>
        ) : (
          <>No focus logged this month.</>
        )}
      </p>
    </div>
  );
}

function formatHeatLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}
