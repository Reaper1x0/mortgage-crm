import React from "react";
import { cn } from "../../../utils/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  roundedClassName?: string; // e.g. "rounded-2xl"
  as?: keyof JSX.IntrinsicElements;
};

export default function HoverBorderGradient({
  children,
  className,
  containerClassName,
  roundedClassName = "rounded-2xl",
  as = "div",
}: Props) {
  const Comp: any = as;

  return (
    <Comp className={cn("group relative", roundedClassName, "p-[1px]", containerClassName)}>
      {/* Border layer (no opacity utilities) */}
      <div
        className={cn(
          "absolute inset-0 -z-10",
          roundedClassName,
          "bg-card-hover",
          "transition-all duration-300",
          "group-hover:shadow-md"
        )}
      />
      {/* Slight “sheen” */}
      <div
        className={cn(
          "absolute inset-0 -z-10",
          roundedClassName,
          "pointer-events-none",
          "bg-gradient-to-r from-transparent via-card-hover to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        )}
      />

      <div className={cn(roundedClassName, "relative overflow-hidden", className)}>
        {children}
      </div>
    </Comp>
  );
}
