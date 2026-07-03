import { cn } from "../../utils/cn";
import type { DashboardRange } from "../../service/dashboardService";

const OPTIONS: { key: DashboardRange; label: string }[] = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
];

type CardRangeToggleProps = {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
  className?: string;
};

/** Compact Day / Week / Month toggle for individual dashboard cards. */
export default function CardRangeToggle({ value, onChange, className }: CardRangeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-card-border bg-background p-0.5",
        className
      )}
      role="group"
      aria-label="Time range"
    >
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:px-2.5 sm:py-1 sm:text-xs",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-card-text hover:text-text"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
