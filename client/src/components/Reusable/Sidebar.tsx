import React, { useMemo } from "react";
import { NavLink } from "react-router";
import type { IconType } from "react-icons";
import { cn } from "../../utils/cn";
import CollapsibleSidebar from "./CollapsibleSidebar";
import Tooltip from "./Tooltip";

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
  sectionLabel?: string;
}

/* -------------------- Nav item -------------------- */

const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  Icon,
  collapsed,
  onNavigate,
}) => {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3",
          "rounded-lg px-2 py-1.5",
          "text-sm font-medium",
          "transition-colors duration-150 outline-none",
          collapsed ? "justify-center px-1" : "",
          isActive
            ? "bg-primary text-primary-text"
            : "text-card-text hover:bg-card-hover hover:text-text"
        )
      }
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        {Icon ? <Icon size={18} /> : <span className="inline-block h-5 w-5" />}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip content={label} placement="right">
      {link}
    </Tooltip>
  );
};

/* -------------------- Sidebar -------------------- */

const Sidebar: React.FC<SidebarProps> = ({ links = [], sectionLabel }) => {
  const groupedLinks = useMemo(() => links, [links]);

  return (
    <CollapsibleSidebar>
      {({ collapsed, closeMobile }) => (
        <nav className="space-y-0.5">
          {sectionLabel && !collapsed ? (
            <p className="mb-2 truncate px-2 text-[11px] font-semibold uppercase tracking-wide text-card-text">
              {sectionLabel}
            </p>
          ) : null}
          {groupedLinks.map((link) => (
            <NavItem
              key={link.to}
              to={link.to}
              label={link.label}
              Icon={link.icon}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </nav>
      )}
    </CollapsibleSidebar>
  );
};

export default Sidebar;
