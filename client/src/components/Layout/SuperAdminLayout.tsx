import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import {
  FiActivity,
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiLock,
  FiSettings,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../Reusable/DropdownMenu";
import Modal from "../Reusable/Modal";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const links: SidebarLink[] = [
    { to: "/super-admin/dashboard", label: "Dashboard", icon: FiBarChart2 },
    { to: "/super-admin/users", label: "Users", icon: FiUsers },
    { to: "/super-admin/organizations", label: "Organizations", icon: RiBuildingLine },
    { to: "/super-admin/workspaces", label: "Workspaces", icon: FiGrid },
    { to: "/super-admin/subscriptions", label: "Subscriptions", icon: FiActivity },
    { to: "/super-admin/plans", label: "Plans", icon: FiCreditCard },
    { to: "/super-admin/profile", label: "Profile", icon: FiUser },
    { to: "/super-admin/security", label: "Security", icon: FiLock },
    { to: "/super-admin/preferences", label: "Preferences", icon: FiSettings },
  ];

  const handleLogoutClick = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    } finally {
      setLogoutLoading(false);
      setLogoutModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 border-b border-card-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="text-lg font-bold text-text">System Super Admin</div>
          <DropdownMenu position="left-down">
            <DropdownMenuTrigger>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2",
                  "rounded-full border border-card-border bg-background",
                  "px-2 py-1.5",
                  "shadow-sm transition-all duration-200",
                  "hover:bg-card-hover"
                )}
                aria-label="User menu"
              >
                <Avatar user={normalizeUserForAvatar(user)} size="sm" />
                <div className="hidden flex-col pr-2 sm:flex">
                  <span className="text-sm font-semibold leading-tight text-text">
                    {user?.fullName || "User"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[240px]">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold text-text">{user?.fullName || "User"}</div>
                <div className="text-xs text-card-text">{user?.email || ""}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex flex-col gap-1">
                <DropdownMenuItem onSelect={() => navigate("/super-admin/profile")}>
                  Account settings
                </DropdownMenuItem>
                <DropdownMenuItem tone="danger" onSelect={() => setLogoutModalOpen(true)}>
                  Logout
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex w-full">
        <Sidebar links={links} />
        <main className="min-w-0 flex-1 px-4 py-2">
          <Outlet />
        </main>
      </div>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setLogoutModalOpen(false)}>
        <h2 className="mb-2 text-lg font-semibold text-text">Log out?</h2>
        <p className="mb-6 text-card-text">Are you sure you want to log out of your account?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setLogoutModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogoutClick} isLoading={logoutLoading}>
            Logout
          </Button>
        </div>
      </Modal>
    </div>
  );
}
