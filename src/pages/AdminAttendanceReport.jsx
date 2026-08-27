import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Search, Calendar, Pencil } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import CustomTable from "../components/CustomTable";
import DashboardCard from "../components/DashboardCard";
import AttendanceActionsMenu from "../components/AttendanceActionsMenu";
import EditAttendanceModal from "../components/EditAttendanceModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  getUserAttendance,
  getPunctualityAPI,
  getMonthlyWorkingHoursAPI,
  //   deleteAttendanceAPI,
  updateAttendanceAPI,
} from "../api/attendaceApi";
import { toast } from "react-toastify";

const spark = [
  { name: "W1", value: 40 },
  { name: "W2", value: 60 },
  { name: "W3", value: 45 },
  { name: "W4", value: 70 },
  { name: "W5", value: 50 },
  { name: "W6", value: 75 },
];

export const formatSeconds = async (sec = 0) => {
  return new Promise((resolve) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    resolve(`${h}H ${m}M ${s}S`);
  });
};

const AdminAttendanceReport = () => {
  const { userId: userIdFromParams } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  // const [fromDate, setFromDate] = useState("");
  // const [toDate, setToDate] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    return from.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [rows, setRows] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const [onTime, setOnTime] = useState({ value: "0%", change: "0%" });
  const [late, setLate] = useState({ value: "0%", change: "0%" });
  const [workingHours, setWorkingHours] = useState({
    value: "00H 00M 00S",
    change: "0%",
  });
  const [monthName, setMonthName] = useState("");
  const [prevMonthName, setPrevMonthName] = useState("");

  // ---------- derive month labels
  useEffect(() => {
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
  }, []);

  const userFromState = location.state?.user;
  const userId = userFromState?._id || userIdFromParams;

  // ---------- fetch 3 card data
  const fetchCards = useCallback(async () => {
    if (!userId) return;
    const now = new Date();
    const currMonth = now.getMonth() + 1;
    const currYear = now.getFullYear();
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    const prevYear = currMonth === 1 ? currYear - 1 : currYear;

    try {
      const p = (await getPunctualityAPI(userId, currMonth, currYear)).data;
      setOnTime({ value: p.onTime.percentage, change: p.onTime.change });
      setLate({ value: p.late.percentage, change: p.late.change });

      const currRes = await getMonthlyWorkingHoursAPI(
        userId,
        currMonth,
        currYear
      );
      const prevRes = await getMonthlyWorkingHoursAPI(
        userId,
        prevMonth,
        prevYear
      );
      const currSec = currRes.data.totalWorkingSeconds || 0;
      const prevSec = prevRes.data.totalWorkingSeconds || 0;

      let change = 0;
      if (prevSec !== 0) {
        change = ((currSec - prevSec) / prevSec) * 100;
      }

      setWorkingHours({
        value: formatSeconds(currSec),
        change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      });

      console.log("workingHours2", workingHours);
    } catch (e) {
      // keep defaults
    }
  }, [userId]);

  // ---------- fetch table data
  const fetchAttendance = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getUserAttendance(userId, fromDate, toDate); // array

      const formatted = await Promise.all(
        res.map(async (a) => ({
          _id: a._id,
          raw: a,
          date: new Date(a.date).toLocaleDateString("en-GB"),
          timeIn: a.punchIn
            ? new Date(a.punchIn).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "-",
          timeOut: a.punchOut
            ? new Date(a.punchOut).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "-",
          workingHours: a.totalHours ? await formatSeconds(a.totalHours) : "0S",
          status: a.status,
          onTime: a.onTime,
        }))
      );

      setRows(formatted);
    } catch (err) {
      console.error(err);
      setRows([]);
    }
  }, [userId, fromDate, toDate]);

  useEffect(() => {
    if (!userId) return;
    fetchCards();
    fetchAttendance();
  }, [userId, fetchCards, fetchAttendance]);

  // ---------- columns
  const columns = useMemo(
    () => [
      { label: "Date", accessor: "date" },
      {
        label: "Time In",
        accessor: "timeIn",
        render: (value, row) => (
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${row.onTime ? "bg-green-500" : "bg-orange-500"
                }`}
            />
            {value}
          </div>
        ),
      },
      { label: "Time Out", accessor: "timeOut" },
      { label: "Working Hours", accessor: "workingHours" },
      { label: "Status", accessor: "status" },
      {
        label: "Actions",
        accessor: "actions",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => setEditRow(row)}
            title="Edit Leave"
            aria-label="Edit Leave"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil size={15} />
          </button>
        ),
      },
    ],
    []
  );
  const shiftRange = (days) => {
    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);

    newFrom.setDate(newFrom.getDate() + days);
    newTo.setDate(newTo.getDate() + days);

    setFromDate(newFrom.toISOString().slice(0, 10));
    setToDate(newTo.toISOString().slice(0, 10));
  };

  const isNextDisabled = toDate === new Date().toISOString().slice(0, 10);

  // Initialize 7-day default on mount
  // useEffect(() => {
  //   if (!fromDate && !toDate) {
  //     const today = new Date();
  //     const to = today.toISOString().slice(0, 10);

  //     const from = new Date();
  //     from.setDate(from.getDate() - 6);
  //     const fromFormatted = from.toISOString().slice(0, 10);

  //     setFromDate(fromFormatted);
  //     setToDate(to);
  //   }
  // }, []);

  // ---------- filter client-side search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.date, r.timeIn, r.timeOut, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  // ---------- actions
  //   const handleDelete = async () => {
  //     if (!deleteRow) return;
  //     try {
  //       await deleteAttendanceAPI(deleteRow._id);
  //       toast.success("Attendance deleted");
  //       setDeleteRow(null);
  //       fetchCards();
  //       fetchAttendance();
  //     } catch (e) {
  //       toast.error(e?.response?.data?.message || "Delete failed");
  //     }
  //   };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      console.log("deleted");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const handleEditSubmit = async (payload) => {
    try {
      await updateAttendanceAPI({
        userId: userId,
        date: editRow.raw.date,
        punchIn: payload.punchIn,
        punchOut: payload.punchOut,
      });
      toast.success("Attendance updated successfully");
      setEditRow(null);
      fetchCards(); // refresh cards
      fetchAttendance(); // refresh table
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  if (!userId) {
    return (
      <div className="p-6">
        <p className="text-gray-700">
          No user selected. Go to{" "}
          <span
            onClick={() => navigate("/users")}
            className="text-blue-600 underline cursor-pointer"
          >
            Users
          </span>{" "}
          and click “View Attendance”.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F3F8FB] min-h-screen">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
        Attendance — {userFromState?.name || "User"}
      </h1>

      {/* ===== Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="On Time Percentage"
          subtitle={monthName}
          value={onTime.value}
          comparison={`${onTime.change} Compared to ${prevMonthName}`}
          icon={
            <div className="w-24 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
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
          title="Late Percentage"
          subtitle={monthName}
          value={late.value}
          comparison={`${late.change} Compared to ${prevMonthName}`}
          icon={
            <div className="w-24 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#F6A8A1"
                    fill="#FCDCDC"
                  />
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
                <AreaChart data={spark}>
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
      </div>

      {/* ===== Search + Filters ===== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search date/time/status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search
            size={18}
            className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
              Show Entries:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">From:</span>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-2 top-2.5 text-gray-400"
                />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <span className="text-sm text-gray-600">To:</span>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-2 top-2.5 text-gray-400"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* <button className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition w-full sm:w-auto">
            <Download size={16} />
            Export
          </button> */}
        </div>
      </div>
      {/* ===== Date Range Navigation ===== */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm"
            onClick={() => shiftRange(-7)}
          >
            ⬅ Prev 7 Days
          </button>

          <button
            className={`px-3 py-1.5 rounded-md border text-sm ${isNextDisabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-gray-100"
              }`}
            onClick={() => shiftRange(7)}
            disabled={isNextDisabled}
          >
            Next 7 Days ➡
          </button>
        </div>

        <div className="text-sm font-medium text-gray-600">
          Showing:{" "}
          <span className="text-gray-800">
            {new Date(fromDate).toLocaleDateString("en-GB")} —{" "}
            {new Date(toDate).toLocaleDateString("en-GB")}
          </span>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100 overflow-x-auto">
        <div className="min-w-[700px]">
          <CustomTable
            columns={columns}
            data={filtered}
            defaultRowsPerPage={10}
            footerLegend={[
              { label: "On Time", color: "bg-green-500" },
              { label: "Late", color: "bg-orange-500" },
            ]}
          />
        </div>
      </div>

      {/* ===== Modals ===== */}
      <EditAttendanceModal
        open={!!editRow}
        attendance={editRow?.raw}
        onClose={() => setEditRow(null)}
        onSubmit={handleEditSubmit}
      />
      <ConfirmDeleteModal
        open={!!deleteRow}
        title="Delete Attendance Record"
        message={`This action cannot be undone. Delete attendance of ${deleteRow?.date}?`}
        confirmText="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AdminAttendanceReport;
