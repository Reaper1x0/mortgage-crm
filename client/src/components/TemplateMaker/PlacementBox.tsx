import React, { useRef, useState } from "react";
import { Placement } from "../../types/template.types";

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export default function PlacementBox({
  placement,
  px,
  selected,
  onSelect,
  onMoveResize,
}: {
  placement: Placement;
  px: { left: number; top: number; width: number; height: number };
  selected: boolean;
  onSelect: () => void;
  onMoveResize: (next: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const startRef = useRef<null | {
    mode: "move" | "resize";
    dir?: ResizeDir;
    startX: number;
    startY: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }>(null);

  const [dragging, setDragging] = useState(false);

  const label = placement.label || placement.fieldKey;

  const fontSize = placement.style?.fontSize ?? 12;
  const align = placement.style?.align ?? "left";
  const multiline = !!placement.style?.multiline;
  const lineHeight = placement.style?.lineHeight ?? Math.round(fontSize * 1.2);

  function capture(e: React.PointerEvent) {
    const el = boxRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
  }
  function release(e: React.PointerEvent) {
    const el = boxRef.current;
    if (el && el.hasPointerCapture(e.pointerId))
      el.releasePointerCapture(e.pointerId);
  }

  function onPointerDownMove(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    capture(e);
    setDragging(true);

    startRef.current = {
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      ...px,
    };
  }

  function onPointerDownResize(dir: ResizeDir) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      capture(e);
      setDragging(true);

      startRef.current = {
        mode: "resize",
        dir,
        startX: e.clientX,
        startY: e.clientY,
        ...px,
      };
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    // MIN sizes so it never collapses
    const MIN_W = 24;
    const MIN_H = 18;

    if (s.mode === "move") {
      onMoveResize({
        left: s.left + dx,
        top: s.top + dy,
        width: s.width,
        height: s.height,
      });
      return;
    }

    // resize
    const dir = s.dir!;
    let left = s.left;
    let top = s.top;
    let width = s.width;
    let height = s.height;

    const hasN = dir.includes("n");
    const hasS = dir.includes("s");
    const hasE = dir.includes("e");
    const hasW = dir.includes("w");

    if (hasE) width = s.width + dx;
    if (hasS) height = s.height + dy;

    if (hasW) {
      width = s.width - dx;
      left = s.left + dx;
    }
    if (hasN) {
      height = s.height - dy;
      top = s.top + dy;
    }

    // clamp with anchoring
    if (width < MIN_W) {
      const diff = MIN_W - width;
      width = MIN_W;
      if (hasW) left -= diff; // keep opposite edge stable
    }
    if (height < MIN_H) {
      const diff = MIN_H - height;
      height = MIN_H;
      if (hasN) top -= diff;
    }

    onMoveResize({ left, top, width, height });
  }

  function endPointer(e: React.PointerEvent) {
    release(e);
    startRef.current = null;
    setDragging(false);
  }

  // handle styles
  const handleBase =
    "absolute z-20 bg-white/90 border border-black/20 rounded-[3px]";
  const handleSize = "w-2.5 h-2.5"; // ~10px

  const handles: { dir: ResizeDir; cls: string; cursor: string }[] = [
    { dir: "nw", cls: "left-[-5px] top-[-5px]", cursor: "nwse-resize" },
    { dir: "ne", cls: "right-[-5px] top-[-5px]", cursor: "nesw-resize" },
    { dir: "sw", cls: "left-[-5px] bottom-[-5px]", cursor: "nesw-resize" },
    { dir: "se", cls: "right-[-5px] bottom-[-5px]", cursor: "nwse-resize" },
    {
      dir: "n",
      cls: "left-1/2 -translate-x-1/2 top-[-5px]",
      cursor: "ns-resize",
    },
    {
      dir: "s",
      cls: "left-1/2 -translate-x-1/2 bottom-[-5px]",
      cursor: "ns-resize",
    },
    {
      dir: "w",
      cls: "top-1/2 -translate-y-1/2 left-[-5px]",
      cursor: "ew-resize",
    },
    {
      dir: "e",
      cls: "top-1/2 -translate-y-1/2 right-[-5px]",
      cursor: "ew-resize",
    },
  ];

  return (
    <div
      ref={boxRef}
      className={[
        "absolute overflow-hidden rounded-md border-2 select-none",
        "bg-card text-card-text",
        dragging ? "cursor-grabbing" : "cursor-grab",
        selected
          ? "bg-primary border-primary-border text-primary-text"
          : "border-card-border hover:border-secondary-border",
      ].join(" ")}
      style={{
        left: px.left,
        top: px.top,
        width: px.width,
        height: px.height,
        pointerEvents: "auto",
        // ✅ Only block touch gestures while dragging; otherwise let user scroll PDF normally
        touchAction: dragging ? "none" : "pan-y",
      }}
      onPointerDown={onPointerDownMove}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      {/* Preview text area (same text as placement label/fieldKey, just styled) */}
      <div
        className="px-2 pb-2 pt-1 text-text"
        style={{
          fontSize,
          lineHeight: `${lineHeight}px`,
          textAlign: align as any,
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          wordBreak: multiline ? "break-word" : "normal",
        }}
        title={label}
      >
        {label}
      </div>

      {/* Resize handles (only show when selected) */}
      {selected &&
        handles.map((h) => (
          <div
            key={h.dir}
            className={[handleBase, handleSize, h.cls].join(" ")}
            style={{ cursor: h.cursor }}
            onPointerDown={onPointerDownResize(h.dir)}
          />
        ))}
    </div>
  );
}
