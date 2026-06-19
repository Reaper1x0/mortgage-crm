import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import {
  semanticBadgeInteractiveClasses,
  type SemanticTone,
} from "../../utils/semanticTokens";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "link"
    | "primary-soft"
    | "secondary-soft"
    | "success-soft"
    | "warning-soft"
    | "danger-soft"
    | "info-soft";
  rounded?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  /** When the button is disabled, shows this text as a native tooltip on hover (e.g. missing permission). */
  disabledTooltip?: string;
}

const VARIANT_TONE: Record<Exclude<ButtonProps["variant"], "link" | undefined>, SemanticTone> = {
  primary: "primary",
  secondary: "secondary",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  "primary-soft": "primary",
  "secondary-soft": "secondary",
  "success-soft": "success",
  "warning-soft": "warning",
  "danger-soft": "danger",
  "info-soft": "info",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  rounded,
  isLoading,
  disabled,
  disabledTooltip,
  className = "",
  title,
  ...rest
}) => {
  const isLink = variant === "link";

  const base = isLink
    ? "relative inline-flex items-center justify-center gap-2 text-sm font-semibold select-none px-1 py-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "relative inline-flex items-center justify-center gap-1.5 text-sm font-medium leading-none select-none px-3 py-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const shape = isLink ? "" : rounded === false ? "rounded-xl" : "rounded-full";

  const variantCls = isLink
    ? "border-none bg-transparent text-link underline hover:text-link-hover shadow-none"
    : semanticBadgeInteractiveClasses[VARIANT_TONE[variant]];

  const state =
    disabled || isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

  const showDisabledHint = Boolean(disabled && !isLoading && disabledTooltip);
  const button = (
    <button
      {...rest}
      className={cn(base, shape, !isLink && "border", variantCls, state, showDisabledHint && "pointer-events-none", className)}
      disabled={isLoading || disabled}
      title={showDisabledHint ? undefined : title}
    >
      <span className="relative z-10">{isLoading ? "Loading..." : children}</span>
    </button>
  );

  if (showDisabledHint) {
    return (
      <span className="inline-flex max-w-full cursor-not-allowed" title={disabledTooltip}>
        {button}
      </span>
    );
  }

  return button;
};

export default Button;
