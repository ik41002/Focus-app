import { useMemo } from "react";
import type { DailyFocusPoint } from "../streak";

type Props = {
  series: DailyFocusPoint[];
  /** Short labels for x-axis (e.g. Mon, Tue) */
  dayLabels: string[];
};

const CHART_H = 120;
const CHART_W = 320;
const PAD_L = 4;
const PAD_B = 22;
const BAR_GAP = 2;

export function FocusChart({ series, dayLabels }: Props) {
  const { bars, maxSec } = useMemo(() => {
    const maxSec = series.reduce((m, p) => Math.max(m, p.seconds), 0);
    const scaleMax = Math.max(1, maxSec);
    const n = series.length;
    const innerW = CHART_W - PAD_L - 4;
    const barW = Math.max(2, (innerW - (n - 1) * BAR_GAP) / n);
    const bars = series.map((p, i) => {
      const h = p.seconds > 0 ? (p.seconds / scaleMax) * (CHART_H - PAD_B - 8) : 0;
      const x = PAD_L + i * (barW + BAR_GAP);
      return { x, w: barW, h, seconds: p.seconds };
    });
    return { bars, maxSec };
  }, [series]);

  return (
    <div className="focus-chart" role="img" aria-label="Focus time per day, last two weeks">
      <svg
        className="focus-chart__svg"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          className="focus-chart__axis"
          x1={PAD_L}
          y1={CHART_H - PAD_B}
          x2={CHART_W - 4}
          y2={CHART_H - PAD_B}
        />
        {bars.map((b, i) => (
          <rect
            key={series[i].dateKey}
            className="focus-chart__bar"
            x={b.x}
            y={CHART_H - PAD_B - b.h}
            width={b.w}
            height={b.h}
            rx={2}
          >
            <title>
              {series[i].dateKey}: {formatDuration(b.seconds)}
            </title>
          </rect>
        ))}
      </svg>
      <div className="focus-chart__labels" aria-hidden>
        {dayLabels.map((lab, i) => (
          <span key={series[i].dateKey} className="focus-chart__tick">
            {lab}
          </span>
        ))}
      </div>
      <p className="focus-chart__max-hint">
        {maxSec > 0 ? <>Peak day: {formatDuration(maxSec)}</> : <>No focus logged in this window yet.</>}
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
