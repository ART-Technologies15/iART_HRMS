import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Phone,
  CalendarCheck,
  UserCog,
  LogOut,
  Calendar,
  Logs,
  CalendarDays,
  Megaphone
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ sidebarOpen, setSidebarOpen, user }) => {
  const { logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-8 py-3 font-medium ${isActive ? "bg-[#4EA3F7] text-white" : "text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <div
      className={`fixed md:static top-0 left-0 h-full w-64 bg-white border-r 
      border-gray-200 flex flex-col pt-6 z-30 transition-transform duration-300 
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
    >
      <h2 className="text-[#3a9ded] font-semibold text-lg mb-8 text-center">
        Welcome, {user?.name}
      </h2>

      <nav className="w-full flex-1">
        {/* Everyone */}
        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={linkClasses}
        >
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </NavLink>

        {/* Admin only */}
        {isAdmin && (
          <>
            <NavLink
              to="/users"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              <Users className="w-5 h-5" /> Users
            </NavLink>
            <NavLink
              to="/today-attendance"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              <Logs className="w-5 h-5" /> Today's Attendance
            </NavLink>

            <NavLink
              to="/monthly-attendance"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              <CalendarDays className="w-5 h-5" /> Monthly Attendance
            </NavLink>

            <NavLink
              to="/notification"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              <Megaphone className="w-5 h-5" /> Notification
            </NavLink>


            {/* <NavLink
              to="/user-attendance"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              <BarChart2 className="w-5 h-5" /> Attendance Report
            </NavLink> */}
          </>
        )}

        {/* Employee only */}
        {!isAdmin && (
          <NavLink
            to="/attendance"
            onClick={() => setSidebarOpen(false)}
            className={linkClasses}
          >
            <BarChart2 className="w-5 h-5" /> My Attendance
          </NavLink>
        )}

        {/* Everyone */}
        <NavLink
          to="/phone-book"
          onClick={() => setSidebarOpen(false)}
          className={linkClasses}
        >
          <Phone className="w-5 h-5" /> Phone Book
        </NavLink>
        <NavLink
          to="/calendar"
          onClick={() => setSidebarOpen(false)}
          className={linkClasses}
        >
          <Calendar className="w-5 h-5" /> Calendar
        </NavLink>

        <NavLink
          to="/leave"
          onClick={() => setSidebarOpen(false)}
          className={linkClasses}
        >
          <CalendarCheck className="w-5 h-5" /> Leave Management
        </NavLink>

        <NavLink
          to="/account"
          onClick={() => setSidebarOpen(false)}
          className={linkClasses}
        >
          <UserCog className="w-5 h-5" /> My Account
        </NavLink>
      </nav>

      <button
        onClick={() => {
          logout();
          setSidebarOpen(false);
        }}
        className="flex items-center gap-3 px-8 py-3 font-medium text-red-600 
        hover:bg-red-50 border-t border-gray-200 w-full"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </div>
  );
};

export default Sidebar;
