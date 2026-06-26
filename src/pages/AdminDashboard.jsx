import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardCard from "../components/DashboardCard";
import CustomTable from "../components/CustomTable";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

import { getMonthlyWorkingHoursAPI } from "../api/attendaceApi";
import { getLeavesForAdmin as getLeavesForAdminAPI } from "../api/leaveApi";

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
      ? `${fmtDateDDMMM(first.date)} (${
          first.type === "half" ? "Half" : "Full"
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
              className={`w-3 h-3 rounded-full ${
                row.onTime === null
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
    <div className="p-6 bg-[#F3F8FB]">
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
                    stroke="#F59E0B" // amber
                    fill="#FDE68A"
                  />
                </AreaChart>
                
              </ResponsiveContainer>
            </div>
          }
        />
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
  );
};

export default AdminDashboard;
