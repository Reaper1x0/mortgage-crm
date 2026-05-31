import { Outlet, useLocation, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { usePermissionsOptional } from "../../context/PermissionContext";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { LuBraces, LuInbox } from "react-icons/lu";
import { RiFileEditFill } from "react-icons/ri";
import { FiUsers, FiUser, FiUserPlus } from "react-icons/fi";
import { GrDashboard } from "react-icons/gr";
import { useEffect, useMemo } from "react";

export default function WorkspaceLayout() {
  const { role, activeWorkspaceId, setActiveWorkspaceId, setActiveOrganizationId } = useAuth();
  const perm = usePermissionsOptional();
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

  const defaultLinks: SidebarLink[] = useMemo(
    () => {
      const nav: SidebarLink[] = [];
      if (perm?.canAnyWorkspace(["workspace.dashboard.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({ to: withWorkspace("dashboard"), label: "Dashboard", icon: GrDashboard });
      }
      if (perm?.canAnyWorkspace(["workspace.submissions.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({ to: withWorkspace("submissions"), label: "Clients", icon: LuInbox });
      }
      if (perm?.canAnyWorkspace(["workspace.masterfields.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({ to: withWorkspace("master-fields"), label: "Master Fields Schema", icon: LuBraces });
      }
      if (perm?.canAnyWorkspace(["workspace.templates.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({ to: withWorkspace("template-maker"), label: "Templates", icon: RiFileEditFill });
      }
      if (perm?.canAnyWorkspace(["workspace.leads.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({ to: withWorkspace("leads"), label: "Leads", icon: FiUserPlus });
      }
      if (perm?.canAnyOrg(["organization.organization.read"]) || perm?.effective?.isOrgOwner) {
        nav.push({
          to: organizationId ? `/${organizationId}/profile` : "/profile",
          label: "Profile",
          icon: FiUser,
        });
      }
      return nav;
    },
    [organizationId, workspaceId, perm]
  );

  const showUsersNav =
    role === "Admin" ||
    perm?.effective?.isOrgOwner ||
    perm?.canAnyWorkspace(["workspace.users.read", "workspace.users.manage"]) ||
    perm?.canAnyOrg(["organization.members.read", "organization.members.invite", "organization.members.update"]);

  const links: SidebarLink[] = useMemo(
    () => (showUsersNav ? [...defaultLinks, { to: withWorkspace("users"), label: "Users", icon: FiUsers }] : defaultLinks),
    [defaultLinks, showUsersNav, workspaceId, organizationId]
  );

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
          <main className="min-w-0 flex-1 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
