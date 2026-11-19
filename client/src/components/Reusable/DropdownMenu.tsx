import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

interface DropdownMenuProps {
  button: React.ReactNode;
  buttonClassName?: string;
  menuClassName?: string;
  children: React.ReactNode;
  position?:
    | "right-down"
    | "left-down"
    | "left-up"
    | "right-up"
    | "up"
    | "down"
    | "left"
    | "right";
  offset?: number;
  closeOnSelect?: boolean;
}

type XY = { top: number; left: number };

const VIEWPORT_PAD = 8;

function placeMenu(
  trigger: DOMRect,
  menu: DOMRect,
  position: NonNullable<DropdownMenuProps["position"]>,
  offset: number,
): XY {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = menu.width;
  const height = menu.height;

  const alignLeft = () => trigger.left;
  const alignRight = () => trigger.right - width;
  const alignCenter = () => trigger.left + trigger.width / 2 - width / 2;

  let left = alignLeft();
  let top = trigger.bottom + offset;

  if (position === "left-down" || position === "left-up") left = alignRight();
  else if (position === "down" || position === "up") left = alignCenter();
  else if (position === "left") left = trigger.left - width - offset;
  else if (position === "right") left = trigger.right + offset;

  if (position === "left-up" || position === "right-up" || position === "up") {
    top = trigger.top - height - offset;
  } else if (position === "left" || position === "right") {
    top = trigger.top + trigger.height / 2 - height / 2;
  }

  const overflowsRight = left + width > vw - VIEWPORT_PAD;
  const overflowsLeft = left < VIEWPORT_PAD;
  if (position === "left" && overflowsLeft) left = trigger.right + offset;
  else if (position === "right" && overflowsRight) left = trigger.left - width - offset;
  else if (overflowsRight && !overflowsLeft) left = alignRight();
  else if (overflowsLeft && !overflowsRight) left = alignLeft();

  const overflowsBottom = top + height > vh - VIEWPORT_PAD;
  const overflowsTop = top < VIEWPORT_PAD;
  if ((position.endsWith("down") || position === "down") && overflowsBottom) {
    top = trigger.top - height - offset;
  } else if ((position.endsWith("up") || position === "up") && overflowsTop) {
    top = trigger.bottom + offset;
  }

  left = Math.min(Math.max(left, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vw - width - VIEWPORT_PAD));
  top = Math.min(Math.max(top, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD));

  return { top, left };
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  button,
  buttonClassName = "",
  menuClassName = "",
  children,
  position = "right-down",
  offset = 8,
  closeOnSelect = false,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<XY | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    setCoords(placeMenu(trigger.getBoundingClientRect(), menu.getBoundingClientRect(), position, offset));
  }, [position, offset]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onMove = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updatePosition]);

  const origin =
    position.endsWith("up") || position === "up"
      ? "bottom"
      : position === "left"
        ? "right"
        : position === "right"
          ? "left"
          : "top";

  return (
    <>
      <div
        ref={buttonRef}
        onClick={() => setOpen((current) => !current)}
        className={cn("inline-flex cursor-pointer items-center justify-center", buttonClassName)}
      >
        {button}
      </div>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              data-origin={origin}
              style={{
                position: "fixed",
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? "visible" : "hidden",
                transformOrigin: origin,
              }}
              className={cn(
                "z-[80] rounded-2xl border border-card-border bg-card p-2 shadow-lg",
                "menu-pop",
                menuClassName,
              )}
              onClickCapture={() => {
                if (closeOnSelect) setOpen(false);
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default DropdownMenu;
