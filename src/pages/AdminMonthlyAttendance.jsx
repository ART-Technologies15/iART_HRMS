import React, { useState, useEffect } from "react";
import { Menu, UserLock } from "lucide-react";
import { getAdminMonthlyAttendance } from "../api/attendaceApi";
import { useAuth } from "../context/AuthContext";

const AdminMonthlyAttendance = () => {
  const today = new Date();
  const { user } = useAuth();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [role, setRole] = useState("employee/hr");
  const [rows, setRows] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /* --------------------------------------------
     FETCH MONTHLY ATTENDANCE
  --------------------------------------------- */
  const fetchMonthlyData = async () => {
    try {
      setLoading(true);

      const res = await getAdminMonthlyAttendance(month, year, role);

      const days = res?.data || [];

      const allUsers = new Map();

      days.forEach((d) => {
        (d.users || []).forEach((u) => {
          allUsers.set(u.userId, { name: u.name, role: u.role, lop: u.lop, leaveBalance: u.leaveBalance });
        });
      });
      const userColumns = Array.from(allUsers.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        role: data.role,
        lop: data.lop,
        leaveBalance: data.leaveBalance
      }));

      setUsersList(userColumns);

      /* ----- MATRIX ROWS ----- */
      const matrixRows = days.map((day) => {
        const row = {
          date: day.date,
        };

        // Check if this date is in the future
        const rowDate = new Date(day.date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const isFutureDate = rowDate > todayDate;

        userColumns.forEach((u) => {
          const record = day.users?.find((x) => x.userId === u.id);

          // Show "--" for future dates
          if (isFutureDate) {
            row[u.id] = { status: '--', onTime: null, punchIn: null };
          } else if (!record) {
            row[u.id] = { status: 'Absent', onTime: null, punchIn: null };
          }
          else if (day.isHoliday && record.status === 'Holiday') {
            row[u.id] = { status: 'Holiday', onTime: null, punchIn: null };
          } else if (record.status) {
            row[u.id] = {
              status: record.status,
              onTime: record.onTime,
              punchIn: record.punchIn
            };
          } else if (record.leaveStatus === 'On Leave') {
            row[u.id] = { status: 'On Leave', onTime: null, punchIn: null };
          } else {
            row[u.id] = { status: 'Absent', onTime: null, punchIn: null };
          }
        });

        return row;
      });

      setRows(matrixRows);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [month, year, role]);

  /* --------------------------------------------
     CALCULATE STATISTICS
  --------------------------------------------- */
  const calculateUserStats = (userId) => {
    let workingDays = 0;
    let presentFullDays = 0;
    let presentHalfDays = 0;
    let absentDays = 0;

    rows.forEach((row) => {
      const cellData = row[userId];
      const status = cellData?.status || 'Absent';

      if (status === '--' || status === 'Holiday' || status === 'On Leave' || status === 'Not Joined') {
        return;
      }

      workingDays++;

      if (status === 'Present') {
        presentFullDays++;
      } else if (status === 'Half Day') {
        presentHalfDays++;
      } else if (status === 'Absent') {
        absentDays++;
      }
    });

    return {
      workingDays,
      presentFullDays,
      presentHalfDays,
      absentDays,
    };
  };

  /* --------------------------------------------
     STATUS STYLES
  --------------------------------------------- */
  const getStatusStyle = (status) => {
    const styles = {
      'Present': {
        backgroundColor: '#e6f7e6',
        color: '#1a8a1a',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      'Half Day': {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      'Absent': {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      'Holiday': {
        backgroundColor: '#fff3e669',
        color: '#d35400',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      'On Leave': {
        backgroundColor: '#e6f3ff',
        color: '#0066cc',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      'Not Joined': {
        backgroundColor: '#f3f4f6',
        color: '#9ca3af',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      },
      '--': {
        color: '#9ca3af',
        padding: '4px 8px',
        textAlign: 'center',
        fontWeight: 500,
        display: 'inline-block',
        minWidth: '90px'
      }
    };

    return styles[status] || styles['Absent'];
  };

  return (
    /*
      FIX (page-level): the outer wrapper is now a flex column pinned to
      the viewport height (h-screen) instead of growing tall and relying
      on the page to scroll. The header/filters take their natural
      height (shrink-0); the table card fills the rest (flex-1, min-h-0).
      This is what lets the table size itself "to the screen" and is
      also what stops the page itself from having a scrollbar — only
      the table scrolls now.
    */
    <div className="h-full flex flex-col p-2 gap-4 bg-[#F3F8FB] max-w-full overflow-hidden">
      {/* -------------------------------- Header + Filters ------------------------------- */}
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Monthly Attendance
        </h1>

        <div className="hidden lg:flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="employee/hr">Employee/HR</option>
            <option value="intern">Intern</option>
            <option value="trainee">Trainee</option>
          </select>
        </div>

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="lg:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-50"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* -------------------------------- Mobile Filters ------------------------------- */}
      {mobileMenuOpen && (
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-gray-200 shrink-0">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {[2024, 2025, 2026].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="employee/hr">Employee/HR</option>
            <option value="intern">Intern</option>
            <option value="trainee">Trainee</option>
          </select>
        </div>
      )}

      {/* -------------------------------- Loader ------------------------------- */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
        </div>
      )}


      {/* -------------------------------- Table ------------------------------- */}
      {/*
        FIX (table-level):
        - `flex-1 min-h-0` lets this card fill whatever space is left
          under the header/filters, on any screen size — no hardcoded
          700px, no relying on the page to scroll.
        - The scroll container below uses `h-full` (fills that card)
          instead of a fixed maxHeight, so it's always sized to the
          actual available screen space.
        - Removed `scrollbar-hide` / `scrollbarWidth: none` — that was
          why the scrollbar wasn't visible before. Now it's a normal
          visible native scrollbar (both directions), giving a clear
          affordance that the table itself is what scrolls.
      */}
      {!loading && usersList.length > 0 && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="bg-slate-50 border-b border-slate-200">
  <tr>
    <th
      className="py-2.5 px-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky top-0 left-0 bg-slate-50 z-40"
      style={{ minWidth: "120px" }}
    >
      Date
    </th>

    {usersList.map((user) => (
      <th
        key={user.id}
        className="py-2.5 px-3 text-center sticky top-0 bg-slate-50 z-20"
        style={{ minWidth: "130px" }}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          {/* User Name */}
          <span
            className="font-semibold text-slate-700 text-sm max-w-[120px] truncate"
            title={user.name}
          >
            {user.name}
          </span>

          {/* Role */}
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
            {user.role}
          </span>
        </div>
      </th>
    ))}
  </tr>
</thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td
                      className="py-2 px-2 text-slate-700 whitespace-nowrap sticky left-0 bg-white z-10"
                      style={{ minWidth: '100px' }}
                    >
                      {row.date}
                    </td>
                    {usersList.map((user) => {
                      const cellData = row[user.id] || { status: 'Absent', onTime: null, punchIn: null };
                      const status = cellData.status || 'Absent';
                      const onTime = cellData.onTime;

                      return (
                        <td
                          key={user.id}
                          className="py-2 px-2 text-slate-700 whitespace-nowrap text-center align-middle justify-center"
                          style={{ minWidth: '100px' }}
                        >
                          <div style={getStatusStyle(status)}>
                            {(status === 'Present' || status === 'Half Day') && onTime !== null && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: onTime ? '#22c55e' : '#f97316',
                                  marginRight: '6px',
                                }}
                                title={onTime ? 'On Time (before 10 AM)' : 'Late (after 10 AM)'}
                              />
                            )}
                            {status}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 sticky bottom-0 z-20">

                <tr className="border-b border-slate-200">
                  <td
                    className="py-2 px-2 text-left font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-30"
                    style={{ minWidth: '100px' }}
                  >
                    Present (Full) / Working Days
                  </td>
                  {usersList.map((user) => {
                    const stats = calculateUserStats(user.id);
                    return (
                      <td
                        key={user.id}
                        className="py-2 px-2 text-center font-semibold whitespace-nowrap bg-slate-50"
                        style={{ minWidth: '100px' }}
                      >
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs">
                          {stats.presentFullDays} / {stats.workingDays}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-slate-200">
                  <td
                    className="py-2 px-2 text-left font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-30"
                    style={{ minWidth: '100px' }}
                  >
                    Half Days
                  </td>
                  {usersList.map((user) => {
                    const stats = calculateUserStats(user.id);
                    return (
                      <td
                        key={user.id}
                        className="py-2 px-2 text-center font-semibold whitespace-nowrap bg-slate-50"
                        style={{ minWidth: '100px' }}
                      >
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs">
                          {stats.presentHalfDays}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td
                    className="py-2 px-2 text-left font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-30"
                    style={{ minWidth: '100px' }}
                  >
                    Absent
                  </td>
                  {usersList.map((user) => {
                    const stats = calculateUserStats(user.id);
                    return (
                      <td
                        key={user.id}
                        className="py-2 px-2 text-center font-semibold whitespace-nowrap bg-slate-50"
                        style={{ minWidth: '100px' }}
                      >
                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs">
                          {stats.absentDays}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td
                    className="py-2 px-2 text-left font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-30"
                    style={{ minWidth: '100px' }}
                  >
                    Leave Balance
                  </td>
                  {usersList.map((user) => {
                    return (
                      <td
                        key={user.id}
                        className="py-2 px-2 text-center font-semibold whitespace-nowrap bg-slate-50"
                        style={{ minWidth: '100px' }}
                      >
                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs">
                          {user.leaveBalance}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td
                    className="py-2 px-2 text-left font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-30"
                    style={{ minWidth: '100px' }}
                  >
                    LOP
                  </td>
                  {usersList.map((user) => {
                    return (
                      <td
                        key={user.id}
                        className="py-2 px-2 text-center font-semibold whitespace-nowrap bg-slate-50"
                        style={{ minWidth: '100px' }}
                      >
                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs">
                          {user.lop}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* FIX: Prevent blank screen before data loads */}
      {!loading && usersList.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No attendance data found.
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyAttendance;