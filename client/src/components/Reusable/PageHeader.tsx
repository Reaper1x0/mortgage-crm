import React from "react";
import { cn } from "../../utils/cn";

export default function PageHeader({
  title,
  description,
  right,
  left,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  right?: React.ReactNode;
  left?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      {left ? <div className="flex flex-wrap items-center gap-2">{left}</div> : null}
      <div>
        <div className="text-2xl font-extrabold text-text">{title}</div>
        {description ? (
          <div className="mt-1 text-sm text-card-text">{description}</div>
        ) : null}
      </div>

      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}
