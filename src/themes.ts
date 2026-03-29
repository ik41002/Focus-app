import type { ThemeId } from "./types";

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  emoji: string;
  bg1: string;
  bg2: string;
  bg3: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  success: string;
  coin: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  sakura: {
    id: "sakura",
    label: "Sakura",
    emoji: "🌸",
    bg1: "#fff5f7",
    bg2: "#ffe4ec",
    bg3: "#f0abfc",
    surface: "rgba(255, 255, 255, 0.72)",
    surface2: "rgba(255, 240, 246, 0.9)",
    text: "#4a2740",
    muted: "#9d6b8a",
    accent: "#ec4899",
    accentSoft: "#fce7f3",
    success: "#10b981",
    coin: "#fbbf24",
  },
  mint: {
    id: "mint",
    label: "Mint",
    emoji: "🌿",
    bg1: "#f0fdf9",
    bg2: "#d1fae5",
    bg3: "#6ee7b7",
    surface: "rgba(255, 255, 255, 0.75)",
    surface2: "rgba(220, 252, 231, 0.92)",
    text: "#134e4a",
    muted: "#5f8a7e",
    accent: "#14b8a6",
    accentSoft: "#ccfbf1",
    success: "#059669",
    coin: "#f59e0b",
  },
  lavender: {
    id: "lavender",
    label: "Lavender",
    emoji: "💜",
    bg1: "#faf5ff",
    bg2: "#ede9fe",
    bg3: "#c4b5fd",
    surface: "rgba(255, 255, 255, 0.74)",
    surface2: "rgba(237, 233, 254, 0.95)",
    text: "#3b2f5c",
    muted: "#7c6a9e",
    accent: "#8b5cf6",
    accentSoft: "#ede9fe",
    success: "#34d399",
    coin: "#fcd34d",
  },
  peach: {
    id: "peach",
    label: "Peach",
    emoji: "🍑",
    bg1: "#fffbeb",
    bg2: "#ffedd5",
    bg3: "#fdba74",
    surface: "rgba(255, 255, 255, 0.76)",
    surface2: "rgba(255, 237, 213, 0.93)",
    text: "#7c2d12",
    muted: "#b45309",
    accent: "#f97316",
    accentSoft: "#ffedd5",
    success: "#22c55e",
    coin: "#eab308",
  },
  sky: {
    id: "sky",
    label: "Sky",
    emoji: "☁️",
    bg1: "#f0f9ff",
    bg2: "#e0f2fe",
    bg3: "#7dd3fc",
    surface: "rgba(255, 255, 255, 0.78)",
    surface2: "rgba(224, 242, 254, 0.94)",
    text: "#0c4a6e",
    muted: "#578eb8",
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
    success: "#10b981",
    coin: "#facc15",
  },
};

export function applyThemeToDocument(tokens: ThemeTokens, fontFamily: string, roundness: 0 | 1 | 2) {
  const root = document.documentElement;
  const radii = ["14px", "18px", "26px"] as const;
  const r = radii[roundness];
  root.style.setProperty("--color-bg-1", tokens.bg1);
  root.style.setProperty("--color-bg-2", tokens.bg2);
  root.style.setProperty("--color-bg-3", tokens.bg3);
  root.style.setProperty("--color-bg-gradient", `linear-gradient(145deg, ${tokens.bg1}, ${tokens.bg2} 45%, ${tokens.bg3})`);
  root.style.setProperty("--color-surface", tokens.surface);
  root.style.setProperty("--color-surface-2", tokens.surface2);
  root.style.setProperty("--color-text", tokens.text);
  root.style.setProperty("--color-muted", tokens.muted);
  root.style.setProperty("--color-accent", tokens.accent);
  root.style.setProperty("--color-accent-soft", tokens.accentSoft);
  root.style.setProperty("--color-success", tokens.success);
  root.style.setProperty("--color-coin", tokens.coin);
  root.style.setProperty("--font-body", fontFamily);
  root.style.setProperty("--radius-sm", roundness === 2 ? "12px" : "10px");
  root.style.setProperty("--radius-md", r);
  root.style.setProperty("--radius-lg", roundness === 2 ? "32px" : roundness === 1 ? "24px" : "20px");
  root.style.setProperty("--radius-pill", "999px");
}
