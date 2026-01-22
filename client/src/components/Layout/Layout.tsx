import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { User } from "../../types/auth.types";

function Layout({ element }: { element: ReactNode }) {
  const user: User = JSON.parse(localStorage.getItem("user")!);

  return (
    <div className="flex flex-col h-full min-h-screen bg-background text-text">
      {/* Header */}
      <Navbar user={user} />
      <div className="flex-1 min-h-screen">
        {/* Content area */}
        <main>{element}</main>
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Layout;
