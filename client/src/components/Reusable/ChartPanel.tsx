import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";

export interface ChartPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  description,
  children,
  className = "",
  bodyClassName = "",
}) => {
  return (
    <Card className={cn("!p-0 overflow-hidden", className)}>
      <div className="border-b border-card-border bg-card/80 px-4 py-3 md:px-5">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-card-text">{description}</p> : null}
      </div>
      <div className={cn("px-2 py-2 md:px-4", bodyClassName)}>{children}</div>
    </Card>
  );
};

export default ChartPanel;
