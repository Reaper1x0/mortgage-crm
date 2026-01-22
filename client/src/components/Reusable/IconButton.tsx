import React from "react";
import { Loader } from "../../assets/Loader";
import { IconType } from "react-icons";
import { cn } from "../../utils/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  icon: IconType;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  outline?: boolean;
  hoverable?: boolean;
  fillBg?: boolean; // controls whether to show background fill
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

  const base =
    "relative inline-flex items-center justify-center rounded-xl " +
    "transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const border = outline ? "border border-card-border" : "border border-transparent";
  const bg = fillBg ? "bg-card" : "bg-transparent";
  const hover = hoverable ? "hover:bg-card-hover hover:shadow-sm" : "";
  const selectedCls = selected ? "bg-card-hover shadow-sm" : "";
  const state = disabled || isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      type={type}
      disabled={isLoading || disabled}
      title={title}
      aria-label={rest["aria-label"] || title || "icon button"}
      className={cn(base, btn, border, bg, hover, selectedCls, state, className)}
      {...rest}
    >
      {/* subtle inner highlight */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200",
          hoverable && !(disabled || isLoading) ? "group-hover:opacity-100" : ""
        )}
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.14), transparent 45%)",
        }}
      />

      {/* icon */}
      <span className={cn("relative z-10 transition-transform duration-150", hoverable && !(disabled || isLoading) ? "group-hover:scale-105" : "")}>
        <Icon size={iconSize} />
      </span>

      {/* loader */}
      {isLoading && (
        <span className="absolute inset-0 z-20 flex items-center justify-center">
          <Loader className="h-4 w-4 animate-spin" />
        </span>
      )}
    </button>
  );
};

export default IconButton;
