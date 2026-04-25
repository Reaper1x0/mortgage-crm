import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { RiBuildingLine } from "react-icons/ri";
import { IoLayersOutline } from "react-icons/io5";

export default function SettingsLayout() {
  const links: SidebarLink[] = [
    { to: "/workspace/settings/organization", label: "Organization Settings", icon: RiBuildingLine },
    { to: "/workspace/settings/workspace", label: "Workspace Settings", icon: IoLayersOutline },
  ];

  return (
    <div className="min-h-screen bg-background text-text">
      <Navbar />
      <div className="pt-14">
        <div className="flex w-full gap-4 px-4">
          <Sidebar links={links} />
          <main className="min-w-0 flex-1 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
