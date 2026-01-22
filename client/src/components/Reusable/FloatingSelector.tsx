import { useState, useRef, useEffect } from "react";

type FloatingSelectorProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
};

export function FloatingSelector<T extends string>({
  options,
  value,
  onChange,
  position = "bottom-right",
  className = "",
}: FloatingSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const selectOption = (option: T) => {
    onChange(option);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Position classes
  const positionClasses = {
    "bottom-right": "fixed bottom-4 right-4",
    "bottom-left": "fixed bottom-4 left-4",
    "top-right": "fixed top-4 right-4",
    "top-left": "fixed top-4 left-4",
  };

  return (
    <div ref={dropdownRef} className={`${positionClasses[position]} z-50 ${className}`}> 
      <button
        onClick={toggleDropdown}
        className="px-3 py-2 text-sm font-medium rounded-full border border-primary-border bg-primary text-primary-text shadow-lg hover:bg-primary-hover transition"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </button>

      <div
        className={`absolute flex flex-col gap-1 bottom-12 p-1 right-0 w-36 bg-card border border-card-border rounded-md shadow-md transition-all duration-200 ease-out origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
        }`}
        role="listbox"
      >
        {options.map((option) => (
          <button
            key={option}
            className={`block w-full text-left px-2 py-1 text-sm rounded-md transition ${
              value === option
                ? "bg-primary-hover text-white"
                : "hover:bg-primary-hover"
            }`}
            onClick={() => selectOption(option)}
            role="option"
            aria-selected={value === option}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
