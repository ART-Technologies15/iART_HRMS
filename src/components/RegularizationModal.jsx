// components/RegularizationModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Clock, FileText, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { toast } from "react-toastify";
import {
    createRegularizationAPI,
    updateRegularizationAPI,
    updateRegularizationByAdminAPI,
} from "../api/attendaceApi";

// ── Shared styling tokens (kept consistent with UserFormModal) ──
const inputCls =
    "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const selectCls = inputCls; // reuse same look for the time dropdowns

const FieldLabel = ({ children, required }) => (
    <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {children}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
);

const SectionHeader = ({ icon: Icon, title, hint }) => (
    <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <Icon size={15} />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {hint && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {hint}
            </span>
        )}
    </div>
);

const REQUEST_TYPES = [
    { value: "punch_correction", label: "Punch Correction" },
    { value: "missed_punch", label: "Missed Punch" },
    { value: "manual_attendance", label: "Manual Attendance" },
    { value: "work_from_home", label: "Work From Home" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

// ── Time helpers (mirrors EditAttendanceModal) ──

// ISO/Date -> { hour: "01".."12", minute: "00".."59", period: "AM"|"PM" } in LOCAL time
const isoTo12hParts = (iso) => {
    if (!iso) return { hour: "", minute: "", period: "AM" };
    const d = new Date(iso);
    if (isNaN(d)) return { hour: "", minute: "", period: "AM" };
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return { hour: String(h).padStart(2, "0"), minute: m, period };
};

// 12h parts -> "HH:mm" 24h string
const to24h = (hour12, minute, period) => {
    if (!hour12 || !minute || !period) return null;
    let h = parseInt(hour12, 10);
    if (period === "AM") {
        if (h === 12) h = 0;
    } else if (h !== 12) {
        h = h + 12;
    }
    return `${String(h).padStart(2, "0")}:${minute}`;
};

// date "YYYY-MM-DD" + 24h "HH:mm" -> ISO string (local wall time)
const combineDateTime = (dateStr, hhmm) => {
    if (!dateStr || !hhmm) return null;
    return new Date(`${dateStr}T${hhmm}:00`).toISOString();
};

/**
 * mode:
 *  - "create": employee raising a new request (prefilled from an attendance row)
 *  - "edit":   employee editing their own pending request
 *  - "review": admin approving/rejecting a pending request
 */
const RegularizationModal = ({
    open,
    onClose,
    onSuccess,
    mode = "create",
    attendanceRow = null, // used in "create" mode — { date, punchIn, punchOut }
    regularization = null, // used in "edit" / "review" mode — existing doc
}) => {
    const isReview = mode === "review";
    const isEdit = mode === "edit";

    const [form, setForm] = useState({
        attendanceDate: "",
        requestType: "",
        reason: "",

        punchInHour: "",
        punchInMinute: "",
        punchInPeriod: "AM",

        punchOutHour: "",
        punchOutMinute: "",
        punchOutPeriod: "PM",
    });

    const [reviewStatus, setReviewStatus] = useState("");
    const [reviewComment, setReviewComment] = useState("");
    const [loading, setLoading] = useState(false);

    // Correctly extracts "YYYY-MM-DD" in IST from a UTC ISO string,
    // instead of toISOString() which reads it back in UTC and can
    // land on the previous day (since IST midnight = 18:30 UTC prior day).
    const toISTDateString = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        if (isNaN(d)) return "";
        // en-CA locale formats as YYYY-MM-DD
        return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    };

    useEffect(() => {
        if (!open) return;

        if (mode === "create" && attendanceRow) {
            const inParts = isoTo12hParts(attendanceRow.punchIn);
            const outParts = isoTo12hParts(attendanceRow.punchOut);

            setForm({
                attendanceDate: attendanceRow.date, // already "YYYY-MM-DD" from list API — no change needed
                requestType: "",
                reason: "",

                punchInHour: inParts.hour,
                punchInMinute: inParts.minute,
                punchInPeriod: inParts.period,

                punchOutHour: outParts.hour,
                punchOutMinute: outParts.minute,
                punchOutPeriod: attendanceRow.punchOut ? outParts.period : "PM",
            });
        } else if ((isEdit || isReview) && regularization) {
            const inParts = isoTo12hParts(regularization.requestedPunchIn);
            const outParts = isoTo12hParts(regularization.requestedPunchOut);

            setForm({
                attendanceDate: toISTDateString(regularization.attendanceDate), // ← fixed
                requestType: regularization.requestType || "",
                reason: regularization.reason || "",

                punchInHour: inParts.hour,
                punchInMinute: inParts.minute,
                punchInPeriod: inParts.period,

                punchOutHour: outParts.hour,
                punchOutMinute: outParts.minute,
                punchOutPeriod: regularization.requestedPunchOut ? outParts.period : "PM",
            });
        }

        setReviewStatus("");
        setReviewComment("");
    }, [open, mode, attendanceRow, regularization, isEdit, isReview]);

    const currentPunchSummary = useMemo(() => {
        const inTime = regularization?.currentPunchIn
            ? new Date(regularization.currentPunchIn).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })
            : "—";
        const outTime = regularization?.currentPunchOut
            ? new Date(regularization.currentPunchOut).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })
            : "—";
        return `${inTime} → ${outTime}`;
    }, [regularization]);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // Punch-in / punch-out dropdown changes go through this so we can
    // immediately flag an invalid order (out before in) the moment
    // both sides are complete — same UX as EditAttendanceModal.
    const handleTimeSelectChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => {
            const updated = { ...prev, [name]: value };

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

            if (inHHMM && outHHMM && updated.attendanceDate) {
                const inDate = new Date(`${updated.attendanceDate}T${inHHMM}:00`);
                const outDate = new Date(`${updated.attendanceDate}T${outHHMM}:00`);

                if (outDate <= inDate) {
                    toast.error("Punch-out must be after punch-in");
                    if (name.startsWith("punchOut")) {
                        updated.punchOutHour = "";
                        updated.punchOutMinute = "";
                        updated.punchOutPeriod = "PM";
                    } else {
                        updated.punchInHour = "";
                        updated.punchInMinute = "";
                        updated.punchInPeriod = "AM";
                    }
                }
            }

            return updated;
        });
    };

    const validate = () => {
        if (isReview) {
            if (!reviewStatus) {
                toast.error("Please select Approve or Reject.");
                return false;
            }
            return true;
        }

        if (!form.attendanceDate) {
            toast.error("Attendance date is required.");
            return false;
        }

        const inHHMM = to24h(form.punchInHour, form.punchInMinute, form.punchInPeriod);
        const outHHMM = to24h(form.punchOutHour, form.punchOutMinute, form.punchOutPeriod);

        if (!inHHMM || !outHHMM) {
            toast.error("Both punch-in and punch-out times are required.");
            return false;
        }

        if (!form.requestType) {
            toast.error("Please select a request type.");
            return false;
        }

        if (!form.reason.trim()) {
            toast.error("Please provide a reason.");
            return false;
        }

        const inDate = new Date(`${form.attendanceDate}T${inHHMM}:00`);
        const outDate = new Date(`${form.attendanceDate}T${outHHMM}:00`);

        if (outDate <= inDate) {
            toast.error("Punch-out must be after punch-in.");
            return false;
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (new Date(form.attendanceDate) > today) {
            toast.error("Future attendance cannot be regularized.");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            if (isReview) {
                await updateRegularizationByAdminAPI(regularization._id, {
                    status: reviewStatus,
                    reviewComment: reviewComment.trim() || undefined,
                });
                toast.success(`Request ${reviewStatus.toLowerCase()} successfully.`);
            } else {
                const inHHMM = to24h(form.punchInHour, form.punchInMinute, form.punchInPeriod);
                const outHHMM = to24h(form.punchOutHour, form.punchOutMinute, form.punchOutPeriod);

                const payload = {
                    attendanceDate: form.attendanceDate,
                    requestedPunchIn: combineDateTime(form.attendanceDate, inHHMM),
                    requestedPunchOut: combineDateTime(form.attendanceDate, outHHMM),
                    requestType: form.requestType,
                    reason: form.reason.trim(),
                };

                if (isEdit) {
                    await updateRegularizationAPI(regularization._id, payload);
                    toast.success("Regularization request updated.");
                } else {
                    await createRegularizationAPI(payload);
                    toast.success("Regularization request submitted.");
                }
            }

            onSuccess?.();
            onClose?.();
        } catch (err) {
            const msg =
                err?.response?.data?.message || "Something went wrong. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const titleMap = {
        create: "Add Regularization",
        edit: "Edit Regularization",
        review: "Review Regularization",
    };
    const subtitleMap = {
        create: "Request a correction for this attendance day",
        edit: "Update your pending request",
        review: "Approve or reject this employee's request",
    };

    const timeFieldsDisabled = loading || isReview;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div
                className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
                style={{ maxHeight: "90vh" }}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {titleMap[mode]}
                        </h2>
                        <p className="text-xs text-slate-400">{subtitleMap[mode]}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm">
                    {/* Admin review: show current punch as read-only context */}
                    {isReview && (
                        <section>
                            <SectionHeader icon={Clock} title="Current Attendance" />
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                                {currentPunchSummary}
                            </div>
                        </section>
                    )}

                    <section className={isReview ? "border-t border-slate-100 pt-6" : ""}>
                        <SectionHeader
                            icon={CalendarDays}
                            title={isReview ? "Requested Change" : "Attendance Details"}
                            hint={isReview ? "Requested by employee" : undefined}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <FieldLabel required>Date</FieldLabel>
                                <input
                                    type="date"
                                    name="attendanceDate"
                                    value={form.attendanceDate}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            <div>
                                <FieldLabel required>Request Type</FieldLabel>
                                <select
                                    name="requestType"
                                    value={form.requestType}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled={loading || isReview}
                                >
                                    <option value="" disabled>
                                        Select type
                                    </option>
                                    {REQUEST_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Punch In — HH / MM / AM-PM dropdowns */}
                            <div>
                                <FieldLabel required>Punch In</FieldLabel>
                                <div className="flex gap-2">
                                    <select
                                        name="punchInHour"
                                        value={form.punchInHour}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        <option value="">HH</option>
                                        {HOURS.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        name="punchInMinute"
                                        value={form.punchInMinute}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        <option value="">MM</option>
                                        {MINUTES.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        name="punchInPeriod"
                                        value={form.punchInPeriod}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        {PERIODS.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Punch Out — HH / MM / AM-PM dropdowns */}
                            <div>
                                <FieldLabel required>Punch Out</FieldLabel>
                                <div className="flex gap-2">
                                    <select
                                        name="punchOutHour"
                                        value={form.punchOutHour}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        <option value="">HH</option>
                                        {HOURS.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        name="punchOutMinute"
                                        value={form.punchOutMinute}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        <option value="">MM</option>
                                        {MINUTES.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        name="punchOutPeriod"
                                        value={form.punchOutPeriod}
                                        onChange={handleTimeSelectChange}
                                        className={`${selectCls} px-2`}
                                        disabled={timeFieldsDisabled}
                                    >
                                        {PERIODS.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <FieldLabel required>Reason</FieldLabel>
                                <textarea
                                    name="reason"
                                    value={form.reason}
                                    onChange={handleChange}
                                    className={`${inputCls} min-h-20 resize-none`}
                                    placeholder="Explain why this correction is needed"
                                    disabled={loading || isReview}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Admin decision block */}
                    {isReview && (
                        <section className="border-t border-slate-100 pt-6">
                            <SectionHeader icon={FileText} title="Decision" />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReviewStatus("Approved")}
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${reviewStatus === "Approved"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <CheckCircle2 size={16} /> Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewStatus("Rejected")}
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${reviewStatus === "Rejected"
                                        ? "border-rose-500 bg-rose-50 text-rose-700"
                                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <XCircle size={16} /> Reject
                                </button>
                            </div>

                            <div className="mt-4">
                                <FieldLabel>Comment (optional)</FieldLabel>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    className={`${inputCls} min-h-16 resize-none`}
                                    placeholder="Add a note for the employee"
                                    disabled={loading}
                                />
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${isReview && reviewStatus === "Rejected"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                    >
                        {loading
                            ? "Saving..."
                            : isReview
                                ? "Submit Decision"
                                : isEdit
                                    ? "Save Changes"
                                    : "Submit Request"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegularizationModal;