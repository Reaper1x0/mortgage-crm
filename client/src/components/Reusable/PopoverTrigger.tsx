// PopoverTrigger.tsx
import React, { useState, useRef, useEffect } from "react";

interface PopoverTriggerProps {
  children: React.ReactNode; // Button / Trigger
  content: React.ReactNode; // Popover content
  className?: string;
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({
  children,
  content,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{children}</div>
      {isOpen && (
        <div className="absolute z-50 mt-2">
          {content}
        </div>
      )}
    </div>
  );
};
