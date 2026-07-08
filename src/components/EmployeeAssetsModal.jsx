import React, { useEffect, useState } from "react";
import { X, Package, Calendar, Info } from "lucide-react";
import { getEmployeeAssets } from "../api/assetsApi";

const ASSIGNMENT_STATUS_STYLES = {
    Assigned: "bg-indigo-50 text-indigo-600",
    Returned: "bg-emerald-50 text-emerald-600",
    Transferred: "bg-amber-50 text-amber-600",
    Lost: "bg-rose-50 text-rose-600",
    Damaged: "bg-rose-50 text-rose-600",
};

const CONDITION_STYLES = {
    New: "bg-emerald-50 text-emerald-600",
    Good: "bg-emerald-50 text-emerald-600",
    Fair: "bg-amber-50 text-amber-600",
    Damaged: "bg-rose-50 text-rose-600",
    Repair: "bg-amber-50 text-amber-600",
    Lost: "bg-rose-50 text-rose-600",
    Scrapped: "bg-slate-100 text-slate-500",
};

const Badge = ({ value, styles }) => (
    <span
        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-500"
            }`}
    >
        {value || "-"}
    </span>
);

const PersonChip = ({ person }) => {
    if (!person) return <span className="text-slate-400">-</span>;
    return (
        <div className="flex items-center gap-1.5">
            {person.profilePhoto ? (
                <img
                    src={person.profilePhoto}
                    alt={person.name}
                    className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
            ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-500">
                    {person.name?.[0]?.toUpperCase() || "?"}
                </div>
            )}
            <span className="truncate font-medium text-slate-700">{person.name || "-"}</span>
        </div>
    );
};

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function EmployeeAssetsModal({ open, onClose, employee }) {
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        if (!open || !employee?._id) return;

        const fetchAssets = async () => {
            try {
                setLoading(true);
                const res = await getEmployeeAssets(employee._id);
                if (res?.success) {
                    setAssignments(res.assets || []);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, [open, employee]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5" style={{ maxHeight: "85vh" }}>
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        {employee?.profilePhoto ? (
                            <img
                                src={employee.profilePhoto}
                                alt={employee.name}
                                className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                            />
                        ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-base font-semibold text-white">
                                {employee?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                        )}
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{employee?.name}'s Assets</h2>
                            <p className="text-xs text-slate-400">
                                {employee?.employeeId ? `${employee.employeeId} • ` : ""}
                                {loading ? (
                                    <span className="inline-block h-3 w-16 animate-pulse rounded bg-slate-200 align-middle" />
                                ) : (
                                    `${assignments.length} asset${assignments.length === 1 ? "" : "s"}`
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-4 w-2/3 rounded bg-slate-200" />
                                                <div className="h-3 w-1/3 rounded bg-slate-100" />
                                                <div className="h-3 w-1/2 rounded bg-slate-100" />
                                                <div className="h-4 w-16 rounded-full bg-slate-100" />
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            <div className="h-5 w-16 rounded-full bg-slate-200" />
                                            <div className="h-5 w-12 rounded-full bg-slate-100" />
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                                        {Array.from({ length: 4 }).map((__, j) => (
                                            <div key={j} className="space-y-1.5">
                                                <div className="h-3 w-14 rounded bg-slate-100" />
                                                <div className="h-4 w-20 rounded bg-slate-200" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
                            No assets assigned.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map((assignment) => {
                                const asset = assignment.assetId || {};
                                return (
                                    <div key={assignment._id} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                    <Package size={20} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-slate-800">
                                                        {asset.assetName || "Unknown asset"}
                                                    </h3>
                                                    <p className="text-xs text-slate-400">{asset.assetCode}</p>
                                                    {(asset.brand || asset.model) && (
                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            {[asset.brand, asset.model].filter(Boolean).join(" ")}
                                                        </p>
                                                    )}
                                                    {asset.category && (
                                                        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                            {asset.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <Badge value={assignment.assignmentStatus} styles={ASSIGNMENT_STATUS_STYLES} />
                                                {asset.condition && <Badge value={asset.condition} styles={CONDITION_STYLES} />}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
                                            <div>
                                                <div className="text-xs text-slate-400">Serial No.</div>
                                                <div className="font-medium text-slate-700">{asset.serialNumber || "-"}</div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-slate-400">Assigned Date</div>
                                                <div className="font-medium text-slate-700">{formatDate(assignment.assignedDate)}</div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-slate-400">Expected Return</div>
                                                <div className="font-medium text-slate-700">{formatDate(assignment.expectedReturnDate)}</div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-slate-400">Assigned By</div>
                                                <div className="mt-0.5">
                                                    <PersonChip person={assignment.assignedBy} />
                                                </div>
                                            </div>

                                            {assignment.assignmentStatus === "Returned" && assignment.returnedDate && (
                                                <div>
                                                    <div className="text-xs text-slate-400">Returned Date</div>
                                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        {formatDate(assignment.returnedDate)}
                                                    </div>
                                                </div>
                                            )}

                                            {assignment.receivedBy && (
                                                <div>
                                                    <div className="text-xs text-slate-400">Received By</div>
                                                    <div className="mt-0.5">
                                                        <PersonChip person={assignment.receivedBy} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {assignment.remarks && (
                                            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                                <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                {assignment.remarks}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end border-t border-slate-100 px-6 py-3.5">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}