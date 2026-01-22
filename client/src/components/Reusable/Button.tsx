import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "link";
  rounded?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  rounded,
  isLoading,
  disabled,
  className = "",
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
  if (variant === "primary")
    variantCls =
      "border-primary-border bg-primary text-primary-text hover:bg-primary-hover";
  if (variant === "secondary")
    variantCls =
      "border-secondary-border bg-secondary text-secondary-text hover:bg-secondary-hover";
  if (variant === "success")
    variantCls =
      "border-success-border bg-success text-success-text hover:bg-success-hover";
  if (variant === "warning")
    variantCls =
      "border-warning-border bg-warning text-warning-text hover:bg-warning-hover";
  if (variant === "danger")
    variantCls =
      "border-danger-border bg-danger text-danger-text hover:bg-danger-hover";
  if (variant === "link")
    variantCls =
      "border-none bg-transparent text-link underline px-1 py-0 hover:text-link-hover shadow-none";

  const state =
    disabled || isLoading
      ? "opacity-60 cursor-not-allowed active:translate-y-0 hover:shadow-sm"
      : "cursor-pointer";

  return (
    <button
      {...rest}
      className={cn(base, shape, variant !== "link" ? surface : "", shine, variantCls, state, className)}
      disabled={isLoading || disabled}
    >
      <span className="relative z-10">{isLoading ? "Loading..." : children}</span>
    </button>
  );
};

export default Button;
