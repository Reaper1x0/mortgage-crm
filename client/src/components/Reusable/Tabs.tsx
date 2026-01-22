// Tabs.tsx
import React from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  className = "flex gap-2 mb-2 overflow-x-auto",
  tabClassName = "px-3 py-1 text-xs rounded-t-md hover:bg-card-hover",
  activeTabClassName = "bg-card-hover",
}) => {
  return (
    <div className={className}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`${tabClassName} ${activeTabId === tab.id ? activeTabClassName : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
