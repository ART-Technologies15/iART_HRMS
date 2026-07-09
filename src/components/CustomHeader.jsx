import React from "react";
import { Menu, X, ShieldCheck, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import iArtLogo from "../assets/logoiart.svg";

const roleStyles = {
  admin: "bg-red-100 text-red-700",
  hr: "bg-violet-100 text-violet-700",
  employee: "bg-blue-100 text-blue-700",
};

const Header = ({ user, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 shadow-sm">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            {sidebarOpen ? (
              <X className="h-6 w-6 text-slate-700" />
            ) : (
              <Menu className="h-6 w-6 text-slate-700" />
            )}
          </button>

          <img
            src={iArtLogo}
            alt="iART"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Right */}
        <div
          onClick={() => navigate("/account")}
          className="flex items-center gap-3 cursor-pointer rounded-xl px-2 py-1 transition hover:bg-slate-100"
        >
          {/* Profile */}
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.name}
              className="h-11 w-11 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || <User size={18} />}
            </div>
          )}

          {/* User Details */}
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">
              {user?.name || "User"}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {user?.employeeId && (
                <span className="text-xs text-slate-500">
                  {user.employeeId}
                </span>
              )}

              {user?.designation && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">
                    {user.designation}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Role Badge */}
          <div
            className={`hidden md:flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleStyles[user?.role] || "bg-slate-100 text-slate-700"
              }`}
          >
            <ShieldCheck size={13} />
            {user?.role?.toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;