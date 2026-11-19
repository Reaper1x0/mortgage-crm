import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { chartTooltipStyles } from "./chartTooltip";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";
import ChartResponsiveContainer, {
  CHART_HEIGHT,
  chartPlaceholderStyle,
} from "./ChartResponsiveContainer";

const LEGEND_HEIGHT = 50;

export interface WorkloadDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface DonutWorkloadChartProps {
  data: WorkloadDataPoint[];
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

const DonutWorkloadChart: React.FC<DonutWorkloadChartProps> = ({
  data,
  loading = false,
  className = "",
}) => {
  const { theme } = useTheme();
  const [colors, setColors] = useState(() => ({
    primary: getCSSVar("--color-primary"),
    accent: getCSSVar("--color-accent"),
    success: getCSSVar("--color-success"),
    warning: getCSSVar("--color-warning"),
    danger: getCSSVar("--color-danger"),
    info: getCSSVar("--color-info"),
    text: getCSSVar("--color-text"),
    cardText: getCSSVar("--color-card-text"),
    card: getCSSVar("--color-card"),
    cardBorder: getCSSVar("--color-card-border"),
  }));

  // Update colors when theme changes
  useEffect(() => {
    setColors({
      primary: getCSSVar("--color-primary"),
      accent: getCSSVar("--color-accent"),
      success: getCSSVar("--color-success"),
      warning: getCSSVar("--color-warning"),
      danger: getCSSVar("--color-danger"),
      info: getCSSVar("--color-info"),
      text: getCSSVar("--color-text"),
      cardText: getCSSVar("--color-card-text"),
      card: getCSSVar("--color-card"),
      cardBorder: getCSSVar("--color-card-border"),
    });
  }, [theme]);

  // Map data to colors based on name
  const getColorForItem = (item: WorkloadDataPoint, index: number): string => {
    // If explicit color provided, use it (handle CSS vars if needed)
    if (item.color) {
      const cssVarMatch = item.color.match(/var\(--color-(\w+)\)/);
      if (cssVarMatch) {
        return getCSSVar(`--color-${cssVarMatch[1]}`);
      }
      return item.color;
    }
    
    // Auto-map based on name
    const name = item.name.toLowerCase();
    if (name.includes("pending") || name.includes("review")) {
      return colors.warning;
    }
    if (name.includes("completed") || name.includes("success")) {
      return colors.success;
    }
    if (name.includes("danger") || name.includes("error")) {
      return colors.danger;
    }
    
    // Default rotation
    const defaults = [colors.primary, colors.accent, colors.info];
    return defaults[index % defaults.length];
  };

  const chartColors = useMemo(() => 
    data.map((item, index) => getColorForItem(item, index)),
    [data, colors]
  );
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const tooltipStyles = chartTooltipStyles(theme);

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
        <div className="text-card-text">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "w-full min-w-0 flex items-center justify-center",
          "bg-card border border-card-border rounded-2xl",
          className
        )}
        style={chartPlaceholderStyle()}
      >
        <div className="text-sm font-medium text-text">No activity in this period</div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full min-w-0", className)} style={{ height: CHART_HEIGHT }}>
    <ChartResponsiveContainer className="absolute inset-0" height={CHART_HEIGHT}>
      <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={78}
            innerRadius={52}
            paddingAngle={data.length > 1 ? 5 : 0}
            dataKey="value"
            cornerRadius={16}
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors[index]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyles.contentStyle}
            labelStyle={tooltipStyles.labelStyle}
            itemStyle={tooltipStyles.itemStyle}
            formatter={(value: any, name: any) => {
              if (typeof value !== "number" || typeof name !== "string") {
                return [null, ""];
              }
              const total = data.reduce((sum, d) => sum + d.value, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return [`${value} (${percentage}%)`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={LEGEND_HEIGHT}
            iconType="none"
            wrapperStyle={{ 
              fontSize: "13px",
              fontWeight: 500,
            }}
            content={(props) => {
              const { payload } = props;
              if (!payload || !Array.isArray(payload)) return null;
              
              return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-4 sm:grid-cols-3 lg:grid-cols-4">
                  {payload.map((entry: any, index: number) => {
                    const itemColor = chartColors[index] || colors.cardText;
                    return (
                      <div key={index} className="flex min-w-0 items-center gap-2">
                        <div 
                          className="h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: itemColor }}
                        />
                        <span className="truncate text-sm font-medium text-text">
                          {entry.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        </PieChart>
    </ChartResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center"
        style={{ bottom: LEGEND_HEIGHT }}
      >
        <span className="text-[22px] font-bold leading-none text-text tabular-nums">{total}</span>
        <span className="mt-1 text-[11px] font-medium text-card-text">Total</span>
      </div>
    </div>
  );
};

export default DonutWorkloadChart;
