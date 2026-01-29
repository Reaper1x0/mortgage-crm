import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from "recharts";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";

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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={75}
            innerRadius={45}
            paddingAngle={8}
            dataKey="value"
            cornerRadius={6}
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
            height={50}
            iconType="none"
            wrapperStyle={{ 
              fontSize: "13px",
              fontWeight: 500,
            }}
            content={(props) => {
              const { payload } = props;
              if (!payload || !Array.isArray(payload)) return null;
              
              return (
                <div className="flex justify-center items-center gap-6 pt-4">
                  {payload.map((entry: any, index: number) => {
                    const itemColor = chartColors[index] || colors.cardText;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: itemColor }}
                        />
                        <span className="text-text text-sm font-medium">
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
      </ResponsiveContainer>
    </div>
  );
};

export default DonutWorkloadChart;
