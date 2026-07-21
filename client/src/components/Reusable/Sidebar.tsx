import React, { useMemo } from "react";
import { NavLink } from "react-router";
import type { IconType } from "react-icons";
import { cn } from "../../utils/cn";
import CollapsibleSidebar from "./CollapsibleSidebar";

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
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3",
          "rounded-lg px-2 py-1.5",
          "text-sm font-medium",
          "transition-colors duration-150 outline-none",
          collapsed ? "justify-center px-1" : "",
          isActive
            ? "bg-primary-muted text-text"
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
};

/* -------------------- Sidebar -------------------- */

const Sidebar: React.FC<SidebarProps> = ({ links = [] }) => {
  const groupedLinks = useMemo(() => links, [links]);

  return (
    <CollapsibleSidebar mobileTitle="Navigation">
      {({ collapsed, closeMobile }) => (
        <nav className="space-y-0.5">
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
