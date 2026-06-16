import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import {
  semanticMutedClasses,
  semanticMutedHoverClasses,
  semanticSolidClasses,
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
  const base =
    "relative inline-flex items-center justify-center gap-2 text-sm font-semibold " +
    "select-none " +
    "px-3 py-1.5 " +
    "transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const shape = rounded ? "rounded-full" : "rounded-xl";

  const surface =
    "border shadow-sm " +
    "active:translate-y-[1px] " +
    "hover:shadow-md";

  const shine =
    "before:absolute before:inset-0 before:rounded-[inherit] " +
    "before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)] " +
    "before:opacity-0 before:transition-opacity before:duration-300 " +
    "hover:before:opacity-100";

  let variantCls = "";
  const solidTone = (tone: SemanticTone) => semanticSolidClasses[tone];
  const softTone = (tone: SemanticTone) =>
    `${semanticMutedClasses[tone]} ${semanticMutedHoverClasses[tone]}`;

  if (variant === "primary") variantCls = solidTone("primary");
  if (variant === "secondary") variantCls = solidTone("secondary");
  if (variant === "success") variantCls = solidTone("success");
  if (variant === "warning") variantCls = solidTone("warning");
  if (variant === "danger") variantCls = solidTone("danger");
  if (variant === "info") variantCls = solidTone("info");
  if (variant === "primary-soft") variantCls = softTone("primary");
  if (variant === "secondary-soft") variantCls = softTone("secondary");
  if (variant === "success-soft") variantCls = softTone("success");
  if (variant === "warning-soft") variantCls = softTone("warning");
  if (variant === "danger-soft") variantCls = softTone("danger");
  if (variant === "info-soft") variantCls = softTone("info");
  if (variant === "link")
    variantCls =
      "border-none bg-transparent text-link underline px-1 py-0 hover:text-link-hover shadow-none";

  const state =
    disabled || isLoading
      ? "opacity-60 cursor-not-allowed active:translate-y-0 hover:shadow-sm"
      : "cursor-pointer";

  const showDisabledHint = Boolean(disabled && !isLoading && disabledTooltip);
  const button = (
    <button
      {...rest}
      className={cn(
        base,
        shape,
        variant !== "link" ? surface : "",
        shine,
        variantCls,
        state,
        showDisabledHint && "pointer-events-none",
        className
      )}
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
