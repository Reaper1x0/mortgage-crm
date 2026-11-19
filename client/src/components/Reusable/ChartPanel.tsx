import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";

export interface ChartPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerRight?: ReactNode;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  description,
  children,
  className = "",
  bodyClassName = "",
  headerRight,
}) => {
  return (
    <Card className={cn(className)}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold text-text">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-card-text sm:text-sm">{description}</p>
          ) : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div className={cn("min-h-[280px] min-w-0", bodyClassName)}>{children}</div>
    </Card>
  );
};

export default ChartPanel;
