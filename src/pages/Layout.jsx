import React, { useState, useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/SideBar";
import { useAuth } from "../context/AuthContext";
import Header from "../components/CustomHeader";

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Close sidebar when clicking outside (on smaller screens)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="w-full flex h-screen overflow-hidden relative">
      {/* Sidebar */}
      <div ref={sidebarRef}>
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          user={user}
        />
      </div>

      {/* Overlay (only visible on small screens when sidebar is open) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Right side: header + content */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
        <Header
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <div className="flex-1 overflow-y-auto p-5 bg-[#F3F8FB]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
