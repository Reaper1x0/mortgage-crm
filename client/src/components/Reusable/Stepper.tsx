// src/components/Reusable/Stepper.tsx
import React from "react";
import { FiCheck, FiLock } from "react-icons/fi";

export type StepperStep = {
  step: number;
  label: string;
  helper?: string; // optional small subtext
};

type StepperProps = {
  currentStep: number;
  maxUnlockedStep: number;             // controls what's clickable
  onStepChange: (step: number) => void; // called when user clicks
  steps: StepperStep[];
};

const Stepper: React.FC<StepperProps> = ({
  currentStep,
  maxUnlockedStep,
  onStepChange,
  steps,
}) => {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {steps.map((s) => {
        const isActive = currentStep === s.step;
        const isDone = currentStep > s.step;
        const isUnlocked = s.step <= maxUnlockedStep;

        return (
          <button
            key={s.step}
            type="button"
            onClick={() => isUnlocked && onStepChange(s.step)}
            disabled={!isUnlocked}
            className={[
              "group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
              "bg-card shadow-sm",
              isActive
                ? "border-primary"
                : isUnlocked
                ? "border-card-border hover:bg-card-hover"
                : "border-card-border opacity-60 cursor-not-allowed",
            ].join(" ")}
            aria-current={isActive ? "step" : undefined}
            aria-disabled={!isUnlocked}
            title={!isUnlocked ? "Complete previous steps to unlock" : undefined}
          >
            {/* Circle */}
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                isDone
                  ? "border-success-border bg-success text-success-text"
                  : isActive
                  ? "border-primary-border bg-primary text-primary-text"
                  : isUnlocked
                  ? "border-card-border bg-background text-text"
                  : "border-card-border bg-background text-text/60",
              ].join(" ")}
            >
              {isDone ? <FiCheck /> : !isUnlocked ? <FiLock /> : s.step}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <div
                className={[
                  "text-xs font-medium",
                  isActive ? "text-text" : "text-card-text",
                ].join(" ")}
              >
                {s.label}
              </div>

              {s.helper && (
                <div className="text-[11px] text-card-text/80">{s.helper}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Stepper;
