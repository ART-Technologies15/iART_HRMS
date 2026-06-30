import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardCard from "../components/DashboardCard";
import CustomTable from "../components/CustomTable";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { Bell, Cake, ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthlyWorkingHoursAPI } from "../api/attendaceApi";
import { getLeavesForAdmin as getLeavesForAdminAPI } from "../api/leaveApi";
import { getActiveNotifications } from "../api/notificationApi";
import { getAdminAttendanceByDate as getAttendanceByDateForAdminAPI } from "../api/attendaceApi";

const ONTIME_THRESHOLD_MINUTES = 10 * 60; // 10:00 AM

const fmtClock = (d) => {
  if (!d) return "-";
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const fmtDuration = (sec = 0) => {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remS = s % 60;
  return `${h}h ${m}m${s >= 3600 ? "" : ` ${remS}s`}`; // shorter when small
};

const fmtDateDDMMM = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const rangeFromLeaveDays = (leaveDays = []) => {
  if (!leaveDays.length) return "-";
  const sorted = [...leaveDays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const label =
    first.date === last.date
      ? `${fmtDateDDMMM(first.date)} (${first.type === "half" ? "Half" : "Full"
      })`
      : `${fmtDateDDMMM(first.date)} → ${fmtDateDDMMM(last.date)}`;
  return label;
};

const chip = (text, color) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
    {text}
  </span>
);

const sparkData = [
  { name: "W1", value: 40 },
  { name: "W2", value: 60 },
  { name: "W3", value: 45 },
  { name: "W4", value: 70 },
  { name: "W5", value: 50 },
  { name: "W8", value: 75 },
];

// ── Notification/birthday helpers (shared design with employee Dashboard) ──
const hexToRgba = (hex = "#3B82F6", alpha = 0.1) => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getReadableTextColor = (hex = "#3B82F6") => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.6) {
    return `rgba(${Math.floor(r * 0.25)}, ${Math.floor(g * 0.25)}, ${Math.floor(b * 0.25)}, 1)`;
  }
  return hex;
};

const getBodyTextColor = (hex = "#3B82F6") => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.6) {
    return "#374151";
  }
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const AVATAR_PALETTE = [
  { bg: "#FDE7E0", text: "#C2410C" },
  { bg: "#E3F1FF", text: "#1D4ED8" },
  { bg: "#E8F6E9", text: "#15803D" },
  { bg: "#F3E8FF", text: "#7E22CE" },
  { bg: "#FFF4D6", text: "#A16207" },
];

const avatarColorFor = (id = "") => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
};

const BirthdayCard = ({ person }) => {
  const accent = avatarColorFor(person._id);

  return (
    <div className="flex w-[280px] shrink-0 snap-start items-center gap-3 rounded-xl border border-[#FDE7C8] bg-gradient-to-br from-[#FFFBF0] to-[#FFF6E0] px-4 py-3">
      {person.profilePhoto ? (
        <img
          src={person.profilePhoto}
          alt={person.name}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 ring-white"
          style={{ background: accent.bg, color: accent.text }}
        >
          {initials(person.name) || "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-gray-800"
          title={person.name}
        >
          {person.name}
        </p>

        <p
          className="truncate text-xs text-gray-500"
          title={`${person.designation || ""}${person.department ? ` · ${person.department}` : ""
            }`}
        >
          {person.designation}
          {person.department ? ` · ${person.department}` : ""}
        </p>
      </div>

      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFEFC2] px-2.5 py-1 text-[11px] font-semibold text-[#8A5A00]">
        <Cake size={12} />
        Today
      </span>
    </div>
  );
};

const NotificationBanner = ({ notification }) => {
  const accent = notification.color || "#3B82F6";
  const bg = hexToRgba(accent, 0.1);
  const border = hexToRgba(accent, 0.3);
  const titleColor = getReadableTextColor(accent);
  const bodyColor = getBodyTextColor(accent);
  const dateColor = getReadableTextColor(accent);

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="relative flex w-[320px] shrink-0 snap-start items-start gap-3 rounded-xl px-4 py-3 sm:px-5 sm:py-4 transition-all"
      style={{
        background: bg,
        border: `1px solid ${border}`,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl flex-shrink-0"
        style={{ background: accent }}
      />

      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: hexToRgba(accent, 0.2) }}
      >
        <Bell size={14} style={{ color: accent }} />
      </div>

      <div className="flex-1 min-w-0 pl-1">

        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: titleColor }}
        >
          {notification.title}
        </p>

        <p
          className={`mt-1 text-xs leading-relaxed transition-all ${isExpanded ? "" : "line-clamp-2"
            }`}
          style={{ color: bodyColor }}
        >
          {notification.body}
        </p>

        {notification.body?.length > 100 && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="mt-1 text-[11px] font-semibold underline underline-offset-2 cursor-pointer bg-transparent border-none p-0"
            style={{ color: titleColor }}
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}

        <p
          className="mt-1.5 text-[11px] font-medium"
          style={{ color: dateColor, opacity: 0.75 }}
        >
          {new Date(notification.dateFrom).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {" — "}
          {new Date(notification.dateTo).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

const Carousel = ({ children, itemCount }) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = React.Children.toArray(children);

  const updateArrowState = () => {
    const el = trackRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;

    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);

    const children = Array.from(el.children);

    const viewportCenter = el.scrollLeft + el.clientWidth / 2;

    let active = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(childCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        active = index;
      }
    });

    if (el.scrollLeft >= maxScroll - 2) {
      active = children.length - 1;
    }

    setActiveIndex(active);
  };

  useEffect(() => {
    updateArrowState();
    const el = trackRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [itemCount]);

  const scrollByPage = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const scrollToIndex = (index) => {
    const el = trackRef.current;
    const target = el?.children?.[index];
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  };

  const showArrows = canScrollLeft || canScrollRight;
  const showDots = showArrows && items.length > 1;

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={updateArrowState}
          className="carousel-track flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>
        <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>

        {showArrows && (
          <>
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByPage(-1)}
              disabled={!canScrollLeft}
              className="absolute -left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md border border-gray-200 transition-opacity hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByPage(1)}
              disabled={!canScrollRight}
              className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md border border-gray-200 transition-opacity hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {showDots && (
        <div className="mt-2 flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to item ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === activeIndex ? "w-5 bg-gray-500" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SectionHeading = ({ title, subtitle, count, countTone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-[#FFEFC2] text-[#8A5A00]",
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        {typeof count === "number" && (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${toneClasses[countTone]}`}
          >
            {count}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // guard
  const isAdmin = user?.role === "admin";

  // Insight card states
  const [onTimePct, setOnTimePct] = useState({ value: "0%", change: "" }); // change not required for today
  const [presentXY, setPresentXY] = useState({ x: 0, y: 0 });
  const [totalWH, setTotalWH] = useState("0h 0m");

  // Tables
  const [todayAttendance, setTodayAttendance] = useState([]); // from admin-by-date
  const [todayLeaves, setTodayLeaves] = useState([]); // from leaves?date=today
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  // Month labels
  const [monthName, setMonthName] = useState("");
  const [prevMonthName, setPrevMonthName] = useState("");
  // Announcements + birthdays (same source/design as employee Dashboard)
  const [notifications, setNotifications] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getActiveNotifications();
        if (res?.success) {
          setNotifications(res.notifications || []);
          setBirthdays(res.birthdays || []);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    }

    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const now = new Date();
    const currMonth = now.getMonth() + 1;
    const currYear = now.getFullYear();
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    const prevYear = currMonth === 1 ? currYear - 1 : currYear;

    setMonthName(
      new Date(currYear, currMonth - 1).toLocaleString("default", {
        month: "long",
      })
    );
    setPrevMonthName(
      new Date(prevYear, prevMonth - 1).toLocaleString("default", {
        month: "long",
      })
    );

    const run = async () => {
      const todayISO = new Date().toISOString().slice(0, 10);

      try {
        const attRes = await getAttendanceByDateForAdminAPI(todayISO);

        if (!attRes?.success) {
          toast.error(attRes?.message || "Failed to fetch attendance");
          return;
        }

        const attData = attRes?.data || [];
        const filteredAtt = attData.filter(
          (r) => r.userId !== user._id && r.name.toLowerCase() !== "admin"
        );

        setTodayAttendance(filteredAtt);

        const allLeavesRes = await getLeavesForAdminAPI();
        const allLeaves =
          allLeavesRes?.data?.leaves || allLeavesRes?.leaves || [];
        const pending = allLeaves.filter((l) => l.status === "pending");
        setPendingLeavesCount(pending.length);

        const presentRows = filteredAtt.filter((r) => r.punchIn);
        const onTimeRows = presentRows.filter((r) => r.onTime === true);
        const pct =
          presentRows.length === 0
            ? 0
            : Math.round((onTimeRows.length / presentRows.length) * 100);

        setOnTimePct({ value: `${pct}%`, change: "" });
        setPresentXY({ x: presentRows.length, y: filteredAtt.length });

        const leavesRes = await getLeavesForAdminAPI({ date: todayISO });

        if (!leavesRes?.success) {
          toast.error(leavesRes?.message || "Failed to fetch leaves");
          return;
        }

        const leavesAll = leavesRes?.data?.leaves || leavesRes?.leaves || [];
        const filteredLeaves = leavesAll.filter(
          (l) => l.userId?._id !== user._id && l.userId?.role !== "admin"
        );

        setTodayLeaves(filteredLeaves);

        const userIds = filteredAtt.map((u) => u.userId);
        const uniqueUserIds = [...new Set(userIds.map(String))];

        const monthTotals = await Promise.all(
          uniqueUserIds.map(async (uid) => {
            try {
              const r = await getMonthlyWorkingHoursAPI(
                uid,
                currMonth,
                currYear
              );

              if (!r?.success) {
                toast.error(
                  r?.message || `Failed to fetch working hours for user ${uid}`
                );
                return { uid, secMonth: 0 };
              }

              const sec = r?.data?.totalWorkingSeconds ?? 0;
              return { uid, secMonth: sec };
            } catch (err) {
              toast.error(`Error fetching working hours for user ${uid}`);
              return { uid, secMonth: 0 };
            }
          })
        );

        const todaySecondsByUser = new Map();
        filteredAtt.forEach((row) => {
          const sec = Number(row.totalHours || 0);
          todaySecondsByUser.set(String(row.userId), sec);
        });

        let sumAll = 0;
        monthTotals.forEach(({ uid, secMonth }) => {
          const todaySec = todaySecondsByUser.get(String(uid)) || 0;
          const tillYesterday = Math.max(0, secMonth - todaySec);
          sumAll += tillYesterday;
        });

        setTotalWH(fmtDuration(sumAll));
      } catch (err) {
        console.error(err);
        toast.error("Unexpected error occurred while loading dashboard");
      }
    };

    run().catch((e) => console.error(e));
  }, [isAdmin, user?._id]);

  const attendanceColumns = useMemo(
    () => [
      { label: "Name", accessor: "name" },
      {
        label: "Time In",
        accessor: "punchIn",
        render: (value, row) => (
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${row.onTime === null
                ? "bg-gray-400"
                : row.onTime
                  ? "bg-green-500"
                  : "bg-orange-500"
                }`}
            ></span>
            {fmtClock(value)}
          </div>
        ),
      },
      { label: "Time Out", accessor: "punchOut", render: (v) => fmtClock(v) },
      {
        label: "Working Hours",
        accessor: "totalHours",
        render: (v) => fmtDuration(v),
      },
      {
        label: "Status",
        accessor: "status",
      },
    ],
    []
  );

  const leavesColumns = useMemo(
    () => [
      {
        label: "Employee",
        accessor: "userId.name",
        render: (_, row) => (
          <span className="font-medium">{row?.userId?.name ?? "-"}</span>
        ),
      },
      {
        label: "Dates",
        accessor: "leaveDays",
        render: (value) => (
          <div className="text-sm leading-5">{rangeFromLeaveDays(value)}</div>
        ),
      },
      {
        label: "Reason",
        accessor: "reason",
        render: (value) => (
          <span className="text-sm text-gray-700">{value ?? "-"}</span>
        ),
      },
      {
        label: "Status",
        accessor: "status",
        render: (value) => {
          if (value === "approved")
            return chip("Approved", "bg-green-100 text-green-700");
          if (value === "pending")
            return chip("Pending", "bg-amber-100 text-amber-700");
          if (value === "rejected")
            return chip("Rejected", "bg-rose-100 text-rose-700");
          if (value === "cancelled")
            return chip("Cancelled", "bg-gray-100 text-gray-600");
          return "-";
        },
      },
    ],
    []
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-700">
          Not authorized. Admins only.
        </h2>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F3F8FB] space-y-8">
      {/* ── Birthdays ─────────────────────────────────────── */}
      {birthdays.length > 0 && (
        <div>
          <SectionHeading
            title="Birthdays today"
            subtitle="Take a moment to wish them well"
            count={birthdays.length}
            countTone="amber"
          />

          <Carousel itemCount={birthdays.length}>
            {birthdays.map((person) => (
              <BirthdayCard key={person._id} person={person} />
            ))}
          </Carousel>
        </div>
      )}

      {/* ── Announcements ─────────────────────────────────── */}
      {notifications.length > 0 && (
        <div>
          <SectionHeading
            title="Announcements"
            subtitle="Latest company announcements and important updates"
            count={notifications.length}
          />

          <Carousel itemCount={notifications.length}>
            {notifications.map((n) => (
              <NotificationBanner key={n._id} notification={n} />
            ))}
          </Carousel>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Admin Insights
        </h2>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="On Time Percentage"
            subtitle="Today"
            value={onTimePct.value}
            comparison=""
            icon={
              <div className="w-24 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8CD99F"
                      fill="#C8F2CE"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            }
          />

          <DashboardCard
            title="Users Present"
            subtitle="Today"
            value={`${presentXY.x} / ${presentXY.y}`}
            comparison=""
            icon={
              <div className="w-24 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#72C0F6"
                      fill="#AAD9F9"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            }
          />
          <div
            onClick={() => navigate("/leave")}
            className="cursor-pointer hover:scale-[1.02] transition-all duration-200"
          >
            <DashboardCard
              title="Pending Leave Requests"
              subtitle="All time"
              value={pendingLeavesCount}
              comparison=""
              icon={
                <div className="w-24 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#F59E0B"
                        fill="#FDE68A"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              }
            />
          </div>
        </div>

        {/* Below insights: Leaves + Today's Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Leaves Card */}
          <div className="bg-white rounded-xl shadow border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">Today’s Leaves</h3>
              <button
                onClick={() => navigate("/leave")}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
              >
                View All
              </button>
            </div>
            <div className="p-4">
              <CustomTable
                columns={leavesColumns}
                data={todayLeaves}
                rowsPerPageOptions={[7, 10, 20]}
                defaultRowsPerPage={7}
              />
            </div>
          </div>

          {/* Today's Attendance Card */}
          <div className="bg-white rounded-xl shadow border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">Today’s Attendance</h3>
              <button
                onClick={() => navigate("/today-attendance")}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
              >
                View All
              </button>
            </div>

            <div className="p-4">
              <CustomTable
                columns={attendanceColumns}
                data={todayAttendance.map((r) => ({
                  // adapt to CustomTable's accessor expectations
                  name: r.name,
                  punchIn: r.punchIn ? new Date(r.punchIn) : null,
                  punchOut: r.punchOut ? new Date(r.punchOut) : null,
                  totalHours: r.totalHours || 0,
                  status:
                    r.status === "Half Day"
                      ? "Present (Half Day)"
                      : r.status === "Present"
                        ? "Present (Full Day)"
                        : r.status,
                  onTime: r.onTime, // boolean | null
                }))}
                rowsPerPageOptions={[7, 10, 20]}
                defaultRowsPerPage={7}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;