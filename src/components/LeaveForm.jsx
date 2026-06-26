import React, { useEffect, useState, useMemo } from "react";
import { getAllUsers } from "../api/authApi";
import { toast } from "react-toastify";
import { X, CalendarPlus, Plus } from "lucide-react";

const LeaveForm = ({
  role = "user",
  currentUserId,
  initialValues = null,
  onSubmit,
  onClose,
}) => {
  const isEdit = !!initialValues;

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [reason, setReason] = useState(initialValues?.reason || "");
  const [userId, setUserId] = useState(
    role === "admin" ? initialValues?.userId || "" : currentUserId
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [leaveDays, setLeaveDays] = useState(initialValues?.leaveDays || []);

  // Admin: Load users
  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      try {
        const res = await getAllUsers();
        setUsers(res?.users || []);
      } catch {
        toast.error("Failed to load users");
      }
    })();
  }, [role]);

  // Auto-generate leave days when range changes (only in apply mode)
  useEffect(() => {
    if (isEdit || !fromDate || !toDate) {
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      setLeaveDays([]);
      return;
    }

    const days = [];
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      // Preserve type if already exists (in case of re-render), else default to full
      const existing = leaveDays.find((d) => d.date === dateStr);
      days.push({
        date: dateStr,
        type: existing?.type || "full",
      });
      current.setDate(current.getDate() + 1);
    }

    setLeaveDays(days);
  }, [fromDate, toDate, isEdit]);

  // In edit mode: initialize from/to from leaveDays
  useEffect(() => {
    if (!isEdit || !initialValues?.leaveDays?.length) return;

    const dates = initialValues.leaveDays.map((d) => d.date).sort();
    setFromDate(dates[0]);
    setToDate(dates[dates.length - 1]);
  }, [isEdit, initialValues]);

  // Add single day (edit mode only)
  const addDay = () => {
    const today = new Date().toISOString().slice(0, 10);
    setLeaveDays((prev) => [...prev, { date: today, type: "full" }]);
  };

  const updateDayType = (index, value) => {
    setLeaveDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, type: value } : d))
    );
  };

  const removeDay = (index) => {
    setLeaveDays((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation: is form valid?
  const isFormValid = useMemo(() => {
    if (!reason.trim()) return false;
    if (role === "admin" && !userId) return false;
    if (!leaveDays.length) return false;
    return true;
  }, [reason, userId, leaveDays, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        userId: role === "admin" ? userId : currentUserId,
        reason: reason.trim(),
        leaveDays,
      });
      onClose();
    } catch (err) {
      toast.error(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarPlus size={19} />
            {isEdit ? "Edit Leave" : "Apply Leave"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin: Employee Select */}
          {role === "admin" && (
            <div>
              <label className="font-medium">Employee *</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="border p-2 rounded w-full"
                required
              >
                <option value="">-- Select Employee --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="font-medium">Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Reason for leave"
              required
            />
          </div>

          {/* Date Range (Apply Mode) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium">From *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="font-medium">To *</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
            </div>
          )}

          {/* Leave Days Table */}
          {leaveDays.length > 0 && (
            <div className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium">Leave Days ({leaveDays.length})</p>
                {isEdit && (
                  <button
                    type="button"
                    onClick={addDay}
                    className="text-xs flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    <Plus size={14} /> Add Day
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {leaveDays.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border p-2 rounded"
                  >
                    {isEdit ? (
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setLeaveDays((prev) =>
                            prev.map((day, idx) =>
                              idx === i ? { ...day, date: newDate } : day
                            )
                          );
                        }}
                        className="border rounded px-2 py-1 text-sm flex-1"
                      />
                    ) : (
                      <span className="flex-1">{d.date}</span>
                    )}
                    <select
                      value={d.type}
                      onChange={(e) => updateDayType(i, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="full">Full Day</option>
                      <option value="half">Half Day</option>
                    </select>
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => removeDay(i)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className={`w-full py-2 rounded font-medium transition-colors ${
              isFormValid && !submitting
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {submitting
              ? "Submitting..."
              : isEdit
              ? "Update Leave"
              : "Apply Leave"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeaveForm;
