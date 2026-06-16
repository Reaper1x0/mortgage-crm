import React from "react";
import { cn } from "../../utils/cn";
import {
  semanticMutedClasses,
  type SemanticTone,
} from "../../utils/semanticTokens";

export type StatusBadgeTone = SemanticTone;

export default function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        semanticMutedClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
