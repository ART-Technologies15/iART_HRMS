import React, { useEffect, useRef, useState } from "react";
import { Package, User, Calendar, Info, SlidersHorizontal, Search, X } from "lucide-react";
import { getEmployeeAssets } from "../api/assetsApi";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

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

const FILTER_TABS = ["All", "Assigned", "Returned", "Transferred", "Lost", "Damaged"];

const Badge = ({ value, styles }) => (
    <span
        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-500"
            }`}
    >
        {value || "-"}
    </span>
);

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const MyAssetsPage = () => {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [statusFilter, setStatusFilter] = useState("All");

    // Search — raw input vs debounced value sent to the API
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const searchDebounceRef = useRef(null);
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [search]);

    useEffect(() => {
        if (!user?._id) return;

        const fetchAssets = async () => {
            try {
                setLoading(true);
                const res = await getEmployeeAssets(user._id, {
                    search: debouncedSearch,
                    status: statusFilter === "All" ? "" : statusFilter,
                });
                if (res?.success) {
                    setAssignments(res.assets || []);
                    setTotalCount(res.total ?? res.assets?.length ?? 0);
                } else {
                    toast.error(res?.message || "Failed to load your assets");
                }
            } catch {
                toast.error("Server error while fetching your assets");
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, [user?._id, debouncedSearch, statusFilter]);

    const activeCount = assignments.filter((a) => a.assignmentStatus === "Assigned").length;

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">My Assets</h1>
                    <p className="text-sm text-slate-500">
                        {loading ? (
                            <span className="inline-block h-4 w-56 animate-pulse rounded bg-slate-200 align-middle" />
                        ) : (
                            `${totalCount} total assets`
                        )}
                    </p>
                </div>

                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <input
                        type="text"
                        placeholder="Search by asset name, code, serial..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <Search size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <SlidersHorizontal size={15} className="shrink-0 text-slate-400" />
                {FILTER_TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${statusFilter === tab
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-500 border border-gray-200 hover:bg-slate-50"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 gap-3 flex-1">
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

                            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3">
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
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    {search
                        ? `No assets matching "${search}".`
                        : statusFilter === "All"
                            ? "No assets have been assigned to you yet."
                            : `No ${statusFilter.toLowerCase()} assets found.`}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {assignments.map((assignment) => {
                        const asset = assignment.assetId || {};
                        return (
                            <div
                                key={assignment._id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5"
                            >
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

                                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-sm">
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
                                        <div className="flex items-center gap-1 font-medium text-slate-700">
                                            <User size={12} className="text-slate-400" />
                                            {assignment.assignedBy?.name || "-"}
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
    );
};

export default MyAssetsPage;