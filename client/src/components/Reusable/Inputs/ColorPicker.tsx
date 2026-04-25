import React from "react";
import { cn } from "../../../utils/cn";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, className }) => {
  const normalized = String(value || "#000000").toUpperCase();
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-text">{label}</label>
      <div className="flex items-center gap-3 rounded-xl border border-card-border bg-background px-3 py-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-card-border bg-transparent"
        />
        <span className="inline-flex min-w-[88px] justify-center rounded-lg border border-card-border bg-card px-2 py-1 text-xs font-semibold text-card-text">
          {normalized}
        </span>
      </div>
    </div>
  );
};

export default ColorPicker;
