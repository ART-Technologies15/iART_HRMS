import React, { useEffect, useRef, useState } from "react";
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
  Megaphone,
  LucideCalendarCheck2,
  LaptopMinimalCheck,
  ChartCandlestick,
  FileText,
  FilePenLine,
  Handshake,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  UsersRound,
  ClipboardCheck,
  Building2,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Keeps sidebar scroll position even if Sidebar remounts
let savedNavScrollTop = 0;

const Sidebar = ({ sidebarOpen, setSidebarOpen, user }) => {
  const { logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isHr = user?.role === "hr";

  const navRef = useRef(null);

  // =========================================================
  // Restore scroll position
  // =========================================================

  useEffect(() => {
    if (navRef.current) {
      requestAnimationFrame(() => {
        navRef.current.scrollTop = savedNavScrollTop;
      });
    }
  }, []);

  const handleNavScroll = () => {
    if (navRef.current) {
      savedNavScrollTop = navRef.current.scrollTop;
    }
  };

  // =========================================================
  // Group state
  // =========================================================

  const [openGroups, setOpenGroups] = useState({
    attendance: true,
    people: true,
    workplace: true,
    business: true,
    career: true,
  });

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // =========================================================
  // Common menu classes
  // =========================================================

  const linkClasses = ({ isActive }) =>
    `
      group flex items-center gap-3
      mx-3 my-1 px-4 py-2.5
      rounded-xl
      text-sm font-medium
      transition-all duration-200
      ${
        isActive
          ? "bg-[#4EA3F7] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }
    `;

  const iconClasses = ({ isActive }) =>
    `w-[18px] h-[18px] shrink-0 ${
      isActive
        ? "text-white"
        : "text-slate-400 group-hover:text-slate-700"
    }`;

  // =========================================================
  // Group Header
  // =========================================================

  const GroupHeader = ({ title, icon: Icon, group }) => {
    const isOpen = openGroups[group];

    return (
      <button
        type="button"
        onClick={() => toggleGroup(group)}
        className="
          flex w-full items-center justify-between
          px-6 py-2.5
          mt-3
          text-[11px]
          font-bold
          uppercase
          tracking-wider
          text-slate-400
          hover:text-slate-700
          transition-colors
        "
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </span>

        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 z-50
        flex h-screen w-60 flex-col
        bg-white
        border-r border-slate-200

        transition-transform duration-300

        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:translate-x-0
      `}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="shrink-0 border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-11 w-11
              shrink-0
              items-center justify-center
              rounded-xl
              bg-[#4EA3F7]
              text-lg
              font-bold
              text-white
              shadow-sm
            "
          >
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user?.name || "User"}
            </p>

            <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">
              {user?.role || "Employee"}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        className="
          flex-1
          min-h-0
          w-full
          overflow-y-auto
          overflow-x-hidden
          overscroll-contain
          py-3

          scrollbar-thin
          scrollbar-thumb-slate-200
          scrollbar-track-transparent
        "
      >
        {/* ===================================================
            OVERVIEW
        ==================================================== */}

        <div className="mb-2">
          <p className="px-6 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Overview
          </p>

          <NavLink
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={linkClasses}
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard className={iconClasses({ isActive })} />
                <span>Dashboard</span>
              </>
            )}
          </NavLink>
        </div>

        {/* ===================================================
            ATTENDANCE
        ==================================================== */}

        {(isAdmin || isHr || !isAdmin) && (
          <>
            <GroupHeader
              title="Attendance"
              icon={ClipboardCheck}
              group="attendance"
            />

            {openGroups.attendance && (
              <div>
                {/* Employee */}
                {!isAdmin && (
                  <NavLink
                    to="/attendance"
                    onClick={() => setSidebarOpen(false)}
                    className={linkClasses}
                  >
                    {({ isActive }) => (
                      <>
                        <BarChart2
                          className={iconClasses({ isActive })}
                        />
                        <span>My Attendance</span>
                      </>
                    )}
                  </NavLink>
                )}

                {/* Admin */}
                {isAdmin && (
                  <>
                    <NavLink
                      to="/today-attendance"
                      onClick={() => setSidebarOpen(false)}
                      className={linkClasses}
                    >
                      {({ isActive }) => (
                        <>
                          <Logs
                            className={iconClasses({ isActive })}
                          />
                          <span>Today's Attendance</span>
                        </>
                      )}
                    </NavLink>

                    <NavLink
                      to="/monthly-attendance"
                      onClick={() => setSidebarOpen(false)}
                      className={linkClasses}
                    >
                      {({ isActive }) => (
                        <>
                          <CalendarDays
                            className={iconClasses({ isActive })}
                          />
                          <span>Monthly Attendance</span>
                        </>
                      )}
                    </NavLink>
                  </>
                )}

                {/* Admin + HR */}
                {(isAdmin || isHr) && (
                  <NavLink
                    to="/regularization"
                    onClick={() => setSidebarOpen(false)}
                    className={linkClasses}
                  >
                    {({ isActive }) => (
                      <>
                        <LucideCalendarCheck2
                          className={iconClasses({ isActive })}
                        />
                        <span>Regularization</span>
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            )}
          </>
        )}

        {/* ===================================================
            PEOPLE & HR
        ==================================================== */}

        {(isAdmin || isHr) && (
          <>
            <GroupHeader
              title="People & HR"
              icon={UsersRound}
              group="people"
            />

            {openGroups.people && (
              <div>
                <NavLink
                  to="/users"
                  onClick={() => setSidebarOpen(false)}
                  className={linkClasses}
                >
                  {({ isActive }) => (
                    <>
                      <Users className={iconClasses({ isActive })} />
                      <span>Users</span>
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/document-kyc"
                  onClick={() => setSidebarOpen(false)}
                  className={linkClasses}
                >
                  {({ isActive }) => (
                    <>
                      <FileText
                        className={iconClasses({ isActive })}
                      />
                      <span>Documents KYC</span>
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/assets"
                  onClick={() => setSidebarOpen(false)}
                  className={linkClasses}
                >
                  {({ isActive }) => (
                    <>
                      <LaptopMinimalCheck
                        className={iconClasses({ isActive })}
                      />
                      <span>Assets</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </>
        )}

        {/* Employee My Assets */}
        {!isAdmin && (
          <>
            <GroupHeader
              title="My Work"
              icon={Building2}
              group="mywork"
            />

            {openGroups.mywork && (
              <NavLink
                to="/my-assets"
                onClick={() => setSidebarOpen(false)}
                className={linkClasses}
              >
                {({ isActive }) => (
                  <>
                    <ChartCandlestick
                      className={iconClasses({ isActive })}
                    />
                    <span>My Assets</span>
                  </>
                )}
              </NavLink>
            )}
          </>
        )}

        {/* ===================================================
            WORKPLACE
        ==================================================== */}

        <GroupHeader
          title="Workplace"
          icon={Building2}
          group="workplace"
        />

        {openGroups.workplace && (
          <div>
            <NavLink
              to="/phone-book"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              {({ isActive }) => (
                <>
                  <Phone className={iconClasses({ isActive })} />
                  <span>Phone Book</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/calendar"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              {({ isActive }) => (
                <>
                  <Calendar className={iconClasses({ isActive })} />
                  <span>Calendar</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/leave"
              onClick={() => setSidebarOpen(false)}
              className={linkClasses}
            >
              {({ isActive }) => (
                <>
                  <CalendarCheck
                    className={iconClasses({ isActive })}
                  />
                  <span>Leave Management</span>
                </>
              )}
            </NavLink>
          </div>
        )}

        {/* ===================================================
            COMMUNICATION
        ==================================================== */}

        {isAdmin && (
          <>
            <GroupHeader
              title="Communication"
              icon={MessageSquare}
              group="communication"
            />

            {openGroups.communication && (
              <NavLink
                to="/notification"
                onClick={() => setSidebarOpen(false)}
                className={linkClasses}
              >
                {({ isActive }) => (
                  <>
                    <Megaphone
                      className={iconClasses({ isActive })}
                    />
                    <span>Notification</span>
                  </>
                )}
              </NavLink>
            )}
          </>
        )}

        {/* ===================================================
            BUSINESS
        ==================================================== */}

        {isAdmin && (
          <>
            <GroupHeader
              title="Business"
              icon={Handshake}
              group="business"
            />

            {openGroups.business && (
              <div>
                <NavLink
                  to="/Invoice"
                  onClick={() => setSidebarOpen(false)}
                  className={linkClasses}
                >
                  {({ isActive }) => (
                    <>
                      <FilePenLine
                        className={iconClasses({ isActive })}
                      />
                      <span>Client Invoice</span>
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/website-contact-us"
                  onClick={() => setSidebarOpen(false)}
                  className={linkClasses}
                >
                  {({ isActive }) => (
                    <>
                      <Handshake
                        className={iconClasses({ isActive })}
                      />
                      <span>Website Contact Us</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </>
        )}

        {/* ===================================================
            CAREER & TRAINING
        ==================================================== */}

        {(isAdmin || isHr) && (
          <>
            <GroupHeader
              title="Career & Training"
              icon={GraduationCap}
              group="career"
            />

            {openGroups.career && (
              <NavLink
                to="/career"
                onClick={() => setSidebarOpen(false)}
                className={linkClasses}
              >
                {({ isActive }) => (
                  <>
                    <BriefcaseBusiness
                      className={iconClasses({ isActive })}
                    />
                    <span>Career / Training</span>
                  </>
                )}
              </NavLink>
            )}
          </>
        )}

        {/* ===================================================
            ACCOUNT
        ==================================================== */}

        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="px-6 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Account
          </p>

          <NavLink
            to="/account"
            onClick={() => setSidebarOpen(false)}
            className={linkClasses}
          >
            {({ isActive }) => (
              <>
                <UserCog className={iconClasses({ isActive })} />
                <span>My Account</span>
              </>
            )}
          </NavLink>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </nav>

      {/* =====================================================
          LOGOUT
      ====================================================== */}

      <div className="shrink-0 border-t border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => {
            logout();
            setSidebarOpen(false);
          }}
          className="
            flex w-full
            items-center gap-3
            rounded-xl
            px-4 py-3
            text-sm
            font-medium
            text-red-600
            transition-colors
            hover:bg-red-50
          "
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;