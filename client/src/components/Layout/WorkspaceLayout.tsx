import { Outlet, useLocation, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { LuBraces, LuInbox } from "react-icons/lu";
import { RiFileEditFill } from "react-icons/ri";
import { FiUsers, FiUser, FiUserPlus } from "react-icons/fi";
import { GrDashboard } from "react-icons/gr";
import { useEffect } from "react";

export default function WorkspaceLayout() {
  const { role, activeWorkspaceId, setActiveWorkspaceId, setActiveOrganizationId } = useAuth();
  const location = useLocation();
  const { organizationId, workspaceId: workspaceIdParam } = useParams();
  const workspaceId = workspaceIdParam || activeWorkspaceId || "";
  const isOnboarding = location.pathname.includes("/onboarding");
  const isTemplateDesigner =
    location.pathname.includes("/template-maker/") && location.pathname.includes("/manage");

  const withWorkspace = (suffix: string) =>
    organizationId && workspaceId
      ? `/${organizationId}/workspaces/${workspaceId}/${suffix}`
      : `/${suffix}`;

  const defaultLinks: SidebarLink[] = [
    { to: withWorkspace("dashboard"), label: "Dashboard", icon: GrDashboard },
    { to: withWorkspace("submissions"), label: "Clients", icon: LuInbox },
    { to: withWorkspace("master-fields"), label: "Master Fields Schema", icon: LuBraces },
    { to: withWorkspace("template-maker"), label: "Templates", icon: RiFileEditFill },
    { to: withWorkspace("leads"), label: "Leads", icon: FiUserPlus },
    {
      to: organizationId ? `/${organizationId}/profile` : "/profile",
      label: "Profile",
      icon: FiUser,
    },
  ];

  const links: SidebarLink[] =
    role === "Admin"
      ? [...defaultLinks, { to: withWorkspace("users"), label: "Users", icon: FiUsers }]
      : defaultLinks;

  useEffect(() => {
    if (organizationId) setActiveOrganizationId(organizationId);
    if (workspaceIdParam) setActiveWorkspaceId(workspaceIdParam);
  }, [organizationId, workspaceIdParam, setActiveOrganizationId, setActiveWorkspaceId]);

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
