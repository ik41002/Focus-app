import { useMemo } from "react";
import type { FocusSession } from "../types";

type Props = {
  sessions: FocusSession[];
};

const VIEW = 100;
const CX = VIEW / 2;
const CY = VIEW / 2;
const R = 38;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Evenly spaced hues with a fixed offset so slices stay clearly distinct and read as a smooth grade.
 * Saturation/lightness tuned for light UI surfaces.
 */
function subjectSliceColor(index: number, total: number): string {
  if (total <= 0) return "hsl(220, 12%, 72%)";
  const hue = (268 + (index * 360) / total) % 360;
  const sat = 58 - (index % 3) * 5;
  const light = 52 - (index % 2) * 3;
  return `hsl(${Math.round(hue)}, ${sat}%, ${light}%)`;
}

function pieSlicePath(startDeg: number, sweepDeg: number): string | null {
  if (sweepDeg <= 0) return null;
  if (sweepDeg >= 359.99) return null;
  const endDeg = startDeg + sweepDeg;
  const rad = Math.PI / 180;
  const x1 = CX + R * Math.cos((startDeg - 90) * rad);
  const y1 = CY + R * Math.sin((startDeg - 90) * rad);
  const x2 = CX + R * Math.cos((endDeg - 90) * rad);
  const y2 = CY + R * Math.sin((endDeg - 90) * rad);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function RecentSessionsPie({ sessions }: Props) {
  const { totalSec, slices } = useMemo(() => {
    const totalSec = sessions.reduce((a, s) => a + s.seconds, 0);
    let acc = 0;
    const slices = sessions.map((session, i) => {
      const isLast = i === sessions.length - 1;
      const startDeg = totalSec > 0 ? (acc / totalSec) * 360 : 0;
      acc += session.seconds;
      const endDeg =
        totalSec > 0 && isLast ? 360 : totalSec > 0 ? (acc / totalSec) * 360 : 0;
      const sweepDeg = endDeg - startDeg;
      return { session, startDeg, sweepDeg, index: i };
    });
    return { totalSec, slices };
  }, [sessions]);

  const summaryLabel = useMemo(() => {
    if (sessions.length === 0) return "No recent sessions";
    const t = formatDuration(totalSec);
    return `Recent focus: ${t} across ${sessions.length} session${sessions.length === 1 ? "" : "s"}`;
  }, [sessions.length, totalSec]);

  return (
    <div className="recent-pie" role="img" aria-label={summaryLabel}>
      <div className="recent-pie__chart">
        <svg
          className="recent-pie__svg"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          aria-hidden
        >
          {totalSec <= 0 ? (
            <circle
              className="recent-pie__slice recent-pie__slice--empty"
              cx={CX}
              cy={CY}
              r={R}
            />
          ) : sessions.length === 1 ? (
            <circle
              className="recent-pie__slice"
              cx={CX}
              cy={CY}
              r={R}
              fill={subjectSliceColor(0, 1)}
            />
          ) : (
            slices.map(({ session, startDeg, sweepDeg, index }) => {
              if (sweepDeg <= 0) return null;
              const d = pieSlicePath(startDeg, sweepDeg);
              if (!d) return null;
              const pct =
                totalSec > 0 ? Math.round((session.seconds / totalSec) * 100) : 0;
              const title = `${session.label.trim() || "No label"} · ${session.date} · ${formatDuration(session.seconds)} (${pct}%)`;
              const fill = subjectSliceColor(index, sessions.length);
              return (
                <path
                  key={session.id}
                  className="recent-pie__slice"
                  d={d}
                  fill={fill}
                >
                  <title>{title}</title>
                </path>
              );
            })
          )}
        </svg>
      </div>

      <ul className="recent-pie__legend">
        {slices.map(({ session, index }) => {
          const pct =
            totalSec > 0 ? Math.round((session.seconds / totalSec) * 100) : 0;
          const label = session.label.trim();
          const swatchColor = subjectSliceColor(index, sessions.length);
          return (
            <li key={session.id} className="recent-pie__legend-row">
              <span
                className="recent-pie__swatch"
                style={{ background: swatchColor }}
                aria-hidden
              />
              <span className="recent-pie__legend-main">
                <span className="recent-pie__legend-label">
                  {label || <span className="recent-pie__legend-unlabeled">No label</span>}
                </span>
                <span className="recent-pie__legend-date">{session.date}</span>
              </span>
              <span className="recent-pie__legend-stat">
                <span className="recent-pie__legend-time">{formatDuration(session.seconds)}</span>
                <span className="recent-pie__legend-pct">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
