import { THEMES } from "./themes";
import type { ThemeId } from "./types";

/** Normalize label so "Reading", "reading", and "  Reading  " match. */
export function subjectGroupKey(label: string): string {
  const t = label.trim().replace(/\s+/g, " ");
  if (!t) return "__unlabeled__";
  return t.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  };
}

/** s, l as 0–100 for CSS hsl() */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = ((max + min) / 2) * 100;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = (l > 50 ? d / (2 - max - min) : d / (max + min)) * 100;
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}

function accentHsl(themeId: ThemeId): { h: number; s: number; l: number } {
  const hex = THEMES[themeId].accent;
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 268, s: 58, l: 52 };
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Topic colors anchored to the active theme accent: hues step around the wheel from that hue,
 * with saturation/lightness nudged from the accent so slices stay distinct but on-mood.
 */
export function subjectSliceColor(index: number, total: number, themeId: ThemeId): string {
  if (total <= 0) return "hsl(220, 12%, 72%)";
  const { h: h0, s: s0, l: l0 } = accentHsl(themeId);
  const hue = (h0 + (index * 360) / total) % 360;
  const sat = Math.min(74, Math.max(40, s0 + (index % 3) * 5 - 5));
  const light = Math.min(58, Math.max(36, l0 + (index % 2) * 4 - 2));
  return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`;
}
