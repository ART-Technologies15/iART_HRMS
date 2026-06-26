import React from "react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const Calendar = ({
  month,
  year,
  nonWorkingDays = [],
  onDayClick = () => {},
}) => {
  const monthIndex = month - 1;

  if (
    typeof month !== "number" ||
    typeof year !== "number" ||
    month < 1 ||
    month > 12 ||
    year < 1000 ||
    year > 9999
  ) {
    return <div className="text-red-500">Invalid month or year</div>;
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const isCurrentMonth =
    today.getMonth() === monthIndex && today.getFullYear() === year;

  const firstDay = new Date(year, monthIndex, 1);
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday start
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthLastDate = new Date(year, monthIndex, 0).getDate();

  const days = [];

  // Previous month trailing
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDate - i;
    days.push({ date, isCurrentMonth: false, isToday: false });
  }

  // Current month
  for (let date = 1; date <= lastDate; date++) {
    const isToday = isCurrentMonth && date === today.getDate();
    days.push({ date, isCurrentMonth: true, isToday });
  }

  // Next month trailing
  const totalCells = Math.ceil(days.length / 7) * 7;
  const nextMonthDays = totalCells - days.length;
  for (let date = 1; date <= nextMonthDays; date++) {
    days.push({ date, isCurrentMonth: false, isToday: false });
  }

  return (
    <div className="bg-white border border-[#E0E8F5] rounded-xl p-7 shadow-sm mx-auto">
      {/* Header */}
      <h3 className="text-center text-lg font-semibold text-[#344B7A] mb-3">
        {monthNames[monthIndex]} {year}
      </h3>

      <div className="border-t border-[#E0E8F5] mb-3"></div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-[#7D8FB3] mb-2">
        {DAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          const { isCurrentMonth, isToday, date } = day;
          const match = nonWorkingDays.find((d) => d.day === date);
          const isNonWorking = !!match && isCurrentMonth;

          const thisDate = new Date(year, monthIndex, date);
          const isPastDate = thisDate < todayStart;

          const isClickable = isCurrentMonth && !isPastDate;

          return (
            <div
              key={idx}
              title={match?.reason || ""}
              onClick={() => isClickable && onDayClick(date)}
              className={`
    aspect-square flex items-center justify-center rounded-full text-sm transition-all
    ${!isCurrentMonth ? "text-[#BFC8E6]" : "text-[#1E2A4A]"}
    ${isNonWorking ? "bg-red-200 text-red-700 font-semibold" : ""}
    ${isToday ? "bg-[#4A6CF7] text-white font-semibold" : ""}
    ${
      isClickable
        ? "cursor-pointer hover:bg-[#E8EEFB]"
        : "cursor-not-allowed opacity-50"
    }
  `}
            >
              {date}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
