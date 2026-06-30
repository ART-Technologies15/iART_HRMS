import React from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import iArtLogo from "../assets/logoiart.svg";
import { useNavigate } from "react-router-dom";

const Header = ({ user, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  return (
    <header className="w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Left: Toggle + Logo */}
      <div className="flex items-center gap-3">
        {/* Toggle (only visible on mobile) */}
        <button
          className="p-2 rounded-md md:hidden hover:bg-gray-100 transition"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>

        {/* Logo */}
        <img
          src={iArtLogo}
          alt="App Logo"
          className="w-25 h-25 object-contain" // 👈 Larger logo size
        />
      </div>

      {/* Right: User Info */}

      <div
        className="flex items-center gap-3 cursor-pointer min-w-0"
        onClick={() => navigate("/account")}
      >
        <span className="font-medium text-gray-800 truncate max-w-[150px] sm:max-w-[200px]">
          {user?.name || "Jane Cooper"}
        </span>
      </div>
    </header>
  );
};

export default Header;
