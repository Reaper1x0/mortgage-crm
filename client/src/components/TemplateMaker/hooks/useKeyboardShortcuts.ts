import { useEffect, useCallback } from "react";
import { Placement } from "../../../types/template.types";

interface UseKeyboardShortcutsProps {
  selectedPlacement: Placement | undefined;
  onCopy: (placement: Placement) => void;
  onPaste: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts({
  selectedPlacement,
  onCopy,
  onPaste,
  onDelete,
  onDeselect,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+C or Cmd+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedPlacement) {
          e.preventDefault();
          onCopy(selectedPlacement);
        }
        return;
      }

      // Ctrl+V or Cmd+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        onPaste();
        return;
      }

      // Delete or Backspace - Delete selected placement
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPlacement) {
        e.preventDefault();
        onDelete();
        return;
      }

      // Escape - Deselect
      if (e.key === "Escape") {
        e.preventDefault();
        onDeselect();
        return;
      }
    },
    [enabled, selectedPlacement, onCopy, onPaste, onDelete, onDeselect],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

