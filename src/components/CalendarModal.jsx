import React, { useState, useEffect } from "react";
import { saveCalendarMonth } from "../api/calendarApi";

const CalendarModal = ({ dateInfo, onClose, calendarData }) => {
  const { year, month, date } = dateInfo;

  const entry = calendarData.find((c) => c.month === month);
  const nonWorkingDays = entry?.nonWorkingDays || [];

  const existing = nonWorkingDays.find((d) => d.day === date);
  const isNonWorking = !!existing;

  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReason("");
  }, [dateInfo]);

  const toggleDay = async () => {
    if (!isNonWorking && !reason.trim()) {
      return alert("Please provide a reason for marking non-working day");
    }

    setSaving(true);

    let updatedDays;

    if (isNonWorking) {
      // Remove day
      updatedDays = nonWorkingDays.filter((d) => d.day !== date);
    } else {
      // Add day with reason
      updatedDays = [...nonWorkingDays, { day: date, reason: reason.trim() }];
    }

    const res = await saveCalendarMonth({
      month,
      year,
      nonWorkingDays: updatedDays,
    });

    setSaving(false);
    onClose(res?.success);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h3 className="text-lg font-semibold text-[#344B7A] mb-2">
          {date}/{month}/{year}
        </h3>

        <p className="mb-4">
          Status:{" "}
          <span className={isNonWorking ? "text-red-600" : "text-green-600"}>
            {isNonWorking ? "Non-Working Day" : "Working Day"}
          </span>
        </p>

        {/* ✅ If already non-working, just show reason */}
        {isNonWorking ? (
          <p className="mb-4">
            <strong>Reason:</strong> {existing.reason}
          </p>
        ) : (
          <>
            {/* ✅ If marking non-working, show input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (required)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
              className="w-full border rounded px-3 py-2 text-sm mb-4"
            />
          </>
        )}

        <button
          onClick={toggleDay}
          disabled={saving}
          className={`w-full py-2 rounded-lg text-white font-medium ${
            isNonWorking ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {saving
            ? "Saving..."
            : isNonWorking
            ? "Mark as Working"
            : "Mark as Non-Working"}
        </button>

        <button
          onClick={() => onClose(false)}
          className="w-full mt-2 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CalendarModal;
