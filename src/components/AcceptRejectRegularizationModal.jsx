import React, { useEffect, useState } from "react";
import { X, CheckCircle2, XCircle, Clock, FileText, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import {
    updateRegularizationByAdminAPI,
    updateAttendanceAPI,
} from "../api/attendaceApi"    ;

const inputCls =
    "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const FieldLabel = ({ children }) => (
    <label className="mb-1.5 block text-xs font-medium text-slate-600">{children}</label>
);

const SectionHeader = ({ icon: Icon, title }) => (
    <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <Icon size={15} />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
);

const REQUEST_TYPE_LABELS = {
    punch_correction: "Punch Correction",
    missed_punch: "Missed Punch",
    manual_attendance: "Manual Attendance",
    work_from_home: "Work From Home",
};

const toISTDateString = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    const dayName = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
    const datePart = d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
    return `${datePart} (${dayName})`;
};

const formatTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
};

/**
 * A single modal that:
 *  - shows the regularization request (current vs requested punch, reason, type)
 *  - "Accept" -> confirmation step -> applies requestedPunchIn/Out to Attendance
 *               via updateAttendanceAPI, then marks the request Approved.
 *  - "Reject" -> asks for an optional comment -> marks the request Rejected.
 */
const AcceptRejectRegularizationModal = ({ open, onClose, onSuccess, regularization }) => {
    // "view" | "confirmAccept" | "confirmReject"
    const [step, setStep] = useState("view");
    const [rejectComment, setRejectComment] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setStep("view");
            setRejectComment("");
        }
    }, [open, regularization]);

    if (!open || !regularization) return null;

    const {
        _id,
        userId,
        attendanceDate,
        currentPunchIn,
        currentPunchOut,
        requestedPunchIn,
        requestedPunchOut,
        requestType,
        reason,
    } = regularization;

    const employeeName = userId?.name || "-";
    const employeeMeta = [userId?.employeeId, userId?.email].filter(Boolean).join(" • ");

    const handleClose = () => {
        if (loading) return;
        onClose?.();
    };

    // ---------- ACCEPT: apply requested times directly to Attendance ----------
    const handleConfirmAccept = async () => {
        setLoading(true);
        try {
            await updateAttendanceAPI({
                userId: userId?._id || userId,
                date: toISTDateString(attendanceDate),
                punchIn: requestedPunchIn,
                punchOut: requestedPunchOut,
            });

            try {
                await updateRegularizationByAdminAPI(_id, { status: "Approved" });
            } catch {
                // Attendance write already succeeded — don't block the user on this,
                // just flag it so they know to check the request's status manually.
                toast.warn(
                    "Attendance updated, but marking the request Approved failed. Please refresh and check its status."
                );
                onSuccess?.();
                onClose?.();
                return;
            }

            toast.success("Request accepted and attendance updated.");
            onSuccess?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to accept request.");
        } finally {
            setLoading(false);
        }
    };

    // ---------- REJECT ----------
    const handleConfirmReject = async () => {
        setLoading(true);
        try {
            await updateRegularizationByAdminAPI(_id, {
                status: "Rejected",
                reviewComment: rejectComment.trim() || undefined,
            });
            toast.success("Request rejected.");
            onSuccess?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to reject request.");
        } finally {
            setLoading(false);
        }
    };

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
                            {step === "view" && "Review Regularization"}
                            {step === "confirmAccept" && "Confirm Acceptance"}
                            {step === "confirmReject" && "Reject Request"}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {employeeName} {employeeMeta && `• ${employeeMeta}`}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm">
                    {/* ================= STEP: VIEW ================= */}
                    {step === "view" && (
                        <>
                            <section>
                                <SectionHeader icon={Clock} title="Attendance Date" />
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                                    {formatDate(attendanceDate)}
                                </div>
                            </section>

                            <section className="border-t border-slate-100 pt-6">
                                <SectionHeader icon={FileText} title="Punch Comparison" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                            Current
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {formatTime(currentPunchIn)} - {formatTime(currentPunchOut)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-indigo-500">
                                            Requested
                                        </p>
                                        <p className="text-sm font-medium text-slate-800">
                                            {formatTime(requestedPunchIn)} - {formatTime(requestedPunchOut)}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="border-t border-slate-100 pt-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <FieldLabel>Request Type</FieldLabel>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                                            {REQUEST_TYPE_LABELS[requestType] || requestType || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <FieldLabel>Reason</FieldLabel>
                                    <div className="min-h-16 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                                        {reason || "-"}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ================= STEP: CONFIRM ACCEPT ================= */}
                    {step === "confirmAccept" && (
                        <section>
                            <p className="text-sm text-slate-600">
                                This will update <span className="font-medium text-slate-800">{employeeName}'s</span>{" "}
                                attendance for <span className="font-medium text-slate-800">{formatDate(attendanceDate)}</span>{" "}
                                to the requested punch times shown below, and mark this request as{" "}
                                <span className="font-medium text-emerald-600">Approved</span>.
                            </p>

                            <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-4">
                                <div className="text-center">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                        Punch In
                                    </p>
                                    <p className="text-base font-semibold text-slate-800">
                                        {formatTime(requestedPunchIn)}
                                    </p>
                                </div>
                                <ArrowRight size={16} className="text-slate-300" />
                                <div className="text-center">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                        Punch Out
                                    </p>
                                    <p className="text-base font-semibold text-slate-800">
                                        {formatTime(requestedPunchOut)}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-slate-400">
                                This action directly overwrites the existing attendance record for this date.
                            </p>
                        </section>
                    )}

                    {/* ================= STEP: CONFIRM REJECT ================= */}
                    {step === "confirmReject" && (
                        <section>
                            <p className="text-sm text-slate-600">
                                Rejecting <span className="font-medium text-slate-800">{employeeName}'s</span> request
                                for <span className="font-medium text-slate-800">{formatDate(attendanceDate)}</span>.
                                Attendance will remain unchanged.
                            </p>

                            <div className="mt-4">
                                <FieldLabel>Comment (optional)</FieldLabel>
                                <textarea
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    className={`${inputCls} min-h-20 resize-none`}
                                    placeholder="Let the employee know why this was rejected"
                                    disabled={loading}
                                />
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    {step === "view" && (
                        <>
                            <button
                                onClick={() => setStep("confirmReject")}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <XCircle size={16} /> Reject
                            </button>
                            <button
                                onClick={() => setStep("confirmAccept")}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} /> Accept
                            </button>
                        </>
                    )}

                    {step === "confirmAccept" && (
                        <>
                            <button
                                onClick={() => setStep("view")}
                                disabled={loading}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmAccept}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? "Applying..." : "Confirm Accept"}
                            </button>
                        </>
                    )}

                    {step === "confirmReject" && (
                        <>
                            <button
                                onClick={() => setStep("view")}
                                disabled={loading}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? "Rejecting..." : "Confirm Reject"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcceptRejectRegularizationModal;