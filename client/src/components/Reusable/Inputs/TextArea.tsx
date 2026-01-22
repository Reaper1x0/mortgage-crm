// components/TextArea.tsx
import React, { forwardRef } from "react";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  error?: string;
  fieldSize?: "xs" | "sm" | "md" | "lg";
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      error,
      disabled = false,
      fieldSize = "md",
      className = "",
      rows = 3,
      ...rest
    },
    ref
  ) => {
    let textareaStyles =
      "w-full rounded-lg border bg-card border-card-border " +
      "text-text placeholder:text-text/60 shadow-sm " +
      "focus:outline-none focus:ring-2 focus:ring-primary-shadow focus:border-primary-border " +
      "transition-colors duration-200 resize-y ";

    // Dynamic size styles
    if (fieldSize === "xs") textareaStyles += "px-2 py-1.5 text-xs ";
    else if (fieldSize === "sm") textareaStyles += "px-2.5 py-1.5 text-sm ";
    else if (fieldSize === "md") textareaStyles += "px-3 py-2 text-sm ";
    else if (fieldSize === "lg") textareaStyles += "px-3.5 py-2.5 text-base ";

    // State styles
    if (error) {
      textareaStyles +=
        "border-danger-border bg-danger/5 text-danger-text " +
        "focus:border-danger-border focus:ring-danger-shadow ";
    } else if (disabled) {
      textareaStyles += "opacity-60 cursor-not-allowed ";
    }

    return (
      <div className="flex flex-col gap-1 text-text">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-text/80">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`${textareaStyles} ${className}`}
          {...rest}
        />

        {error && (
          <p className="mt-0.5 text-xs font-medium text-danger-text">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default React.memo(TextArea);
