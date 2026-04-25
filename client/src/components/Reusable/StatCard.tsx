import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";

export interface StatCardProps {
  title: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  hint,
  icon,
  loading = false,
  className = "",
}) => {
  return (
    <Card className={cn("!p-4 md:!p-5", className)} containerClassName="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-card-text">{title}</p>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-card-hover" />
          ) : (
            <p className="text-2xl font-extrabold tabular-nums text-text">{value}</p>
          )}
          {hint && !loading ? <p className="text-xs text-card-text/90">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="shrink-0 rounded-xl border border-card-border bg-background p-2 text-text">{icon}</div>
        ) : null}
      </div>
    </Card>
  );
};

export default StatCard;
