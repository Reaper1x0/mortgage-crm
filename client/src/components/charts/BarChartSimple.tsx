import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";

export interface BarDataPoint {
  name: string;
  value: number;
}

interface BarChartSimpleProps {
  data: BarDataPoint[];
  loading?: boolean;
  className?: string;
  dataKey?: string;
  color?: "primary" | "accent" | "success" | "warning" | "info" | "danger";
}

// Helper to get CSS variable value
const getCSSVar = (varName: string): string => {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim() || "#000000";
};

const BarChartSimple: React.FC<BarChartSimpleProps> = ({
  data,
  loading = false,
  className = "",
  dataKey = "value",
  color = "primary",
}) => {
  const { theme } = useTheme();
  const [baseColors, setBaseColors] = useState(() => ({
    primary: getCSSVar("--color-primary"),
    primaryHover: getCSSVar("--color-primary-hover"),
    accent: getCSSVar("--color-accent"),
    accentHover: getCSSVar("--color-accent-hover"),
    success: getCSSVar("--color-success"),
    successHover: getCSSVar("--color-success-hover"),
    warning: getCSSVar("--color-warning"),
    warningHover: getCSSVar("--color-warning-hover"),
    danger: getCSSVar("--color-danger"),
    dangerHover: getCSSVar("--color-danger-hover"),
    info: getCSSVar("--color-info"),
    infoHover: getCSSVar("--color-info-hover"),
    text: getCSSVar("--color-text"),
    cardText: getCSSVar("--color-card-text"),
    card: getCSSVar("--color-card"),
    cardBorder: getCSSVar("--color-card-border"),
  }));

  // Update colors when theme changes
  useEffect(() => {
    setBaseColors({
      primary: getCSSVar("--color-primary"),
      primaryHover: getCSSVar("--color-primary-hover"),
      accent: getCSSVar("--color-accent"),
      accentHover: getCSSVar("--color-accent-hover"),
      success: getCSSVar("--color-success"),
      successHover: getCSSVar("--color-success-hover"),
      warning: getCSSVar("--color-warning"),
      warningHover: getCSSVar("--color-warning-hover"),
      danger: getCSSVar("--color-danger"),
      dangerHover: getCSSVar("--color-danger-hover"),
      info: getCSSVar("--color-info"),
      infoHover: getCSSVar("--color-info-hover"),
      text: getCSSVar("--color-text"),
      cardText: getCSSVar("--color-card-text"),
      card: getCSSVar("--color-card"),
      cardBorder: getCSSVar("--color-card-border"),
    });
  }, [theme]);

  const colors = useMemo(() => {
    const colorMap: Record<string, { main: string; hover: string }> = {
      primary: { main: baseColors.primary, hover: baseColors.primaryHover },
      accent: { main: baseColors.accent, hover: baseColors.accentHover },
      success: { main: baseColors.success, hover: baseColors.successHover },
      warning: { main: baseColors.warning, hover: baseColors.warningHover },
      danger: { main: baseColors.danger, hover: baseColors.dangerHover },
      info: { main: baseColors.info, hover: baseColors.infoHover },
    };
    // Fallback to primary if color doesn't exist
    const selected = colorMap[color] || colorMap.primary;
    return { ...baseColors, selected };
  }, [color, baseColors]);

  if (loading) {
    return (
      <div
        className={cn(
          "w-full h-80 flex items-center justify-center",
          "bg-card border border-card-border rounded-2xl",
          "animate-pulse",
          className
        )}
      >
        <div className="text-card-text">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "w-full h-80 flex items-center justify-center",
          "bg-card border border-card-border rounded-2xl",
          className
        )}
      >
        <div className="text-card-text">No data available</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-80 p-6", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id={`barGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.selected.main} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.selected.hover} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={colors.cardBorder}
            opacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: colors.cardText, fontSize: 11 }}
            axisLine={{ stroke: colors.cardBorder, strokeWidth: 1 }}
            tickLine={{ stroke: colors.cardBorder }}
          />
          <YAxis
            tick={{ fill: colors.cardText, fontSize: 11 }}
            axisLine={{ stroke: colors.cardBorder, strokeWidth: 1 }}
            tickLine={{ stroke: colors.cardBorder }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              padding: "10px 14px",
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
            }}
            labelStyle={{ 
              color: colors.text,
              fontWeight: 600,
              marginBottom: "6px",
              fontSize: "12px",
            }}
            itemStyle={{ 
              color: colors.text,
              fontSize: "13px",
            }}
            cursor={{ 
              fill: colors.selected.main,
              fillOpacity: 0.1,
            }}
          />
          <Bar 
            dataKey={dataKey} 
            fill={`url(#barGradient-${color})`}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartSimple;
