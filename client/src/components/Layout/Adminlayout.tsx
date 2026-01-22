import { Outlet } from "react-router";
import useAuth from "../../hooks/useAuth";
import Navbar from "./Navbar";
import Sidebar, { SidebarLink } from "../Reusable/Sidebar";
import { LuBraces, LuInbox } from "react-icons/lu";
import { RiFileEditFill } from "react-icons/ri";

export default function Layout() {
  const { user } = useAuth();

  const defaultLinks: SidebarLink[] = [
    { to: "/workspace/submissions", label: "Submissions", icon: LuInbox },
    { to: "/workspace/master-fields", label: "Master Fields Schema", icon: LuBraces },
    { to: "/workspace/template-maker", label: "Templates", icon: RiFileEditFill },
  ];

  return (
    <div className="min-h-screen bg-background text-text">
      <Navbar user={user} />

      {/* fixed header offset */}
      <div className="pt-14">
        <div className="flex w-full gap-4 px-4">
          {/* Sidebar */}
          <Sidebar links={defaultLinks} />

          {/* Main */}
          <main className="min-w-0 flex-1 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
