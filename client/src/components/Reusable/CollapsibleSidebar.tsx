import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { FaBars } from "react-icons/fa";
import { cn } from "../../utils/cn";

export type CollapsibleSidebarState = {
  collapsed: boolean;
  mobileOpen: boolean;
  closeMobile: () => void;
};

export interface CollapsibleSidebarProps {
  children: React.ReactNode | ((state: CollapsibleSidebarState) => React.ReactNode);
  desktopHeader?: React.ReactNode | ((state: CollapsibleSidebarState) => React.ReactNode);
  mobileTitle?: string;
  defaultCollapsed?: boolean;
  showDesktopToggle?: boolean;
  expandedWidthClass?: string;
  collapsedWidthClass?: string;
  stickyTopClass?: string;
  className?: string;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  children,
  desktopHeader,
  mobileTitle = "Menu",
  defaultCollapsed = false,
  showDesktopToggle = true,
  expandedWidthClass = "w-[280px]",
  collapsedWidthClass = "w-[88px]",
  stickyTopClass = "top-14",
  className,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const widthClass = collapsed ? collapsedWidthClass : expandedWidthClass;
  const sidebarState: CollapsibleSidebarState = {
    collapsed,
    mobileOpen,
    closeMobile: () => setMobileOpen(false),
  };

  const renderContent = (state: CollapsibleSidebarState) =>
    typeof children === "function" ? children(state) : children;

  const renderDesktopHeader =
    typeof desktopHeader === "function" ? desktopHeader(sidebarState) : desktopHeader;

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
        title={mobileOpen ? "Close sidebar" : "Open sidebar"}
        className={cn(
          "md:hidden",
          "fixed left-2 top-2 z-[60]",
          "inline-flex h-10 w-10 items-center justify-center",
          "shadow-sm transition-all duration-200 hover:bg-card-hover"
        )}
      >
        {mobileOpen ? <FiX size={22} /> : <FaBars size={22} />}
      </button>

      <div
        className={cn(
          "md:hidden",
          "fixed inset-0 z-[50]",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar backdrop"
          className={cn(
            "absolute inset-0",
            "bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />

        <aside
          className={cn(
            "absolute left-0 top-0 h-full bg-background",
            "w-[280px] max-w-[85vw]",
            "py-4 pt-20",
            "transition-transform duration-300 ease-out",
            "will-change-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-3xl">
            {mobileTitle ? (
              <div className="px-4 pb-2 text-sm font-semibold text-text">{mobileTitle}</div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3">
              {renderContent({ ...sidebarState, collapsed: false })}
            </div>
          </div>
        </aside>
      </div>

      <aside
        className={cn(
          "hidden md:flex md:flex-col",
          "sticky self-start shrink-0",
          stickyTopClass,
          "py-4",
          "transition-[width] duration-200 ease-out",
          widthClass,
          className
        )}
        style={{ height: "calc(100vh - 56px)" }}
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl">
          {(showDesktopToggle || renderDesktopHeader) && (
            <div className="shrink-0 px-3 py-3">
              <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
                {showDesktopToggle ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-label="Toggle sidebar"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center",
                      "rounded-2xl border border-card-border bg-background",
                      "shadow-sm transition-all duration-200 hover:bg-card-hover"
                    )}
                  >
                    {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
                  </button>
                ) : null}
                {!collapsed && renderDesktopHeader ? (
                  <div className="min-w-0 flex-1">{renderDesktopHeader}</div>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3">
            {renderContent(sidebarState)}
          </div>
        </div>
      </aside>
    </>
  );
};

export default CollapsibleSidebar;
