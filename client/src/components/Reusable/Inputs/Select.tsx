import React, { forwardRef } from "react";
import { cn } from "../../../utils/cn";

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label?: string;
  error?: string;
  fieldSize?: "sm" | "md" | "lg" | "xs";
  options: { label: string; value: string | number }[];
  loading?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      disabled = false,
      fieldSize = "md",
      className = "",
      options,
      loading = false,
      ...rest
    },
    ref
  ) => {
    const sizeCls =
      fieldSize === "xs"
        ? "px-2 py-1.5 text-xs"
        : fieldSize === "sm"
        ? "px-2.5 py-1.5 text-sm"
        : fieldSize === "lg"
        ? "px-3.5 py-2.5 text-base"
        : "px-3 py-2 text-sm";

    const base =
      "w-full rounded-xl border bg-card border-card-border " +
      "text-text shadow-sm " +
      "focus:outline-none focus:ring-2 focus:ring-primary-shadow focus:border-primary-border " +
      "transition-all duration-200";

    const state = error
      ? "border-danger-border text-danger-text focus:border-danger-border focus:ring-danger-shadow"
      : disabled || loading
      ? "opacity-60 cursor-not-allowed"
      : "cursor-pointer hover:bg-card-hover";

    return (
      <div className="flex flex-col gap-1 text-text">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-text">
            {label}
          </label>
        )}

        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled || loading}
          className={cn(base, sizeCls, state, className)}
          {...rest}
        >
          <option value="">{loading ? "Loading..." : "Select an option"}</option>
          {!loading &&
            options?.length > 0 &&
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>

        {error && <p className="mt-0.5 text-xs font-medium text-danger-text">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default React.memo(Select);
