import React, { useState, useEffect } from "react";
import { Search, Calendar, Download } from "lucide-react";
import CustomTable from "../components/CustomTable";
import { getUserAttendance } from "../api/attendaceApi";
import { useAuth } from "../context/AuthContext";
import RegularizationModal from "../components/RegularizationModal";

const AttendanceReport = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const { user } = useAuth();
  const userId = user?._id;

  // ── Regularization modal state ──
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleRegularization = (row) => {
    setSelectedRow(row);
    setRegModalOpen(true);
  };

  const closeRegModal = () => {
    setRegModalOpen(false);
    setSelectedRow(null);
  };

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  const isRegularizationWindowOpen = currentDay >= 26 && currentDay <= 29;

  const nextWindowText =
    "Regularization requests are available from the 26th to the 29th of every month, and only for attendance within the current month.";

  // row.date comes as "YYYY-MM-DD" from the list API
  const isRowInCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const canRegularizeRow = (row) =>
    isRegularizationWindowOpen && isRowInCurrentMonth(row.date);

  const statusBadgeCls = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  const columns = [
    { label: "Date", accessor: "date" },
    {
      label: "Time In",
      accessor: "timeIn",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${row.onTime ? "bg-green-500" : "bg-orange-500"
              }`}
          ></span>
          {value}
        </div>
      ),
    },
    { label: "Time Out", accessor: "timeOut" },
    { label: "Working Hours", accessor: "workingHours" },
    { label: "Status", accessor: "status" },
    {
      label: "Action",
      accessor: "action",
      render: (_, row) => {
        const regStatus = row.regularization?.status; // "Pending" | "Approved" | "Rejected" | undefined

        // Already decided — show a read-only badge, no button at all.
        if (row.hasRegularization && (regStatus === "Approved" || regStatus === "Rejected")) {
          return (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadgeCls[regStatus]}`}
            >
              {regStatus}
            </span>
          );
        }

        const isAllowed = canRegularizeRow(row);
        const outOfMonth = isRegularizationWindowOpen && !isRowInCurrentMonth(row.date);

        return (
          <button
            onClick={() => {
              if (isAllowed) {
                handleRegularization(row);
              }
            }}
            disabled={!isAllowed}
            className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition
            ${!isAllowed
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : row.hasRegularization
                  ? "bg-amber-500 hover:bg-amber-600 cursor-pointer"
                  : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
              }`}
            title={
              !isRegularizationWindowOpen
                ? "Regularization requests can only be submitted from the 26th to the 29th of each month."
                : outOfMonth
                  ? "Only attendance within the current month can be regularized."
                  : ""
            }
          >
            {row.hasRegularization ? "Edit Regularization" : "Add Regularization"}
          </button>
        );
      },
    },
  ];

  const formatSeconds = (sec = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}H ${m}M ${s}S`;
  };

  const fetchAttendance = async () => {
    if (!userId) return;

    try {
      const res = await getUserAttendance(userId, fromDate, toDate);
      // res is already an array, not res.attendance
      const formatted = res.map((item) => ({
        attendanceId: item.attendanceId,
        recordId: item.recordId,
        date: item.date,
        timeIn: item.punchIn
          ? new Date(item.punchIn).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "-",
        timeOut: item.punchOut
          ? new Date(item.punchOut).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "-",
        workingHours: item.totalHours ? formatSeconds(item.totalHours) : "0s",
        status: item.status,
        onTime: item.onTime,
        hasRegularization: item.hasRegularization,
        regularization: item.regularization || null,
      }));

      setAttendanceData(formatted);
    } catch (err) {
      console.error(err);
      setAttendanceData([]); // Reset UI if error
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [fromDate, toDate, userId]);

  const footerLegend = [
    { label: "On Time", color: "bg-green-500" },
    { label: "Late", color: "bg-orange-500" },
  ];

  const filteredData = attendanceData.filter(
    (item) =>
      item.date.toLowerCase().includes(search.toLowerCase()) ||
      item.timeIn.toLowerCase().includes(search.toLowerCase()) ||
      item.timeOut.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen">
      {/* ===== Page Title ===== */}
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
        Attendance Report
      </h1>

      {/* ===== Search + Filters Row ===== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search
            size={18}
            className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
          />
        </div>

        {/* Filters */}
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

          {/* Export Button */}
          {/* <button className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition w-full sm:w-auto">
            <Download size={16} />
            Export
          </button> */}
        </div>
      </div>

      {/* {!isRegularizationWindowOpen && ( */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Regularization Window Closed
          </p>
          <p className="text-sm text-amber-700 mt-1">
            {nextWindowText}
          </p>
        </div>
      </div>
      {/* )} */}

      {/* ===== Table Section ===== */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100 overflow-x-auto">
        <div className="min-w-[600px]">
          <CustomTable
            columns={columns}
            data={filteredData}
            defaultRowsPerPage={10}
            footerLegend={footerLegend}
          />
        </div>
      </div>

      <RegularizationModal
        open={regModalOpen}
        mode={selectedRow?.hasRegularization ? "edit" : "create"}
        attendanceRow={selectedRow}
        regularization={selectedRow?.regularization || null}
        onClose={closeRegModal}
        onSuccess={fetchAttendance}
      />
    </div>
  );
};

export default AttendanceReport;
