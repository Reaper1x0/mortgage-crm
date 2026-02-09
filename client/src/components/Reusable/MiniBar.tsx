import React from "react";
import { cn } from "../../utils/cn";

interface MiniBarProps {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}

/**
 * Simple div-based horizontal bar for showing relative values
 * Used in lists to show visual comparison without chart library
 */
const MiniBar: React.FC<MiniBarProps> = ({
  value,
  max,
  className = "",
  barClassName = "",
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={cn(
        "w-full h-1.5 rounded-full bg-card-border overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all duration-300",
          barClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default MiniBar;








