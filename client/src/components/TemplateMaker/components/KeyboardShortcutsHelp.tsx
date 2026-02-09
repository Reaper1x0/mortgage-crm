import { useState, useRef, useEffect } from "react";
import { HiQuestionMarkCircle } from "react-icons/hi2";

/**
 * Compact keyboard shortcuts help button with popover
 */
export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const shortcuts = [
    { key: "Ctrl+C / Cmd+C", action: "Copy field" },
    { key: "Ctrl+V / Cmd+V", action: "Paste field" },
    { key: "Delete / Backspace", action: "Remove field" },
    { key: "Esc", action: "Deselect field" },
  ];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-background hover:bg-card-hover transition-colors"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <HiQuestionMarkCircle className="h-4 w-4 text-text" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-card-border bg-card shadow-lg p-4">
          <div className="mb-2 text-sm font-semibold text-text">Keyboard Shortcuts</div>
          <div className="space-y-2">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                <div className="text-card-text">{shortcut.action}</div>
                <div className="shrink-0">
                  <kbd className="px-2 py-1 rounded border border-card-border bg-background text-text font-mono text-[10px]">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



