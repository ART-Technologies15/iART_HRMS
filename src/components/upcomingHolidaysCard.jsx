import React, { useMemo } from "react";
import moment from "moment";

const UpcomingHolidaysCard = ({ calendarData = [] }) => {
  const today = moment().startOf("day");
  const currentYear = today.year();

  const holidays = useMemo(() => {
    const list = [];
    calendarData
      .filter((c) => c.year === currentYear)
      .forEach((entry) => {
        entry.nonWorkingDays.forEach((d) => {
          const date = moment(`${entry.year}-${entry.month}-${d.day}`, "YYYY-M-D");
          const dow = date.day();
          if (dow === 0 || dow === 6) return;
          if (date.isBefore(today)) return;
          const diff = date.diff(today, "days");
          list.push({ date, diff, reason: d.reason });
        });
      });
    return list.sort((a, b) => a.date.valueOf() - b.date.valueOf());
  }, [calendarData]);

  const getBadge = (diff) => {
    if (diff === 0) return { label: "Today", cls: "bg-amber-50 text-amber-700" };
    if (diff === 1) return { label: "Tomorrow", cls: "bg-amber-50 text-amber-700" };
    if (diff <= 14) return { label: `In ${diff} days`, cls: "bg-amber-50 text-amber-700" };
    return { label: date.format("MMM YYYY"), cls: "bg-gray-100 text-gray-500" };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <span className="text-base">🗓</span> Upcoming holidays
        </h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full">
          {holidays.length} remaining
        </span>
      </div>

      {/* List */}
      {holidays.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400 text-sm">
          <span className="text-2xl">📭</span>
          No upcoming holidays this year
        </div>
      ) : (
        <div className="space-y-2">
          {holidays.map((h, idx) => {
            console.log("hhhh", h);
            
            const diff = h.diff;
            const soon = diff <= 14;
            const badgeLabel =
              diff === 0 ? "Today" :
                diff === 1 ? "Tomorrow" :
                  soon ? `In ${diff} days` :
                    h.date.format("MMM YYYY");
            const badgeCls = soon
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-100 text-gray-500";

            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100"
              >
                {/* Date pill */}
                <div className="w-9 h-9 flex flex-col items-center justify-center bg-blue-50 rounded-lg flex-shrink-0">
                  <span className="text-sm font-medium text-blue-600 leading-none">
                    {h.date.format("DD")}
                  </span>
                  <span className="text-[10px] text-blue-500 leading-snug">
                    {h.date.format("MMM")}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate" title={h.reason}>{h.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.date.format("ddd, DD MMM YYYY")}</p>
                </div>

                {/* Badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badgeCls}`}>
                  {badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingHolidaysCard;