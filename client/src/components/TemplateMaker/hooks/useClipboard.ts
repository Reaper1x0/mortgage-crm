import { useCallback, useRef } from "react";
import { Placement } from "../../../types/template.types";

/**
 * Hook for managing clipboard operations (copy/paste) for placements
 */
export function useClipboard() {
  const clipboardRef = useRef<Placement | null>(null);

  const copy = useCallback((placement: Placement) => {
    clipboardRef.current = { ...placement };
  }, []);

  const paste = useCallback(
    (generateId: () => string, offsetX: number = 0, offsetY: number = 0): Placement | null => {
      if (!clipboardRef.current) return null;

      const copied = clipboardRef.current;
      return {
        ...copied,
        placementId: generateId(),
        rect: {
          x: Math.max(0, Math.min(1, copied.rect.x + offsetX)),
          y: Math.max(0, Math.min(1, copied.rect.y + offsetY)),
          w: copied.rect.w,
          h: copied.rect.h,
        },
      };
    },
    [],
  );

  const hasClipboard = useCallback(() => clipboardRef.current !== null, []);

  return { copy, paste, hasClipboard };
}

