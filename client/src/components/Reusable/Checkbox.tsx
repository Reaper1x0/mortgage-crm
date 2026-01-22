// components/Checkbox.tsx
import React from "react";
import { FaCheckSquare, FaRegSquare } from "react-icons/fa";

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  [key: string]: any;
}

const sizeMap = {
  xs: { icon: 14, label: "text-xs" },
  sm: { icon: 18, label: "text-sm" },
  md: { icon: 20, label: "text-base" },
  lg: { icon: 24, label: "text-lg" },
};

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  error,
  className = "",
  size = "md",
  ...rest
}) => {
  const { icon, label: labelClass } = sizeMap[size];

  return (
    <div className={`text-text ${className}`}>
      <label
        className={`inline-flex items-center gap-3 cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {/* Hidden native checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...rest}
        />

        {/* Custom Icon Toggle */}
        <div className="transition-transform duration-200">
          {checked ? (
            <FaCheckSquare size={icon} className="text-text" />
          ) : (
            <FaRegSquare size={icon} className="text-gray-400" />
          )}
        </div>

        {/* Label */}
        {label && <span className={`${labelClass} select-none`}>{label}</span>}
      </label>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-error font-medium">{error}</p>
      )}
    </div>
  );
};

export default React.memo(Checkbox);