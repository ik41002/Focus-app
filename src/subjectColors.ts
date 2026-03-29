/** Normalize label so "Reading", "reading", and "  Reading  " match. */
export function subjectGroupKey(label: string): string {
  const t = label.trim().replace(/\s+/g, " ");
  if (!t) return "__unlabeled__";
  return t.toLowerCase();
}

/**
 * Distinct hues for topic slices (pie, weekly stacked bars).
 * Same index + total → same color across charts in a view.
 */
export function subjectSliceColor(index: number, total: number): string {
  if (total <= 0) return "hsl(220, 12%, 72%)";
  const hue = (268 + (index * 360) / total) % 360;
  const sat = 58 - (index % 3) * 5;
  const light = 52 - (index % 2) * 3;
  return `hsl(${Math.round(hue)}, ${sat}%, ${light}%)`;
}
