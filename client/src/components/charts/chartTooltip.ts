import type { CSSProperties } from "react";
import type { Theme } from "../../constants/theme.constants";

/** Light tooltip on a dark page, dark tooltip on a light page. */
export function chartTooltipColors(theme: Theme) {
  const lightSurface = theme === "dark";
  return {
    background: lightSurface ? "#f8fafc" : "#0f172a",
    foreground: lightSurface ? "#0f172a" : "#f8fafc",
    border: lightSurface ? "#e2e8f0" : "#334155",
  };
}

export function chartTooltipStyles(theme: Theme): {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} {
  const colors = chartTooltipColors(theme);
  return {
    contentStyle: {
      backgroundColor: colors.background,
      color: colors.foreground,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
    },
    labelStyle: {
      color: colors.foreground,
      fontWeight: 600,
      marginBottom: "6px",
      fontSize: "12px",
    },
    itemStyle: {
      color: colors.foreground,
      fontSize: "13px",
    },
  };
}
