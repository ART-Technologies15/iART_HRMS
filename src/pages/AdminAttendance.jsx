import React, { useState, useEffect } from "react";
import { Search, Calendar, Menu } from "lucide-react";
import CustomTable from "../components/CustomTable";
import { getAdminAttendanceByDate } from "../api/attendaceApi";
import { useAuth } from "../context/AuthContext";

const AdminAttendance = () => {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  /* ────────────────────── Columns ────────────────────── */
  const columns = [
    { label: "Name", accessor: "name" },
    {
      label: "Time In",
      accessor: "timeIn",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              row.onTime ? "bg-green-500" : "bg-orange-500"
            }`}
          />
          {value}
        </div>
      ),
    },
    { label: "Time Out", accessor: "timeOut" },
    { label: "Working Hours", accessor: "workingHours" },
    { label: "Status", accessor: "status" },
  ];

  const formatSeconds = (sec = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}H ${m}M ${s}S`;
  };

  /* ────────────────────── Data fetch ────────────────────── */
  const fetchAttendance = async () => {
    try {
      const res = await getAdminAttendanceByDate(selectedDate);
      const filteredRes = res.data.filter((item) => item.userId !== user._id);

      const formatted = filteredRes.map((item) => ({
        userId: item.userId,
        name: item.name,
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
      }));

      setAttendanceData(formatted);
      setUsers(
        filteredRes.map((u) => ({
          id: u.userId,
          name: u.name,
        }))
      );
    } catch (err) {
      console.error(err);
      setAttendanceData([]);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, user]);

  /* ────────────────────── Filtering ────────────────────── */
  const filteredData = attendanceData.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.timeIn.toLowerCase().includes(search.toLowerCase()) ||
      item.timeOut.toLowerCase().includes(search.toLowerCase()) ||
      item.status.toLowerCase().includes(search.toLowerCase());

    const matchUser = selectedUser === "all" || item.userId === selectedUser;
    return matchSearch && matchUser;
  });

  const footerLegend = [
    { label: "On Time", color: "bg-green-500" },
    { label: "Late", color: "bg-orange-500" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
        Attendance - Admin View
      </h1>

      {/* ─────── Controls ─────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Full-width Search + Mobile Toggle */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, time, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 pl-10 text-sm border-gray-300 focus:ring-2 focus:ring-blue-400"
            />
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-400"
            />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-2 top-2.5 text-gray-400"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Filters - Single Row */}
      {mobileMenuOpen && (
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-200">
          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-2 top-2.5 text-gray-400"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ─────── Table ─────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <CustomTable
          columns={columns}
          data={filteredData}
          defaultRowsPerPage={10}
          footerLegend={footerLegend}
        />
      </div>
    </div>
  );
};

export default AdminAttendance;
