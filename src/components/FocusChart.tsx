import { useMemo } from "react";
import type { DailyFocusBreakdown } from "../streak";
import { calendarDayParts } from "../streak";
import { subjectSliceColor } from "../subjectColors";
import type { ThemeId } from "../types";

type Props = {
  series: DailyFocusBreakdown[];
  themeId: ThemeId;
};

const BAR_MAX_H = 96;

export function FocusChart({ series, themeId }: Props) {
  const { maxSec, subjectKeyOrder, subjectLabels, nSubjects, cells } = useMemo(() => {
    const maxSec = series.reduce((m, p) => Math.max(m, p.seconds), 0);
    const scaleMax = Math.max(1, maxSec);

    const totals = new Map<string, number>();
    const labels = new Map<string, string>();
    for (const day of series) {
      for (const p of day.parts) {
        totals.set(p.subjectKey, (totals.get(p.subjectKey) ?? 0) + p.seconds);
        if (!labels.has(p.subjectKey)) {
          labels.set(p.subjectKey, p.displayLabel || "No label");
        }
      }
    }
    const subjectKeyOrder = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    const nSubjects = Math.max(1, subjectKeyOrder.length);

    const cells = series.map((p) => {
      const { weekday, dateLine } = calendarDayParts(p.dateKey);
      const partsDesc = [...p.parts].sort((a, b) => b.seconds - a.seconds);
      const segments = partsDesc.map((part, segIdx) => {
        const colorIdx = Math.max(0, subjectKeyOrder.indexOf(part.subjectKey));
        const heightPx = (part.seconds / scaleMax) * BAR_MAX_H;
        const color = subjectSliceColor(colorIdx, nSubjects, themeId);
        const title = `${part.displayLabel || "No label"} · ${formatDuration(part.seconds)}`;
        return {
          key: `${p.dateKey}-${part.subjectKey}-${segIdx}`,
          heightPx,
          color,
          title,
          isTop: segIdx === partsDesc.length - 1,
        };
      });
      const dayTitle =
        p.seconds > 0
          ? `${p.dateKey}: ${formatDuration(p.seconds)} (${partsDesc.map((x) => `${x.displayLabel || "No label"} ${formatDuration(x.seconds)}`).join(", ")})`
          : `${p.dateKey}: no focus`;
      return { ...p, weekday, dateLine, segments, dayTitle };
    });
    return {
      maxSec,
      subjectKeyOrder,
      subjectLabels: labels,
      nSubjects,
      cells,
    };
  }, [series, themeId]);

  return (
    <div
      className="focus-week"
      role="img"
      aria-label="Focus time per day for the last seven days, stacked by topic"
    >
      <div className="focus-week__grid">
        {cells.map((c) => (
          <div key={c.dateKey} className="focus-week__day" title={c.dayTitle}>
            <div className="focus-week__head">
              <span className="focus-week__weekday">{c.weekday}</span>
              <span className="focus-week__date">{c.dateLine}</span>
            </div>
            <div className="focus-week__track">
              {c.segments.map((seg) => (
                <div
                  key={seg.key}
                  className={`focus-week__segment ${seg.isTop ? "focus-week__segment--top" : ""}`}
                  style={{
                    height: `${seg.heightPx}px`,
                    background: seg.color,
                  }}
                  title={seg.title}
                />
              ))}
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
      {subjectKeyOrder.length > 0 && maxSec > 0 && (
        <div className="focus-week__topics" aria-label="Topics this week">
          {subjectKeyOrder.map((key, i) => (
            <span key={key} className="focus-week__topic-chip">
              <span
                className="focus-week__topic-swatch"
                style={{ background: subjectSliceColor(i, nSubjects, themeId) }}
                aria-hidden
              />
              <span className="focus-week__topic-name">{subjectLabels.get(key) ?? key}</span>
            </span>
          ))}
        </div>
      )}
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
