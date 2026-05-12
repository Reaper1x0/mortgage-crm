import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

function Layout({ element }: { element: ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-background text-text">
      {/* Header */}
      <Navbar />
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
