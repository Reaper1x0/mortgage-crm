import React from "react";
import { cn } from "../../utils/cn";

export type StepperStep = {
  step: number;
  label: string;
  helper?: string;
};

type StepperProps = {
  currentStep: number;
  onStepChange: (step: number) => void;
  steps: StepperStep[];
  /** When set, steps above this number are disabled. Omit to allow any step. */
  maxUnlockedStep?: number;
};

const Stepper: React.FC<StepperProps> = ({
  currentStep,
  onStepChange,
  steps,
  maxUnlockedStep,
}) => {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
      {steps.map((s) => {
        const isActive = currentStep === s.step;
        const isLocked = maxUnlockedStep != null && s.step > maxUnlockedStep;

        return (
          <button
            key={s.step}
            type="button"
            onClick={() => !isLocked && onStepChange(s.step)}
            disabled={isLocked}
            className={cn(
              "group flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors sm:w-auto",
              "bg-card shadow-sm",
              isActive
                ? "border-primary"
                : isLocked
                  ? "cursor-not-allowed border-card-border opacity-60"
                  : "border-card-border hover:bg-card-hover"
            )}
            aria-current={isActive ? "step" : undefined}
            aria-disabled={isLocked}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                isActive
                  ? "border-primary-border bg-primary text-primary-text"
                  : "border-card-border bg-background text-text"
              )}
            >
              {s.step}
            </div>

            <div className="min-w-0">
              <div
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-text" : "text-card-text"
                )}
              >
                {s.label}
              </div>
              {s.helper ? (
                <div className="text-[11px] text-card-text/80">{s.helper}</div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Stepper;
