import React, { useEffect, useState } from "react";
import Calendar from "../components/CalendarComponent";
import CalendarModal from "../components/CalendarModal";
import GenerateWeekendsModal from "../components/GenerateWeekendsModal";
import { getCalendar } from "../api/calendarApi";
import { useAuth } from "../context/AuthContext";
import UpcomingHolidaysCard from "../components/upcomingHolidaysCard";


const YearCalendar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [calendarData, setCalendarData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showWeekendModal, setShowWeekendModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCalendarData = async () => {
    setLoading(true);
    const res = await getCalendar({ year });
    if (res?.success) setCalendarData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCalendarData();
  }, [year]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[#344B7A]">
          Company Calendar
        </h2>

        <div className="flex gap-3">
          {/* Year Selector */}
          <select
            className="border rounded-lg px-4 py-2 text-[#344B7A]"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 7 }, (_, i) => currentYear - 1 + i).map(
              (yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              )
            )}
          </select>

          {/* Admin Only Generate Weekends Button */}
          {/* {isAdmin && (
            <button
              onClick={() => setShowWeekendModal(true)}
              className="px-4 py-2 bg-[#4A6CF7] text-white rounded-lg hover:bg-[#395bdc]"
            >
              Generate Weekends
            </button>
          )} */}
        </div>
      </div>

      {loading && (
        <p className="text-center text-[#7D8FB3]">Loading calendar...</p>
      )}

      {/* 12 Month Grid */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* LEFT SIDE — 3x4 calendar grid */}
        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {months.map((month) => {
              const entry = calendarData.find((c) => c.month === month);
              const nonWorking = entry ? entry.nonWorkingDays : [];

              return (
                <Calendar
                  key={month}
                  month={month}
                  year={year}
                  nonWorkingDays={nonWorking}
                  onDayClick={(date) =>
                    isAdmin && setSelectedDate({ year, month, date })
                  }
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE — sidebar card */}
        <div className="xl:col-span-1">
          <UpcomingHolidaysCard calendarData={calendarData} />
        </div>
      </div>

      {/* Date Edit Modal */}
      {selectedDate && (
        <CalendarModal
          dateInfo={selectedDate}
          onClose={(updated) => {
            setSelectedDate(null);
            if (updated) fetchCalendarData();
          }}
          calendarData={calendarData}
        />
      )}

      {/* Generate Weekends Modal */}
      {showWeekendModal && (
        <GenerateWeekendsModal
          year={year}
          onClose={() => setShowWeekendModal(false)}
          onSuccess={fetchCalendarData}
        />
      )}
    </div>
  );
};

export default YearCalendar;
