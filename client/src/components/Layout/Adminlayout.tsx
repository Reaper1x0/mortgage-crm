import { Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { LuBraces, LuInbox } from "react-icons/lu";
import { RiFileEditFill } from "react-icons/ri";
import { FiUsers, FiUser } from "react-icons/fi";
import { GrDashboard } from "react-icons/gr";

export default function Layout() {
  const { role } = useAuth();
  const location = useLocation();
  
  // Hide sidebar on template designer page
  const isTemplateDesigner = location.pathname.includes("/template-maker/") && location.pathname.includes("/manage");

  const defaultLinks: SidebarLink[] = [
    { to: "/workspace/dashboard/analytics", label: "Dashboard", icon: GrDashboard },
    { to: "/workspace/submissions", label: "Submissions", icon: LuInbox },
    { to: "/workspace/master-fields", label: "Master Fields Schema", icon: LuBraces },
    { to: "/workspace/template-maker", label: "Templates", icon: RiFileEditFill },
    { to: "/workspace/profile", label: "Profile", icon: FiUser },
  ];

  // Add Users link only for Admin
  const links: SidebarLink[] =
    role === "Admin"
      ? [...defaultLinks, { to: "/workspace/users", label: "Users", icon: FiUsers }]
      : defaultLinks;

  return (
    <div className="min-h-screen bg-background text-text">
      <Navbar />

      {/* fixed header offset */}
      <div className="pt-14">
        <div className="flex w-full gap-4 px-4">
          {/* Sidebar - hidden on template designer page */}
          {!isTemplateDesigner && <Sidebar links={links} />}

          {/* Main */}
          <main className="min-w-0 flex-1 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
