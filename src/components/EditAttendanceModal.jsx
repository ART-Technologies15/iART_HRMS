import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";

const defaultForm = {
  date: "", // "YYYY-MM-DD" as received from backend list API
  status: "Present",
  attendanceType: "Full Day",
  unavailabilityReason: "",

  // time parts for dropdowns (12h format)
  punchInHour: "",
  punchInMinute: "",
  punchInPeriod: "AM",
  punchOutHour: "",
  punchOutMinute: "",
  punchOutPeriod: "AM",
};

// ---- Helpers ----

// Parse ISO string from backend into 12h parts in *local time*
const isoTo12hParts = (iso) => {
  if (!iso) return { hour: "", minute: "", period: "AM" };
  const d = new Date(iso); // local time object from UTC ISO
  let h = d.getHours(); // 0-23 local
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { hour: String(h).padStart(2, "0"), minute: m, period };
};

// Convert 12h parts to "HH:mm" 24h string
const to24h = (hour12, minute, period) => {
  if (!hour12 || !minute || !period) return null;
  let h = parseInt(hour12, 10);
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h = h + 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
};

// Build a local Date from date string "YYYY-MM-DD" and 24h "HH:mm"
// Then return UTC ISO with toISOString()
const buildUtcFromLocalDateAndTime = (dateStr, hhmm) => {
  if (!dateStr || !hhmm) return null;
  const isoLocal = `${dateStr}T${hhmm}:00`; // local wall time
  const d = new Date(isoLocal);
  return d.toISOString();
};

// Build UTC ISO for the day’s start (IST midnight -> 18:30Z previous day)
const buildUtcFromLocalMidnight = (dateStr) => {
  if (!dateStr) return null;
  // Important: using "YYYY-MM-DDT00:00:00" (without Z) creates a local time Date
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
};

// Compute attendance type from two local time strings (HH:mm 24h)
const attendanceTypeFromTimes = (dateStr, inHHMM, outHHMM) => {
  if (!dateStr || !inHHMM || !outHHMM) return "Full Day";
  const inDate = new Date(`${dateStr}T${inHHMM}:00`);
  const outDate = new Date(`${dateStr}T${outHHMM}:00`);
  const diffSec = Math.max(0, Math.floor((outDate - inDate) / 1000));
  // Keep your existing simple rule (change if you want percent-based)
  return diffSec < 4 * 3600 ? "Half Day" : "Full Day";
};

const EditAttendanceModal = ({ open, onClose, attendance, onSubmit }) => {
  const [form, setForm] = useState(defaultForm);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [attendanceCleared, setAttendanceCleared] = useState(false);

  // Options for dropdowns
  const hours = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const periods = ["AM", "PM"];

  useEffect(() => {
    if (!open) return;

    setShowClearConfirmation(false);
    setAttendanceCleared(false);

    if (attendance) {
      const inParts = isoTo12hParts(attendance.punchIn);
      const outParts = isoTo12hParts(attendance.punchOut);

      setForm({
        date: attendance.date || "",

        status: attendance.status || "Present",
        attendanceType: attendance.attendanceType || "Full Day",
        unavailabilityReason: attendance.unavailabilityReason || "",

        punchInHour: inParts.hour,
        punchInMinute: inParts.minute,
        punchInPeriod: inParts.period,

        punchOutHour: outParts.hour,
        punchOutMinute: outParts.minute,
        punchOutPeriod: outParts.period,
      });
    } else {
      setForm(defaultForm);
    }
  }, [attendance, open]);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // If any punch field is set, set status to Present
      const hasAnyTime =
        updated.punchInHour ||
        updated.punchInMinute ||
        updated.punchOutHour ||
        updated.punchOutMinute;

      if (hasAnyTime) {
        updated.status = "Present";
      }

      // If both complete times exist, validate order and set attendance type
      const inHHMM = to24h(
        updated.punchInHour,
        updated.punchInMinute,
        updated.punchInPeriod
      );
      const outHHMM = to24h(
        updated.punchOutHour,
        updated.punchOutMinute,
        updated.punchOutPeriod
      );

      if (inHHMM && outHHMM && updated.date) {
        const inDate = new Date(`${updated.date}T${inHHMM}:00`);
        const outDate = new Date(`${updated.date}T${outHHMM}:00`);
        if (outDate < inDate) {
          toast.error("Punch-out cannot be earlier than punch-in");
          // clear the changed side if it caused the invalid state
          if (name.startsWith("punchOut")) {
            updated.punchOutHour = "";
            updated.punchOutMinute = "";
            updated.punchOutPeriod = "AM";
          } else {
            updated.punchInHour = "";
            updated.punchInMinute = "";
            updated.punchInPeriod = "AM";
          }
        } else {
          updated.attendanceType = attendanceTypeFromTimes(
            updated.date,
            inHHMM,
            outHHMM
          );
        }
      }

      return updated;
    });
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const updated = { ...prev, status: value };
      if (value === "On Leave" || value === "Absent") {
        updated.punchInHour = "";
        updated.punchInMinute = "";
        updated.punchInPeriod = "AM";
        updated.punchOutHour = "";
        updated.punchOutMinute = "";
        updated.punchOutPeriod = "AM";
        updated.attendanceType = value;
      } else if (value === "Present") {
        const inHHMM = to24h(
          updated.punchInHour,
          updated.punchInMinute,
          updated.punchInPeriod
        );
        const outHHMM = to24h(
          updated.punchOutHour,
          updated.punchOutMinute,
          updated.punchOutPeriod
        );
        updated.attendanceType = attendanceTypeFromTimes(
          updated.date,
          inHHMM,
          outHHMM
        );
      }
      return updated;
    });
  };

  const handleSubmit = () => {
    // Build UTC payload
    const inHHMM = to24h(
      form.punchInHour,
      form.punchInMinute,
      form.punchInPeriod
    );
    const outHHMM = to24h(
      form.punchOutHour,
      form.punchOutMinute,
      form.punchOutPeriod
    );

    const payload = {
      date: buildUtcFromLocalMidnight(form.date), // e.g. "2025-11-06T18:30:00.000Z"
      punchIn: inHHMM ? buildUtcFromLocalDateAndTime(form.date, inHHMM) : null,
      punchOut: outHHMM
        ? buildUtcFromLocalDateAndTime(form.date, outHHMM)
        : null,
      status: form.status,
      attendanceType: form.attendanceType,
      unavailabilityReason: form.unavailabilityReason || "",
    };

    onSubmit?.(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-xl p-6 shadow-lg space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Edit Attendance</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Date is shown read-only as the day key */}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="text"
            value={form.date}
            readOnly
            className="border rounded w-full p-2 bg-gray-50"
          />
        </div>

        {/* Punch In / Punch Out dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Punch In */}
          <div>
            <label className="block text-sm font-medium mb-1">Punch In</label>
            <div className="flex gap-2">
              <select
                name="punchInHour"
                value={form.punchInHour}
                onChange={handleSelectChange}
                className="border rounded p-2 w-20"
              >
                <option value="">HH</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                name="punchInMinute"
                value={form.punchInMinute}
                onChange={handleSelectChange}
                className="border rounded p-2 w-24"
              >
                <option value="">MM</option>
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                name="punchInPeriod"
                value={form.punchInPeriod}
                onChange={handleSelectChange}
                className="border rounded p-2 w-24"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Punch Out */}
          <div>
            <label className="block text-sm font-medium mb-1">Punch Out</label>
            <div className="flex gap-2">
              <select
                name="punchOutHour"
                value={form.punchOutHour}
                onChange={handleSelectChange}
                className="border rounded p-2 w-20"
              >
                <option value="">HH</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                name="punchOutMinute"
                value={form.punchOutMinute}
                onChange={handleSelectChange}
                className="border rounded p-2 w-24"
              >
                <option value="">MM</option>
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                name="punchOutPeriod"
                value={form.punchOutPeriod}
                onChange={handleSelectChange}
                className="border rounded p-2 w-24"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status */}
        {/* <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={form.status}
            onChange={handleStatusChange}
            className="border rounded p-2 w-full"
          >
            <option value="Present">Present</option>
            <option value="On Leave">On Leave</option>
            <option value="Absent">Absent</option>
          </select>
        </div> */}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {(form.punchInHour ||
            form.punchInMinute ||
            form.punchOutHour ||
            form.punchOutMinute) && !attendanceCleared && (
              <>
                {!showClearConfirmation ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirmation(true)}
                    className="px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-50 transition"
                  >
                    Clear Attendance
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Clear attendance?
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          punchInHour: "",
                          punchInMinute: "",
                          punchInPeriod: "AM",
                          punchOutHour: "",
                          punchOutMinute: "",
                          punchOutPeriod: "AM",
                        }));

                        setShowClearConfirmation(false);
                        setAttendanceCleared(true);
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowClearConfirmation(false)}
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
                    >
                      No
                    </button>
                  </div>
                )}
              </>
            )}

          {/* Clear confirmation message */}
          {attendanceCleared && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="font-medium">
                Attendance cleared. Click Save to confirm.
              </span>
            </div>
          )}

          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAttendanceModal;
