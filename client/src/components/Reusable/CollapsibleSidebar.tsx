import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { LuPanelLeft, LuPanelLeftOpen } from "react-icons/lu";
import { cn } from "../../utils/cn";
import Tooltip from "./Tooltip";

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

const sidebarToggleButtonClass = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center",
  "rounded-lg border border-card-border bg-background",
  "text-card-text transition-colors duration-200",
  "hover:bg-card-hover hover:text-text"
);

function SidebarToggleButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <Tooltip content={label} placement="top">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={sidebarToggleButtonClass}
      >
        {collapsed ? <LuPanelLeftOpen size={16} /> : <LuPanelLeft size={16} />}
      </button>
    </Tooltip>
  );
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  children,
  desktopHeader,
  mobileTitle = "Menu",
  defaultCollapsed = false,
  showDesktopToggle = true,
  expandedWidthClass = "w-[240px]",
  collapsedWidthClass = "w-[72px]",
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
      <Tooltip content={mobileOpen ? "Close sidebar" : "Open sidebar"} placement="bottom">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
          className={cn("md:hidden", "fixed left-2 top-2 z-[60]", sidebarToggleButtonClass)}
        >
          {mobileOpen ? <FiX size={18} /> : <LuPanelLeft size={18} />}
        </button>
      </Tooltip>

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
            "absolute left-0 top-0 h-full bg-card border-r border-card-border",
            "w-[280px] max-w-[85vw]",
            "py-4 pt-20",
            "transition-transform duration-300 ease-out",
            "will-change-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative flex h-full flex-col overflow-hidden">
            {mobileTitle ? (
              <div className="px-4 pb-2 text-sm font-semibold text-text">{mobileTitle}</div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3">
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
          "border-r border-card-border bg-card",
          "transition-[width] duration-200 ease-out",
          widthClass,
          className
        )}
        style={{ height: "calc(100vh - 56px)" }}
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          {renderDesktopHeader ? (
            <div className={cn("shrink-0 px-3 py-3", collapsed && "flex justify-center")}>
              {!collapsed ? (
                <div className="min-w-0">{renderDesktopHeader}</div>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
            {renderContent(sidebarState)}
          </div>

          {showDesktopToggle ? (
            <div
              className={cn(
                "shrink-0 border-t border-card-border px-2 py-2",
                "flex",
                collapsed ? "justify-center" : "justify-end"
              )}
            >
              <SidebarToggleButton
                collapsed={collapsed}
                onClick={() => setCollapsed((prev) => !prev)}
              />
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};

export default CollapsibleSidebar;
