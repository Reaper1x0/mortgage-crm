import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

export type DropdownPosition =
  | "right-down"
  | "left-down"
  | "left-up"
  | "right-up"
  | "up"
  | "down"
  | "left"
  | "right";

type XY = { top: number; left: number };

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  position: DropdownPosition;
  offset: number;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(component: string): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <DropdownMenu>`);
  }
  return ctx;
}

const VIEWPORT_PAD = 8;

function placeMenu(
  trigger: DOMRect,
  menu: DOMRect,
  position: DropdownPosition,
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

type DropdownMenuRootProps = {
  children: ReactNode;
  position?: DropdownPosition;
  offset?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DropdownMenu({
  children,
  position = "right-down",
  offset = 8,
  open: openControlled,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? Boolean(openControlled) : uncontrolledOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  const value = useMemo(
    () => ({ open, setOpen, toggle, close, triggerRef, contentId, position, offset }),
    [open, setOpen, toggle, close, contentId, position, offset],
  );

  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

type DropdownMenuTriggerProps = {
  children: ReactElement;
  className?: string;
};

export function DropdownMenuTrigger({ children, className }: DropdownMenuTriggerProps) {
  const { open, toggle, triggerRef, contentId } = useDropdownContext("DropdownMenuTrigger");

  const child = React.Children.only(children) as ReactElement<
    ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLElement> }
  >;

  return React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof childRef === "function") childRef(node);
      else if (childRef && typeof childRef === "object") {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    type: child.props.type ?? "button",
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    className: cn(child.props.className, className),
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented) toggle();
    },
  });
}

type DropdownMenuContentProps = {
  children: ReactNode;
  className?: string;
};

export function DropdownMenuContent({ children, className }: DropdownMenuContentProps) {
  const { open, close, triggerRef, contentId, position, offset } = useDropdownContext("DropdownMenuContent");
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<XY | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    setCoords(placeMenu(trigger.getBoundingClientRect(), menu.getBoundingClientRect(), position, offset));
  }, [triggerRef, position, offset]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => updatePosition();

    // pointerdown (not click) so outside dismiss doesn't race item selection
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, triggerRef, updatePosition]);

  if (!open) return null;

  const origin =
    position.endsWith("up") || position === "up"
      ? "bottom"
      : position === "left"
        ? "right"
        : position === "right"
          ? "left"
          : "top";

  const style: CSSProperties = {
    position: "fixed",
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    visibility: coords ? "visible" : "hidden",
    transformOrigin: origin,
  };

  return createPortal(
    <div
      ref={menuRef}
      id={contentId}
      role="menu"
      tabIndex={-1}
      data-origin={origin}
      style={style}
      className={cn(
        "z-[80] rounded-2xl border border-card-border bg-card p-2 shadow-lg",
        "menu-pop",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

type DropdownMenuItemProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Visual tone for destructive actions like Logout. */
  tone?: "default" | "danger";
  /** Called when the item is chosen. Menu closes after this unless event.preventDefault(). */
  onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled">;

export function DropdownMenuItem({
  children,
  className,
  disabled = false,
  tone = "default",
  onSelect,
  ...rest
}: DropdownMenuItemProps) {
  const { close } = useDropdownContext("DropdownMenuItem");

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      {...rest}
      className={cn(
        "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold outline-none transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger" ? "text-danger" : "text-text",
        "hover:bg-card-hover focus-visible:bg-card-hover",
        className,
      )}
      onClick={(event) => {
        if (disabled) return;
        onSelect?.(event);
        // Close after the consumer handler so modals/navigation still run.
        if (!event.defaultPrevented) {
          close();
        }
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-2 py-2", className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-2 border-t border-card-border", className)} role="separator" />;
}

export default DropdownMenu;
