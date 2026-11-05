import React from "react";
import { Menu, X, ShieldCheck, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import iArtLogo from "../assets/logoiart.svg";
import ThemeToggle from "./ThemeToggle";

const roleStyles = {
  admin: "bg-red-100 text-red-700",
  hr: "bg-violet-100 text-violet-700",
  employee: "bg-blue-100 text-blue-700",
};

const Header = ({ user, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div
            onClick={() => navigate("/account")}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {/* Profile */}
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-slate-600"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {user?.name?.charAt(0)?.toUpperCase() || <User size={18} />}
              </div>
            )}

            {/* User Details */}
            <div className="hidden min-w-0 flex-col leading-tight sm:flex">
              <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {user?.name || "User"}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                {user?.employeeId && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {user.employeeId}
                  </span>
                )}

                {user?.designation && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.designation}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Role Badge */}
            <div
              className={`hidden items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize md:flex ${roleStyles[user?.role] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
            >
              <ShieldCheck size={13} />
              {user?.role?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;