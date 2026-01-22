import React from "react";
import { cn } from "../../utils/cn";

type Tone = "info" | "success" | "warning" | "danger";

export default function Callout({
  title,
  children,
  tone = "info",
  className,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const base = "rounded-2xl border p-3";

  const tones: Record<Tone, string> = {
    info: "border-card-border bg-card text-text",
    success: "border-success-border bg-card text-success",
    warning: "border-warning-border bg-card text-warning",
    danger: "border-danger-border bg-card text-danger",
  };

  return (
    <div className={cn(base, tones[tone], className)}>
      {title ? <div className="text-sm font-bold">{title}</div> : null}
      <div className={cn(title ? "mt-1" : "", "text-sm")}>{children}</div>
    </div>
  );
}
