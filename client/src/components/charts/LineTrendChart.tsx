import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";
import type { DashboardRange } from "../../service/dashboardService";
import {
  formatTrendBucketLabel,
  formatTrendBucketTooltip,
} from "../../utils/dashboardTrendBuckets";
import { chartTooltipStyles } from "./chartTooltip";
import ChartResponsiveContainer, {
  CHART_HEIGHT,
  chartPlaceholderStyle,
} from "./ChartResponsiveContainer";

export interface TrendDataPoint {
  bucket: string;
  casesProcessedCount: number;
}

interface LineTrendChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
  className?: string;
  range?: DashboardRange;
}

const getCSSVar = (varName: string): string => {
  if (typeof window === "undefined") return "#000000";
  return (
    getComputedStyle(document.documentElement).getPropertyValue(varName).trim() ||
    "#000000"
  );
};

const LineTrendChart: React.FC<LineTrendChartProps> = ({
  data,
  loading = false,
  className = "",
  range = "daily",
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

  const chartData = useMemo(
    () =>
      (data || []).map((point) => ({
        ...point,
        label: formatTrendBucketLabel(point.bucket, range),
      })),
    [data, range]
  );

  const hasActivity = chartData.some((d) => d.casesProcessedCount > 0);
  const maxCount = Math.max(0, ...chartData.map((d) => d.casesProcessedCount));
  const yMax = Math.max(maxCount, 1);

  if (loading) {
    return (
      <div
        className={cn(
          "w-full min-w-0 flex items-center justify-center",
          "bg-card border border-card-border rounded-2xl",
          "animate-pulse",
          className
        )}
        style={chartPlaceholderStyle()}
      >
        <div className="text-card-text text-sm">Loading chart…</div>
      </div>
    );
  }

  if (!chartData.length || !hasActivity) {
    return (
      <div
        className={cn(
          "w-full min-w-0 flex flex-col items-center justify-center gap-1",
          "rounded-xl border border-dashed border-card-border bg-background",
          className
        )}
        style={chartPlaceholderStyle()}
      >
        <div className="text-sm font-medium text-text">No activity in this period</div>
      </div>
    );
  }

  return (
    <ChartResponsiveContainer className={className} height={CHART_HEIGHT}>
      <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="casesTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={colors.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={colors.cardBorder}
          opacity={0.25}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.cardText, fontSize: 11 }}
          axisLine={{ stroke: colors.cardBorder, strokeWidth: 1 }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, yMax]}
          tick={{ fill: colors.cardText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          {...chartTooltipStyles(theme)}
          cursor={{
            stroke: colors.primary,
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
          labelFormatter={(_, payload) => {
            const bucket = payload?.[0]?.payload?.bucket as string | undefined;
            return bucket ? formatTrendBucketTooltip(bucket, range) : "";
          }}
          formatter={(value) => {
            const n = typeof value === "number" ? value : 0;
            return [`${n} case${n === 1 ? "" : "s"}`, "Processed"];
          }}
        />
        <Area
          type="monotone"
          dataKey="casesProcessedCount"
          name="Processed"
          stroke={colors.primary}
          strokeWidth={hasActivity ? 2.5 : 0}
          fill="url(#casesTrendFill)"
          dot={
            hasActivity
              ? {
                  fill: colors.primary,
                  r: 3,
                  strokeWidth: 2,
                  stroke: colors.card,
                }
              : false
          }
          activeDot={{
            r: 5,
            fill: colors.primaryHover,
            stroke: colors.card,
            strokeWidth: 2,
          }}
          connectNulls
          isAnimationActive
        />
      </AreaChart>
    </ChartResponsiveContainer>
  );
};

export default LineTrendChart;
