import React from "react";
import { Loader } from "../../assets/Loader";
import { IconType } from "react-icons";
import { cn } from "../../utils/cn";
import { semanticBadgeInteractiveClasses } from "../../utils/semanticTokens";
import Tooltip from "./Tooltip";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  icon: IconType;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  outline?: boolean;
  hoverable?: boolean;
  fillBg?: boolean;
  /** Shown via the shared Tooltip when the button is disabled. */
  disabledTooltip?: string;
}

const sizeConfig = {
  sm: { btn: "h-8 w-8", icon: 16 },
  md: { btn: "h-9 w-9", icon: 18 },
  lg: { btn: "h-10 w-10", icon: 20 },
};

const IconButton: React.FC<IconButtonProps> = ({
  isLoading = false,
  icon: Icon,
  className = "",
  disabled,
  disabledTooltip,
  selected = false,
  size = "md",
  outline = true,
  hoverable = true,
  fillBg = true,
  type = "button",
  title,
  ...rest
}) => {
  const { btn, icon: iconSize } = sizeConfig[size];

  const surface = fillBg
    ? semanticBadgeInteractiveClasses.neutral
    : cn(
        "bg-transparent text-card-text",
        outline ? "border border-card-border" : "border border-transparent",
        hoverable && "hover:bg-card-muted-hover"
      );

  const state = disabled || isLoading ? "cursor-not-allowed opacity-35 saturate-0" : "cursor-pointer";
  const showDisabledHint = Boolean(disabled && !isLoading && disabledTooltip);
  const tooltipContent = showDisabledHint ? disabledTooltip : title;

  const button = (
    <button
      type={type}
      disabled={isLoading || disabled}
      aria-label={rest["aria-label"] || title || "icon button"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        btn,
        surface,
        selected && "ring-2 ring-primary-shadow",
        state,
        showDisabledHint && "pointer-events-none",
        className
      )}
      {...rest}
    >
      <span className="relative z-10">
        <Icon size={iconSize} />
      </span>

      {isLoading ? (
        <span className="absolute inset-0 z-20 flex items-center justify-center">
          <Loader className="h-4 w-4 animate-spin" />
        </span>
      ) : null}
    </button>
  );

  if (!tooltipContent) return button;

  if (showDisabledHint) {
    return (
      <Tooltip content={tooltipContent} placement="top">
        <span className="inline-flex cursor-not-allowed">{button}</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipContent} placement="top">
      {button}
    </Tooltip>
  );
};

export default IconButton;
