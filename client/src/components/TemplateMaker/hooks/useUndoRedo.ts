import { useState, useCallback, useRef } from "react";
import { Placement } from "../../../types/template.types";

const MAX_HISTORY = 50;

/**
 * Hook for undo/redo functionality
 */
export function useUndoRedo(initialPlacements: Placement[]) {
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const historyRef = useRef<Placement[][]>([initialPlacements]);
  const historyIndexRef = useRef(0);

  const updatePlacements = useCallback((newPlacements: Placement[]) => {
    setPlacements(newPlacements);

    // Remove any future history if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Add new state to history
    historyRef.current.push(newPlacements);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setPlacements(historyRef.current[historyIndexRef.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setPlacements(historyRef.current[historyIndexRef.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return {
    placements,
    updatePlacements,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

