import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";

export interface TrendDataPoint {
  bucket: string;
  casesProcessedCount: number;
}

interface LineTrendChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
  className?: string;
}

// Helper to get CSS variable value
const getCSSVar = (varName: string): string => {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim() || "#000000";
};

const LineTrendChart: React.FC<LineTrendChartProps> = ({
  data,
  loading = false,
  className = "",
}) => {
  const { theme } = useTheme();
  const [colors, setColors] = useState(() => ({
    primary: getCSSVar("--color-primary"),
    primaryHover: getCSSVar("--color-primary-hover"),
    text: getCSSVar("--color-text"),
    cardText: getCSSVar("--color-card-text"),
    card: getCSSVar("--color-card"),
    cardBorder: getCSSVar("--color-card-border"),
  }));

  // Update colors when theme changes
  useEffect(() => {
    setColors({
      primary: getCSSVar("--color-primary"),
      primaryHover: getCSSVar("--color-primary-hover"),
      text: getCSSVar("--color-text"),
      cardText: getCSSVar("--color-card-text"),
      card: getCSSVar("--color-card"),
      cardBorder: getCSSVar("--color-card-border"),
    });
  }, [theme]);

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
        <LineChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={colors.cardBorder}
            opacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="bucket"
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
              stroke: colors.primary, 
              strokeWidth: 1,
              strokeDasharray: "5 5",
            }}
          />
          <Line
            type="monotone"
            dataKey="casesProcessedCount"
            stroke={colors.primary}
            strokeWidth={2.5}
            dot={{ 
              fill: colors.primary, 
              r: 4,
              strokeWidth: 2,
              stroke: colors.card,
            }}
            activeDot={{ 
              r: 6,
              fill: colors.primaryHover,
              stroke: colors.card,
              strokeWidth: 2,
            }}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineTrendChart;
