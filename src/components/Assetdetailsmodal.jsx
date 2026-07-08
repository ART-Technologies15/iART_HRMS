import React, { useEffect, useState } from "react";
import { X, Package, History, Loader2 } from "lucide-react";
import { getAssetHistory } from "../api/assetsApi";

const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
        <span className="min-w-28 text-xs font-medium text-slate-400">{label}</span>
        <span className="text-right text-sm font-medium text-slate-700">{value || "-"}</span>
    </div>
);

const Card = ({ title, children }) => (
    <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
        </div>
        <div className="px-4">{children}</div>
    </div>
);

const STATUS_STYLES = {
    Available: "bg-emerald-50 text-emerald-600",
    Assigned: "bg-indigo-50 text-indigo-600",
    Repair: "bg-amber-50 text-amber-600",
    Lost: "bg-rose-50 text-rose-600",
    Scrapped: "bg-slate-100 text-slate-500",
};

// Assignment-level status uses a different enum than the asset's own
// status (Returned/Transferred/Damaged aren't valid asset statuses), so
// history badges get their own style map.
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-500"}`}>
        {value || "-"}
    </span>
);

const PersonChip = ({ person, subtext }) => {
    if (!person) return <span className="text-sm text-slate-400">-</span>;
    return (
        <div className="flex items-center gap-2">
            {person.profilePhoto ? (
                <img
                    src={person.profilePhoto}
                    alt={person.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
            ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500">
                    {person.name?.[0]?.toUpperCase() || "?"}
                </div>
            )}
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{person.name || "-"}</p>
                {subtext && <p className="truncate text-xs text-slate-400">{subtext}</p>}
            </div>
        </div>
    );
};

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (n) => {
    if (n === null || n === undefined || n === "") return "-";
    return `₹${Number(n).toLocaleString("en-IN")}`;
};

const personSubtext = (person) => {
    if (!person) return "";
    return [person.designation, person.department].filter(Boolean).join(" • ");
};

const AssetDetailsModal = ({ open, onClose, asset }) => {
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (!open || !asset?._id) return;

        const fetchHistory = async () => {
            try {
                setHistoryLoading(true);
                const res = await getAssetHistory(asset._id);
                if (res?.success) {
                    setHistory(res.history || res.assignments || []);
                }
            } catch {
                // Non-critical — history just won't populate
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [open, asset?._id]);

    if (!open || !asset) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">{asset.assetName}</h3>
                        <p className="text-xs text-slate-400">{asset.assetCode}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto px-6 py-5">
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4">
                        <Badge value={asset.status} styles={STATUS_STYLES} />
                        <Badge value={asset.condition} styles={CONDITION_STYLES} />
                        {asset.currentAssignedTo && typeof asset.currentAssignedTo === "object" && (
                            <>
                                <span className="text-xs text-slate-400">Assigned to</span>
                                <PersonChip
                                    person={asset.currentAssignedTo}
                                    subtext={personSubtext(asset.currentAssignedTo) || asset.currentAssignedTo.employeeId}
                                />
                            </>
                        )}
                    </div>

                    <Card title="Identification">
                        <Row label="Category" value={asset.category} />
                        <Row label="Brand" value={asset.brand} />
                        <Row label="Model" value={asset.model} />
                        <Row label="Serial Number" value={asset.serialNumber} />
                    </Card>

                    <Card title="Purchase & Warranty">
                        <Row label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                        <Row label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                        <Row label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} />
                        <Row label="Vendor" value={asset.vendor} />
                    </Card>

                    {asset.notes && (
                        <Card title="Notes">
                            <p className="py-2.5 text-sm text-slate-600">{asset.notes}</p>
                        </Card>
                    )}

                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <History size={14} className="text-slate-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Assignment History
                            </span>
                        </div>

                        {historyLoading ? (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-8 text-sm text-slate-400">
                                <Loader2 size={16} className="animate-spin" /> Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                                No assignment history yet
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((h) => (
                                    <div key={h._id} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <PersonChip person={h.employeeId} subtext={personSubtext(h.employeeId) || h.employeeId?.employeeId} />
                                            <Badge value={h.assignmentStatus} styles={ASSIGNMENT_STATUS_STYLES} />
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
                                            <div>
                                                <div className="text-xs text-slate-400">Assigned Date</div>
                                                <div className="font-medium text-slate-700">{formatDate(h.assignedDate)}</div>
                                            </div>

                                            {h.expectedReturnDate && (
                                                <div>
                                                    <div className="text-xs text-slate-400">Expected Return</div>
                                                    <div className="font-medium text-slate-700">{formatDate(h.expectedReturnDate)}</div>
                                                </div>
                                            )}

                                            {h.returnedDate && (
                                                <div>
                                                    <div className="text-xs text-slate-400">Returned Date</div>
                                                    <div className="font-medium text-slate-700">{formatDate(h.returnedDate)}</div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="text-xs text-slate-400">Condition at Assignment</div>
                                                <Badge value={h.conditionAtAssignment} styles={CONDITION_STYLES} />
                                            </div>

                                            {h.conditionAtReturn && (
                                                <div>
                                                    <div className="text-xs text-slate-400">Condition at Return</div>
                                                    <Badge value={h.conditionAtReturn} styles={CONDITION_STYLES} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                                            <div>
                                                <div className="mb-1 text-xs text-slate-400">Assigned By</div>
                                                <PersonChip person={h.assignedBy} subtext={personSubtext(h.assignedBy)} />
                                            </div>

                                            {h.receivedBy && (
                                                <div>
                                                    <div className="mb-1 text-xs text-slate-400">Received By</div>
                                                    <PersonChip person={h.receivedBy} subtext={personSubtext(h.receivedBy)} />
                                                </div>
                                            )}
                                        </div>

                                        {h.remarks && (
                                            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{h.remarks}</p>
                                        )}
                                        {h.returnRemarks && (
                                            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                                Return note: {h.returnRemarks}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
};

export default AssetDetailsModal;