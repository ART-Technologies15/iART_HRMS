import React, { useEffect, useState } from "react";
import DashboardCard from "../components/DashboardCard";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import AttendanceCard from "../components/AttendanceCard";
import {
  getMonthlyWorkingHoursAPI,
  getPunctualityAPI,
} from "../api/attendaceApi";
import { useAuth } from "../context/AuthContext"; // assuming you have this

const data = [
  { name: "W1", value: 40 },
  { name: "W2", value: 60 },
  { name: "W3", value: 45 },
  { name: "W4", value: 70 },
  { name: "W5", value: 50 },

  { name: "W8", value: 75 },
];

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

  const formatSeconds = (sec = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}H ${m}M ${s}S`;
  };

  const calcChange = (current, prev) => {
    if (prev === 0) return "0%"; // your choice
    const diff = ((current - prev) / prev) * 100;
    return (diff >= 0 ? "+" : "") + diff.toFixed(2) + "%";
  };

  const [refresh, setRefresh] = useState(false);

  const refreshDashboard = () => setRefresh((prev) => !prev);

  const fetchData = async () => {
    if (!userId) return;

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

    try {
      // ---- 1️⃣ Punctuality ----
      const punctualityRes = await getPunctualityAPI(
        userId,
        currMonth,
        currYear
      );
      const p = punctualityRes.data;

      setOnTime({
        value: p.onTime.percentage,
        change: p.onTime.change,
      });
      setLate({
        value: p.late.percentage,
        change: p.late.change,
      });

      // ---- 2️⃣ Working hours ----
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

      setWorkingHours({
        value: formatSeconds(currSec),
        change: calcChange(currSec, prevSec),
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, refresh]);

  return (
    <div className="p-6 bg-[#F3F8FB]">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Insights</h2>

      {/* Insights Row */}
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
                <AreaChart data={data}>
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
                <AreaChart data={data}>
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

      {/* Attendance Row */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-6 mt-6">
          Attendance
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-14 gap-5 items-stretch">
          <div className="lg:col-span-14 flex justify-center">
            <div className="w-full max-w-4xl h-full">
              <AttendanceCard onPunchOut={refreshDashboard} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
