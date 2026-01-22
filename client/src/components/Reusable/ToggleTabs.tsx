import React from "react";

interface Tab {
  label: string;
  value: string;
}

type ToggleTabSize = "xs" | "sm" | "md" | "lg";

interface ToggleTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  size?: ToggleTabSize;
  className?: string;
}

const sizeClasses: Record<ToggleTabSize, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-2.5 text-lg",
};

const ToggleTabs: React.FC<ToggleTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = "md",
  className = "",
}) => {
  return (
    <div className={`flex space-x-2 text-text ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`font-medium transition-all duration-200 border-b-2 hover:bg-card rounded-t
            ${sizeClasses[size]}
            ${
              tab.value === activeTab
                ? "border-border text-text"
                : "border-transparent"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ToggleTabs;
