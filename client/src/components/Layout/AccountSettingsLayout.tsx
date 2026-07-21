import { useMemo } from "react";
import { Outlet, useParams } from "react-router";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { FiUser } from "react-icons/fi";

export default function AccountSettingsLayout() {
  const { organizationId } = useParams();
  const base = organizationId ? `/${organizationId}/account` : "/account";

  const links: SidebarLink[] = useMemo(
    () => [{ to: `${base}/profile`, label: "Profile", icon: FiUser }],
    [base]
  );

  return (
    <div className="min-h-screen bg-background text-text">
      <Navbar />
      <div className="pt-14">
        <div className="flex w-full">
          <Sidebar links={links} />
          <main className="min-w-0 flex-1 px-4 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
