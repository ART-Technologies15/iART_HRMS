import React, { useEffect, useRef, useState } from "react";
import DashboardCard from "../components/DashboardCard";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import AttendanceCard from "../components/AttendanceCard";
import {
  getMonthlyWorkingHoursAPI,
  getPunctualityAPI,
} from "../api/attendaceApi";
import { getActiveNotifications } from "../api/notificationApi";
import { useAuth } from "../context/AuthContext";
import { Bell, Cake, ChevronLeft, ChevronRight } from "lucide-react";


const data = [
  { name: "W1", value: 40 },
  { name: "W2", value: 60 },
  { name: "W3", value: 45 },
  { name: "W4", value: 70 },
  { name: "W5", value: 50 },
  { name: "W8", value: 75 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

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
    // Very bright color (red, yellow, orange) — use a very dark shade of that color
    return `rgba(${Math.floor(r * 0.25)}, ${Math.floor(g * 0.25)}, ${Math.floor(b * 0.25)}, 1)`;
  }
  // Dark enough color — use it directly
  return hex;
};

const getBodyTextColor = (hex = "#3B82F6") => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.6) {
    // Bright backgrounds — use a solid dark gray so body is always readable
    return "#374151";
  }
  // Darker accent — slightly muted version of accent
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
};

// ── Birthday avatar (initials fallback) ─────────────────────────────────────

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// Deterministic accent per person so the same avatar color shows every visit,
// rather than random colors flickering between renders.
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

// ── Notification Banner ────────────────────────────────────────────────────

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
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl flex-shrink-0"
        style={{ background: accent }}
      />

      {/* Icon */}
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: hexToRgba(accent, 0.2) }}
      >
        <Bell size={14} style={{ color: accent }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">

        {/* Title — full wrap, no truncate */}
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: titleColor }}
        >
          {notification.title}
        </p>

        {/* Body — expand/collapse */}
        <p
          className={`mt-1 text-xs leading-relaxed transition-all ${isExpanded ? "" : "line-clamp-2"
            }`}
          style={{ color: bodyColor }}
        >
          {notification.body}
        </p>

        {/* Show more / less toggle */}
        {notification.body?.length > 100 && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="mt-1 text-[11px] font-semibold underline underline-offset-2 cursor-pointer bg-transparent border-none p-0"
            style={{ color: titleColor }}
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Date range */}
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

// ── Carousel (horizontal scroll-snap with arrow controls) ───────────────────

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

    // Ensure last dot activates when fully scrolled
    if (el.scrollLeft >= maxScroll - 2) {
      active = children.length - 1;
    }

    setActiveIndex(active);
  };

  useEffect(() => {
    updateArrowState();
    const el = trackRef.current;
    if (!el) return;

    // Re-check on resize, since "does this overflow" depends on viewport width.
    const resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [itemCount]);

  const scrollByPage = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by ~90% of the visible width so the next card peeks in,
    // signalling there's more rather than jumping a full screen at once.
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

// ── Section heading (shared rhythm across the page) ─────────────────────────

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

// ── Dashboard ──────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const userId = user?._id;

  const [onTime, setOnTime] = useState({ value: "0%", change: "0%" });
  const [late, setLate] = useState({ value: "0%", change: "0%" });
  const [workingHours, setWorkingHours] = useState({
    value: "00H 00M 00S",
    change: "0%",
  });

  const [monthName, setMonthName] = useState("");
  const [prevMonthName, setPrevMonthName] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  const refreshDashboard = () => setRefresh((prev) => !prev);

  const formatSeconds = (sec = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}H ${m}M ${s}S`;
  };

  const calcChange = (current, prev) => {
    if (prev === 0) return "0%";
    const diff = ((current - prev) / prev) * 100;
    return (diff >= 0 ? "+" : "") + diff.toFixed(2) + "%";
  };

  // ── Fetch notifications (+ birthdays, same endpoint) ─────────────────────
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
  };

  // ── Fetch dashboard data ─────────────────────────────────────────────────
  const fetchData = async () => {
    if (!userId) return;

    const now = new Date();
    const currMonth = now.getMonth() + 1;
    const currYear = now.getFullYear();
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    const prevYear = currMonth === 1 ? currYear - 1 : currYear;

    setMonthName(
      new Date(currYear, currMonth - 1).toLocaleString("default", { month: "long" })
    );
    setPrevMonthName(
      new Date(prevYear, prevMonth - 1).toLocaleString("default", { month: "long" })
    );

    try {
      const punctualityRes = await getPunctualityAPI(userId, currMonth, currYear);
      const p = punctualityRes.data;
      setOnTime({ value: p.onTime.percentage, change: p.onTime.change });
      setLate({ value: p.late.percentage, change: p.late.change });

      const currRes = await getMonthlyWorkingHoursAPI(userId, currMonth, currYear);
      const prevRes = await getMonthlyWorkingHoursAPI(userId, prevMonth, prevYear);
      const currSec = currRes.data.totalWorkingSeconds || 0;
      const prevSec = prevRes.data.totalWorkingSeconds || 0;
      setWorkingHours({
        value: formatSeconds(currSec),
        change: calcChange(currSec, prevSec),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hasCompletedKYC = () => {
    return (
      user?.pan &&
      user?.panFile &&
      user?.aadhaar &&
      user?.aadhaarFile &&
      user?.bankDetails?.bankName &&
      user?.bankDetails?.accountNumber &&
      user?.bankDetails?.ifsc &&
      user?.bankDetails?.passbookFile
    );
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, refresh]);

  return (
    <div className="p-4 sm:p-6 bg-[#F3F8FB] min-h-screen space-y-8">

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

      {/* ── Notifications ─────────────────────────────────── */}
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

      {/* ── Insights ──────────────────────────────────────── */}
      <div>
        <SectionHeading title="Insights" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="On Time Percentage"
            subtitle={monthName}
            value={onTime.value}
            comparison={`${onTime.change} Compared to ${prevMonthName}`}
            icon={
              <div className="w-24 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <Area type="monotone" dataKey="value" stroke="#8CD99F" fill="#C8F2CE" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            }
          />

          <DashboardCard
            title="Late Percentage"
            subtitle={monthName}
            value={late.value}
            comparison={`${late.change} Compared to ${prevMonthName}`}
            icon={
              <div className="w-24 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <Area type="monotone" dataKey="value" stroke="#F6A8A1" fill="#FCDCDC" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            }
          />

          <DashboardCard
            title="Total Working Hours"
            subtitle={monthName}
            value={workingHours.value}
            comparison={`${workingHours.change} Compared to ${prevMonthName}`}
            icon={
              <div className="w-24 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <Area type="monotone" dataKey="value" stroke="#72C0F6" fill="#AAD9F9" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            }
          />
        </div>
      </div>

      {/* ── Attendance ────────────────────────────────────── */}
      <div>
        <SectionHeading title="Attendance" />
        <div className="grid grid-cols-1 lg:grid-cols-14 gap-5 items-stretch">
          <div className="lg:col-span-14 flex justify-center">
            <div className="w-full max-w-4xl h-full">
              <AttendanceCard
                onPunchOut={refreshDashboard}
                hasCompletedKYC={hasCompletedKYC}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;