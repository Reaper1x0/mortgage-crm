import React from "react";
import { cn } from "../../utils/cn";

export default function Surface({
  children,
  className,
  variant = "card",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "soft" | "plain";
}) {
  const base =
    "rounded-3xl border border-card-border " +
    "shadow-sm shadow-card-shadow " +
    "transition-colors";

  const variants: Record<string, string> = {
    card: "bg-card",
    soft: "bg-background",
    plain: "bg-transparent border-transparent shadow-none",
  };

  return <div className={cn(base, variants[variant], className)}>{children}</div>;
}
