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
  const groupedLinks = useMemo(() => links, [links]);

  return (
    <CollapsibleSidebar mobileTitle="Navigation">
      {({ collapsed, closeMobile }) => (
        <nav className="mt-1 space-y-1">
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
