import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import HoverBorderGradient from "./Aceternity UI/HoverBorderGradient";
import Spotlight from "./Aceternity UI/Spotlight";

interface CardProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "", containerClassName = "" }) => {
  return (
    <HoverBorderGradient
      containerClassName={cn("w-full max-w-full min-w-0", containerClassName)}
      className={cn(
        "bg-card border border-card-border shadow-md shadow-card-shadow",
        "p-4",
        "transition-transform duration-200",
        "hover:-translate-y-[1px]",
        className
      )}
      roundedClassName="rounded-2xl"
    >
      <div className="relative min-w-0">
        <Spotlight className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10 min-w-0">{children}</div>
      </div>
    </HoverBorderGradient>
  );
};

export default Card;
