import { Outlet, useParams } from "react-router";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { RiBuildingLine } from "react-icons/ri";
import { FiCreditCard } from "react-icons/fi";

export default function SettingsLayout() {
  const { organizationId } = useParams();
  const base = organizationId ? `/${organizationId}/settings` : "/settings";
  const links: SidebarLink[] = [
    { to: `${base}/organization`, label: "Organization", icon: RiBuildingLine },
    { to: `${base}/billing`, label: "Billing", icon: FiCreditCard },
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
