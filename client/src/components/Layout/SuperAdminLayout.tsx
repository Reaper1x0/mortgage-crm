import { Outlet, useNavigate } from "react-router";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { FiBarChart2, FiUser, FiUsers, FiCreditCard, FiActivity, FiGrid } from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../Reusable/Avatar";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import DropdownMenu from "../Reusable/DropdownMenu";
import Button from "../Reusable/Button";

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const links: SidebarLink[] = [
    { to: "/super-admin/dashboard", label: "Dashboard", icon: FiBarChart2 },
    { to: "/super-admin/users", label: "Users", icon: FiUsers },
    { to: "/super-admin/organizations", label: "Organizations", icon: RiBuildingLine },
    { to: "/super-admin/workspaces", label: "Workspaces", icon: FiGrid },
    { to: "/super-admin/subscriptions", label: "Subscriptions", icon: FiActivity },
    { to: "/super-admin/plans", label: "Plans", icon: FiCreditCard },
    { to: "/super-admin/profile", label: "Profile", icon: FiUser },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 border-b border-card-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="text-lg font-bold text-text">System Super Admin</div>
          <DropdownMenu
            position="left-down"
            button={
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-card-border bg-background px-2 py-1.5">
                <Avatar user={normalizeUserForAvatar(user)} size="sm" />
                <span className="hidden sm:block text-sm font-semibold">{user?.fullName || "User"}</span>
              </button>
            }
          >
            <button
              type="button"
              onClick={() => navigate("/super-admin/profile")}
              className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-card-hover"
            >
              Profile
            </button>
            <Button variant="danger" onClick={handleLogout} className="w-full mt-1">
              Logout
            </Button>
          </DropdownMenu>
        </div>
      </header>
        <div className="flex w-full gap-4 px-4">
        <Sidebar links={links} />
        <main className="min-w-0 flex-1 py-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
