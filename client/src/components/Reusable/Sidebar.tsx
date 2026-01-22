import React, { useMemo, useState } from "react";
import { NavLink } from "react-router";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import type { IconType } from "react-icons";
import { cn } from "../../utils/cn";
import { FaBars } from "react-icons/fa";

/* -------------------- Types -------------------- */

interface NavItemProps {
  to: string;
  label: string;
  Icon?: IconType;
  collapsed: boolean;
  onNavigate?: () => void;
}

export interface SidebarLink {
  to: string;
  label: string;
  icon?: IconType;
}

interface SidebarProps {
  links?: SidebarLink[];
  brandTitle?: string;
  brandSubtitle?: string;
}

/* -------------------- Nav item -------------------- */

const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  Icon,
  collapsed,
  onNavigate,
}) => {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3",
          "rounded-2xl px-2 py-1",
          "text-sm font-semibold",
          "transition-all duration-200",
          collapsed ? "justify-center px-1" : "",
          isActive
            ? "bg-card text-text"
            : "bg-background text-text hover:bg-card-hover"
        )
      }
    >
      <span className={cn("flex h-9 w-9 items-center justify-center")}>
        {Icon ? <Icon size={18} /> : <span className="inline-block h-6 w-6" />}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
};

/* -------------------- Sidebar -------------------- */

const Sidebar: React.FC<SidebarProps> = ({ links = [] }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const widthClass = collapsed ? "w-[88px]" : "w-[280px]";
  const groupedLinks = useMemo(() => links, [links]);

  return (
    <>
      {/* Mobile toggle (top-left) */}
      <button
        type="button"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
        title={mobileOpen ? "Close sidebar" : "Open sidebar"}
        className={cn(
          "md:hidden",
          "fixed left-2 top-2 z-[60]",
          "inline-flex h-10 w-10 items-center justify-center",
          "shadow-sm transition-all duration-200 hover:bg-card-hover",
        )}
      >
        {mobileOpen ? <FiX size={22} /> : <FaBars size={22} />}
      </button>

      {/* Mobile overlay + animated drawer */}
      <div
        className={cn(
          "md:hidden",
          "fixed inset-0 z-[50]",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
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

        {/* Drawer */}
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
          <div className={cn("relative h-full overflow-hidden rounded-3xl")}>
            {/* Links */}
            <nav className="mt-3 space-y-1 px-2 pb-3">
              {groupedLinks.map((link) => (
                <NavItem
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  Icon={link.icon}
                  collapsed={collapsed}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>
        </aside>
      </div>

      {/* Desktop sidebar (unchanged behavior) */}
      <aside
        className={cn(
          "hidden md:block",
          "sticky top-14 self-start shrink-0",
          "py-4",
          "transition-[width] duration-200 ease-out",
          widthClass
        )}
        style={{ height: "calc(100vh - 56px)" }}
      >
        <div className={cn("relative h-full overflow-hidden rounded-3xl")}>
          {/* Header */}
          <div className="px-3 py-3">
            {/* Toggle */}
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              aria-label="Toggle sidebar"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center",
                "rounded-2xl border border-card-border bg-background",
                "shadow-sm transition-all duration-200 hover:bg-card-hover"
              )}
            >
              {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
            </button>
          </div>

          {/* Links */}
          <nav className="mt-3 space-y-1 px-2 pb-3">
            {groupedLinks.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                label={link.label}
                Icon={link.icon}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
