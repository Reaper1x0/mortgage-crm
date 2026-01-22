import React from "react";
import { cn } from "../../utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

export default function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const base =
    "inline-flex items-center rounded-full border " +
    "px-2.5 py-1 text-[11px] font-semibold leading-none";

  const tones: Record<Tone, string> = {
    neutral: "bg-card text-text border-card-border",
    primary: "bg-primary text-primary-text border-primary-border",
    success: "bg-success text-success-text border-success-border",
    warning: "bg-warning text-warning-text border-warning-border",
    danger: "bg-danger text-danger-text border-danger-border",
  };

  return <span className={cn(base, tones[tone], className)}>{children}</span>;
}
