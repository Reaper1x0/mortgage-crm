import { Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { LuBraces, LuInbox } from "react-icons/lu";
import { RiFileEditFill } from "react-icons/ri";
import { FiUsers, FiUser, FiUserPlus } from "react-icons/fi";
import { GrDashboard } from "react-icons/gr";

export default function WorkspaceLayout() {
  const { role } = useAuth();
  const location = useLocation();
  const isOnboarding = location.pathname.includes("/workspace/onboarding");
  const isTemplateDesigner =
    location.pathname.includes("/template-maker/") && location.pathname.includes("/manage");

  const defaultLinks: SidebarLink[] = [
    { to: "/workspace/dashboard/analytics", label: "Dashboard", icon: GrDashboard },
    { to: "/workspace/submissions", label: "Clients", icon: LuInbox },
    { to: "/workspace/master-fields", label: "Master Fields Schema", icon: LuBraces },
    { to: "/workspace/template-maker", label: "Templates", icon: RiFileEditFill },
    { to: "/workspace/leads", label: "Leads", icon: FiUserPlus },
    { to: "/workspace/profile", label: "Profile", icon: FiUser },
  ];

  const links: SidebarLink[] =
    role === "Admin"
      ? [...defaultLinks, { to: "/workspace/users", label: "Users", icon: FiUsers }]
      : defaultLinks;

  return (
    <div className="min-h-screen bg-background text-text">
      <Navbar />
      <div className="pt-14">
        <div className="flex w-full gap-4 px-4">
          {!isOnboarding && !isTemplateDesigner && <Sidebar links={links} />}
          <main className={isOnboarding ? "min-w-0 flex-1 py-10" : "min-w-0 flex-1 py-4"}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
