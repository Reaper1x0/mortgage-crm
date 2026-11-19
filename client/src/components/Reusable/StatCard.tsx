import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";

export interface StatCardProps {
  title: string;
  value: ReactNode;
  /** Secondary line under the value (alias kept for existing call sites). */
  hint?: string;
  subtitle?: string;
  icon?: ReactNode;
  iconClassName?: string;
  loading?: boolean;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  hint,
  subtitle,
  icon,
  iconClassName,
  loading = false,
  className = "",
}) => {
  const caption = subtitle ?? hint;

  return (
    <Card containerClassName="h-full" className={cn("!flex h-full flex-col !p-5", className)}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className={cn("shrink-0 [&_svg]:h-6 [&_svg]:w-6", iconClassName)}>{icon}</div>
        ) : null}
        <div className="min-w-0 text-sm font-medium leading-snug text-card-text">{title}</div>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-card-border" />
      ) : (
        <div className="mt-3 truncate text-3xl font-semibold tracking-tight text-text tabular-nums">
          {value}
        </div>
      )}
      <div className="mt-1.5 text-xs leading-relaxed text-card-text">
        {!loading && caption ? caption : "\u00a0"}
      </div>
    </Card>
  );
};

export default StatCard;
