import React from "react";
import StatusBadge from "../Reusable/StatusBadge";
import MiniBar from "../Reusable/MiniBar";
import { FiAlertCircle, FiAlertTriangle } from "react-icons/fi";
import { cn } from "../../utils/cn";
import type { ValidationFailure } from "../../service/dashboardService";

interface ValidationFailureListProps {
  failures: ValidationFailure[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  loading?: boolean;
}

/**
 * Derive short label from rule
 */
const getShortRule = (rule: string): string => {
  const shortRule = rule.startsWith("Logic:") 
    ? rule.replace("Logic:", "").trim() 
    : rule;
  return shortRule;
};

const ValidationFailureList: React.FC<ValidationFailureListProps> = ({
  failures,
  selectedIndex,
  onSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-3 rounded-lg border border-card-border bg-card animate-pulse"
          >
            <div className="h-4 bg-card-border rounded w-3/4 mb-2" />
            <div className="h-3 bg-card-border rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (failures.length === 0) {
    return null;
  }

  const maxCount = Math.max(...failures.map((f) => f.count), 1);

  return (
    <div className="space-y-1">
      {failures.map((failure, index) => {
        const shortRule = getShortRule(failure.rule);
        const isSelected = index === selectedIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(index);
              }
            }}
            className={cn(
              "w-full text-left p-3 rounded-lg border transition-all",
              "hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-card-border bg-card"
            )}
            aria-selected={isSelected}
            role="option"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium truncate",
                    isSelected ? "text-primary" : "text-text"
                  )}
                  title={failure.rule}
                >
                  {shortRule}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold text-text">
                  {failure.count}
                </span>
                <span className="text-xs text-text-secondary">
                  {failure.percentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              {failure.severityCounts.error > 0 && (
                <StatusBadge tone="danger" className="text-xs">
                  <FiAlertCircle className="h-3 w-3 mr-1" />
                  {failure.severityCounts.error}
                </StatusBadge>
              )}
              {failure.severityCounts.warning > 0 && (
                <StatusBadge tone="warning" className="text-xs">
                  <FiAlertTriangle className="h-3 w-3 mr-1" />
                  {failure.severityCounts.warning}
                </StatusBadge>
              )}
            </div>

            <MiniBar value={failure.count} max={maxCount} />
          </button>
        );
      })}
    </div>
  );
};

export default ValidationFailureList;

