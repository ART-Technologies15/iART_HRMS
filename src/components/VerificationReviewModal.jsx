import React, { useState } from "react";
import { X, FileText, Check, XCircle, AlertCircle, CheckCheck } from "lucide-react";

const FIELD_LABELS = { pan: "PAN Card", aadhaar: "Aadhaar Card", bank: "Bank Details" };

const FieldReviewCard = ({ fieldKey, data, onApprove, onReject, busy }) => {
    const [showReject, setShowReject] = useState(false);
    const [reason, setReason] = useState("");

    if (!data || data.status !== "pending") return null;

    const submit = () => {
        if (!reason.trim()) return;
        onReject(fieldKey, reason.trim());
        setShowReject(false);
        setReason("");
    };

    return (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">{FIELD_LABELS[fieldKey]}</h4>
                <span className="text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    Pending review
                </span>
            </div>

            {fieldKey === "bank" ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Row label="Account No." value={data.accountNumber} />
                    <Row label="IFSC" value={data.ifsc} />
                    <Row label="Bank Name" value={data.bankName} />
                    <div className="col-span-2 flex gap-3 pt-1">
                        <DocLink url={data.cancelledChequeFile} label="Cancelled Cheque" />
                        <DocLink url={data.passbookFile} label="Passbook" />
                    </div>
                </div>
            ) : (
                <div className="space-y-2 text-sm">
                    <Row label="Number" value={data.number} />
                    <DocLink url={data.file} label="View Document" />
                </div>
            )}

            <p className="text-xs text-slate-400">
                Submitted {data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "-"}
            </p>

            {showReject ? (
                <div className="space-y-2 pt-1">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (shown to the employee)"
                        rows={2}
                        className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <div className="flex gap-2">
                        <button
                            disabled={busy || !reason.trim()}
                            onClick={submit}
                            className="flex-1 bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg"
                        >
                            Confirm rejection
                        </button>
                        <button
                            onClick={() => { setShowReject(false); setReason(""); }}
                            className="text-xs font-medium text-slate-500 px-3 cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2 pt-1">
                    <button
                        disabled={busy}
                        onClick={() => onApprove(fieldKey)}
                        className="flex-1 inline-flex items-center cursor-pointer justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg"
                    >
                        <Check size={14} /> Approve
                    </button>
                    <button
                        disabled={busy}
                        onClick={() => setShowReject(true)}
                        className="flex-1 inline-flex items-center cursor-pointer justify-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-medium py-2 rounded-lg"
                    >
                        <XCircle size={14} /> Reject
                    </button>
                </div>
            )}
        </div>
    );
};

const Row = ({ label, value }) => (
    <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-slate-700 font-medium">{value || "-"}</p>
    </div>
);

const DocLink = ({ url, label }) =>
    url ? (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
        >
            <FileText size={13} />
            {label}
        </a>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <FileText size={13} />
            {label} not uploaded
        </span>
    );

const VerificationReviewModal = ({ open, onClose, requestUser, onReview, onApproveAll }) => {
    const [busyField, setBusyField] = useState(null);
    const [bulkBusy, setBulkBusy] = useState(false);

    if (!open || !requestUser) return null;
    const pv = requestUser.pendingVerification || {};
    const pendingFields = ["pan", "aadhaar", "bank"].filter((k) => pv[k]?.status === "pending");
    const hasAny = pendingFields.length > 0;
    const hasMultiple = pendingFields.length > 1;

    const handleApprove = async (field) => {
        setBusyField(field);
        await onReview(requestUser._id, { field, action: "approve" });
        setBusyField(null);
    };

    const handleReject = async (field, reason) => {
        setBusyField(field);
        await onReview(requestUser._id, { field, action: "reject", reason });
        setBusyField(null);
    };

    const handleApproveAll = async () => {
        setBulkBusy(true);
        await onApproveAll(requestUser._id);
        setBulkBusy(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800">{requestUser.name}</h3>
                        <p className="text-xs text-slate-400">
                            {requestUser.employeeId} · {requestUser.department}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!hasAny ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
                            <AlertCircle size={16} /> Nothing left to review.
                        </div>
                    ) : (
                        <>
                            {hasMultiple && (
                                <div className="flex justify-end">
                                    <button
                                        disabled={bulkBusy || busyField !== null}
                                        onClick={handleApproveAll}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition cursor-pointer hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CheckCheck size={14} />
                                        {bulkBusy ? "Approving..." : `Approve All (${pendingFields.length})`}
                                    </button>
                                </div>
                            )}

                            <FieldReviewCard
                                fieldKey="pan"
                                data={pv.pan}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                busy={busyField === "pan" || bulkBusy}
                            />
                            <FieldReviewCard
                                fieldKey="aadhaar"
                                data={pv.aadhaar}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                busy={busyField === "aadhaar" || bulkBusy}
                            />
                            <FieldReviewCard
                                fieldKey="bank"
                                data={pv.bank}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                busy={busyField === "bank" || bulkBusy}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerificationReviewModal;