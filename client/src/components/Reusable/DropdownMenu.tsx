import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  offset?: number; // gap between trigger and menu
  closeOnSelect?: boolean;
}

type XY = { top: number; left: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  button,
  buttonClassName = "",
  menuClassName = "",
  children,
  position = "right-down",
  offset = 10,
  closeOnSelect = false,
}) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<XY>({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mount guard for portal (prevents hydration weirdness if ever used)
  useEffect(() => setMounted(true), []);

  const computePosition = useCallback(() => {
    const btn = buttonRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const rect = btn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // initial desired position
    let top = 0;
    let left = 0;

    switch (position) {
      case "right-down":
        top = rect.bottom + scrollY + offset;
        left = rect.left + scrollX;
        break;
      case "left-down":
        top = rect.bottom + scrollY + offset;
        left = rect.right + scrollX - menuRect.width;
        break;
      case "right-up":
        top = rect.top + scrollY - menuRect.height - offset;
        left = rect.left + scrollX;
        break;
      case "left-up":
        top = rect.top + scrollY - menuRect.height - offset;
        left = rect.right + scrollX - menuRect.width;
        break;
      case "up":
        top = rect.top + scrollY - menuRect.height - offset;
        left = rect.left + scrollX + rect.width / 2 - menuRect.width / 2;
        break;
      case "down":
        top = rect.bottom + scrollY + offset;
        left = rect.left + scrollX + rect.width / 2 - menuRect.width / 2;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2 - menuRect.height / 2;
        left = rect.left + scrollX - menuRect.width - offset;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2 - menuRect.height / 2;
        left = rect.right + scrollX + offset;
        break;
      default:
        top = rect.bottom + scrollY + offset;
        left = rect.left + scrollX;
    }

    // viewport collision handling (simple clamp)
    const padding = 10;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const minLeft = scrollX + padding;
    const maxLeft = scrollX + viewportW - menuRect.width - padding;

    const minTop = scrollY + padding;
    const maxTop = scrollY + viewportH - menuRect.height - padding;

    left = clamp(left, minLeft, maxLeft);
    top = clamp(top, minTop, maxTop);

    setCoords({ top, left });
  }, [position, offset]);

  // Close on outside click
  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // IMPORTANT FIX:
  // Use layout effect so measurement happens after DOM commit
  // and then schedule a second pass on the next animation frame.
  useLayoutEffect(() => {
    if (!open) return;

    // First pass
    computePosition();

    // Second pass after paint (fixes “first click wrong”)
    const raf = requestAnimationFrame(() => computePosition());

    return () => cancelAnimationFrame(raf);
  }, [open, computePosition]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;

    const onScroll = () => computePosition();
    const onResize = () => computePosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, computePosition]);

  const handleButtonClick = () => {
    setOpen((prev) => !prev);
  };

  // Optional: close when clicking an item inside the menu
  const handleMenuClickCapture = () => {
    if (closeOnSelect) setOpen(false);
  };

  // animation origin based on direction
  const origin = useMemo(() => {
    if (position.includes("up")) return "bottom";
    if (position.includes("down")) return "top";
    if (position === "left") return "right";
    if (position === "right") return "left";
    return "top";
  }, [position]);

  return (
    <>
      <div
        ref={buttonRef}
        onClick={handleButtonClick}
        className={`inline-flex justify-center items-center cursor-pointer ${buttonClassName}`}
      >
        {button}
      </div>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: coords.top,
              left: coords.left,
              zIndex: 50,
            }}
            className={[
              // Base panel styles (use your tokens only)
              "rounded-2xl border border-card-border bg-card",
              "p-2",
              // Animation
              "transition-all duration-200 ease-out",
              "animate-dropdownIn",
              menuClassName,
            ].join(" ")}
            onClickCapture={handleMenuClickCapture}
            data-origin={origin}
          >
            {children}
          </div>,
          document.body
        )}

      {/* Local styles for animation (no tailwind opacity classes needed) */}
      <style>
        {`
          @keyframes dropdownInTop {
            from { transform: translateY(-6px) scale(0.98); opacity: 0; }
            to   { transform: translateY(0)   scale(1);    opacity: 1; }
          }
          @keyframes dropdownInBottom {
            from { transform: translateY(6px) scale(0.98); opacity: 0; }
            to   { transform: translateY(0)  scale(1);    opacity: 1; }
          }
          @keyframes dropdownInLeft {
            from { transform: translateX(-6px) scale(0.98); opacity: 0; }
            to   { transform: translateX(0)    scale(1);    opacity: 1; }
          }
          @keyframes dropdownInRight {
            from { transform: translateX(6px) scale(0.98); opacity: 0; }
            to   { transform: translateX(0)   scale(1);    opacity: 1; }
          }

          /* default */
          .animate-dropdownIn { animation: dropdownInTop 200ms ease-out both; transform-origin: top; }

          /* use data-origin to change animation direction */
          [data-origin="bottom"].animate-dropdownIn { animation: dropdownInBottom 200ms ease-out both; transform-origin: bottom; }
          [data-origin="left"].animate-dropdownIn { animation: dropdownInLeft 200ms ease-out both; transform-origin: left; }
          [data-origin="right"].animate-dropdownIn { animation: dropdownInRight 200ms ease-out both; transform-origin: right; }
        `}
      </style>
    </>
  );
};

export default DropdownMenu;
