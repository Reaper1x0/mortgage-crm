import { type CSSProperties, type ReactElement, useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "../../utils/cn";

/** Default chart plot area height (px). */
export const CHART_HEIGHT = 280;

type ChartResponsiveContainerProps = {
  height?: number;
  className?: string;
  children: ReactElement;
};

/**
 * Recharts ResponsiveContainer wrapper with explicit pixel dimensions.
 * Avoids width/height -1 warnings from percentage sizing in flex/grid layouts.
 */
export default function ChartResponsiveContainer({
  height = CHART_HEIGHT,
  className,
  children,
}: ChartResponsiveContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("w-full min-w-0", className)} style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

export function chartPlaceholderStyle(height = CHART_HEIGHT): CSSProperties {
  return { height, minHeight: height };
}
