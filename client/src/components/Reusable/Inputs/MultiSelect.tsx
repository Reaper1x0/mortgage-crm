// components/MultiSelectInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { FaCheckSquare, FaRegSquare } from "react-icons/fa";

interface Option {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  name: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  options: Option[] | undefined;
  value: string[];
  onChange: (values: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleValue = (selectedValue: string) => {
    const exists = value.includes(selectedValue);
    const updated = exists
      ? value.filter((v) => v !== selectedValue)
      : [...value, selectedValue];
    onChange(updated);
  };

  const displaySelected = () => {
    const selectedLabels =
      (options &&
        options
          .filter((opt) => value.includes(opt.value))
          .map((opt) => opt.label)) ||
      [];

    const topThree = selectedLabels.slice(0, 3);
    const remaining = selectedLabels.length - 3;

    return (
      <div className="flex flex-wrap gap-1">
        {topThree.map((label, idx) => (
          <span
            key={idx}
            className="bg-o_background text-o_text px-2 py-1 rounded-full text-xs font-medium"
          >
            {label}
          </span>
        ))}
        {remaining > 0 && (
          <span className="bg-o_background text-o_text px-2 py-1 rounded-full text-xs  font-medium">
            +{remaining} more
          </span>
        )}
      </div>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-4 relative text-text" ref={containerRef}>
      {label && (
        <label className="block mb-1 text-sm font-semibold">{label}</label>
      )}

      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-2 cursor-pointer text-md flex justify-between items-center bg-card rounded border border-border focus:ring-border focus:outline-none focus:ring-2 transition duration-200"
      >
        <span className="truncate w-full">
          {value.length ? displaySelected() : "Select..."}
        </span>
        <svg
          className={`w-4 h-4 ml-2 transform transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 9l-7 7-7-7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full bg-card border border-border rounded mt-1 max-h-60 overflow-auto text-text">
          {options &&
            options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  onClick={() => toggleValue(opt.value)}
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-hover"
                >
                  <div className="mr-2">
                    {checked ? (
                      <FaCheckSquare size={18} className="text-text" />
                    ) : (
                      <FaRegSquare size={18} className="text-text" />
                    )}
                  </div>
                  <span>{opt.label}</span>
                </label>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default React.memo(MultiSelect);
