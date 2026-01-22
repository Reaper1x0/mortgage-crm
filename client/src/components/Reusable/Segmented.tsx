import React from "react";
import { cn } from "../../utils/cn";

export type SegmentedOption<T extends string> = {
  key: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
};

export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2", className)}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "group rounded-3xl border text-left transition-all",
              "bg-card hover:bg-card-hover",
              // responsive padding + better tap target on mobile
              "p-3 sm:p-4",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              active ? "border-primary-border shadow-sm shadow-card-shadow" : "border-card-border"
            )}
          >
            <div className="flex items-start sm:items-center gap-3">
              {opt.icon ? (
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-2xl border",
                    // responsive icon container sizing
                    "h-9 w-9 sm:h-10 sm:w-10",
                    active ? "border-primary-border bg-background" : "border-card-border bg-background"
                  )}
                >
                  {opt.icon}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="text-sm font-bold text-text break-words">{opt.label}</div>

                {opt.description ? (
                  <div className="mt-1 text-xs text-card-text break-words">
                    {opt.description}
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
