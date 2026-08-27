// pages/Regularization.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Search, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import CustomTable from "../components/CustomTable";
import EditAttendanceModal from "../components/EditAttendanceModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
    getAllRegularizationAPI,
    updateRegularizationByAdminAPI,
    updateAttendanceAPI,
} from "../api/attendaceApi";
import { toast } from "react-toastify";
import AcceptRejectRegularizationModal from "../components/AcceptRejectRegularizationModal";

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];
const REQUEST_TYPE_OPTIONS = [
    { value: "punch_correction", label: "Punch Correction" },
    { value: "missed_punch", label: "Missed Punch" },
    { value: "manual_attendance", label: "Manual Attendance" },
    { value: "work_from_home", label: "Work From Home" },
];

const statusBadgeCls = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
};

const SEARCH_DEBOUNCE_MS = 400;

const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;
};

const Regularization = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState(""); // raw input, updates instantly
    const [search, setSearch] = useState("");            // debounced value sent to API

    const [statusFilter, setStatusFilter] = useState("");
    const [requestTypeFilter, setRequestTypeFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState(getCurrentMonth);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [editRow, setEditRow] = useState(null);
    const [reviewRow, setReviewRow] = useState(null);
    const [rejectRow, setRejectRow] = useState(null);
    const [saving, setSaving] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });

    // ---------- Debounce search input -> search (also resets to page 1) ----------
    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(searchInput.trim());
            setPagination((prev) => ({ ...prev, page: 1 }));
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    // ---------- Fetch (server-side search + filters + pagination) ----------
    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getAllRegularizationAPI({
                status: statusFilter || undefined,
                requestType: requestTypeFilter || undefined,
                search: search || undefined,
                month: monthFilter || undefined,
                page: pagination.page,
                limit: pagination.limit,
            });

            if (res?.success) {
                setRequests(res.data || []);
                setPagination((prev) => ({
                    ...prev,
                    total: res.pagination?.total ?? 0,
                    totalPages: res.pagination?.totalPages ?? 1,
                }));
            } else {
                toast.error(res?.message || "Failed to load regularization requests");
            }
        } catch (err) {
            toast.error(
                err?.response?.data?.message || "Server error while fetching requests"
            );
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, requestTypeFilter, search, monthFilter, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ---------- Formatting helpers ----------
    const formatDate = (d) => {
        if (!d) return "-";
        const date = new Date(d);
        const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }); // "Mon", "Tue"...
        const datePart = date.toLocaleDateString("en-GB"); // "01/07/2026"
        return `${datePart} (${dayName})`;
    };

    const formatTime = (d) =>
        d
            ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : "-";

    // ---------- Edit flow ----------
    const handleOpenEdit = (row) => setEditRow(row);

    const editAttendanceValue = editRow
        ? {
            date: editRow.attendanceDate
                ? new Date(editRow.attendanceDate).toISOString().split("T")[0]
                : "",
            punchIn: editRow.requestedPunchIn,
            punchOut: editRow.requestedPunchOut,
            status: "Present",
            attendanceType: "Full Day",
            unavailabilityReason: "",
        }
        : null;

    const handleEditSubmit = async (payload) => {
        if (!editRow) return;
        try {
            setSaving(true);

            await updateAttendanceAPI({
                userId: editRow.userId?._id || editRow.userId,
                date: editRow.attendanceDate,
                punchIn: payload.punchIn,
                punchOut: payload.punchOut,
            });

            toast.success("Attendance updated successfully");

            try {
                await updateRegularizationByAdminAPI(editRow._id, { status: "Approved" });
            } catch {
                toast.warn(
                    "Attendance updated, but marking the request as Approved failed. Please update its status manually."
                );
            }

            setEditRow(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    // ---------- Reject flow ----------
    const handleReject = async () => {
        if (!rejectRow) return;
        try {
            await updateRegularizationByAdminAPI(rejectRow._id, { status: "Rejected" });
            toast.success("Request rejected");
            setRejectRow(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Reject failed");
        }
    };

    // ---------- Pagination controls ----------
    const goToPage = (p) => {
        if (p < 1 || p > pagination.totalPages || p === pagination.page) return;
        setPagination((prev) => ({ ...prev, page: p }));
    };

    const requestTypeLabel = (value) =>
        REQUEST_TYPE_OPTIONS.find((t) => t.value === value)?.label || value || "-";


    const handleOpenReview = (row) => setReviewRow(row);

    // ---------- Table columns ----------
    const columns = [
        {
            label: "Employee",
            accessor: "employee",
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-800">{row.userId?.name || "-"}</div>
                    <div className="text-xs text-gray-400">
                        {row.userId?.employeeId ? `${row.userId.employeeId} • ` : ""}
                        {row.userId?.email}
                    </div>
                </div>
            ),
        },
        {
            label: "Date",
            accessor: "attendanceDate",
            render: (val) => (
                <span className="whitespace-nowrap">{formatDate(val)}</span>
            ),
        },
        {
            label: "Type",
            accessor: "requestType",
            render: (val) => requestTypeLabel(val),
        },
        {
            label: "Current (In / Out)",
            accessor: "currentPunch",
            render: (_, row) => (
                <span className="whitespace-nowrap text-gray-500">
                    {formatTime(row.currentPunchIn)} - {formatTime(row.currentPunchOut)}
                </span>
            ),
        },
        {
            label: "Requested (In / Out)",
            accessor: "requestedPunch",
            render: (_, row) => (
                <span className="whitespace-nowrap text-gray-800 font-medium">
                    {formatTime(row.requestedPunchIn)} - {formatTime(row.requestedPunchOut)}
                </span>
            ),
        },
        {
            label: "Reason",
            accessor: "reason",
            render: (val) => (
                <span className="line-clamp-1 max-w-[100px] block" title={val}>
                    {val}
                </span>
            ),
        },
        {
            label: "Status",
            accessor: "status",
            render: (val) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadgeCls[val] || "bg-gray-100 text-gray-600"
                        }`}
                >
                    {val}
                </span>
            ),
        },
        {
            label: "Actions",
            accessor: "actions",
            render: (_, row) => (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={row.status !== "Pending"}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(row);
                        }}
                    >
                        Edit
                    </button>
                    <button
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={row.status !== "Pending"}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReview(row);
                        }}
                    >
                        Review
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Regularization Requests
            </h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Mobile: Search + Toggle */}
                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="Search employee, type, reason..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 truncate"
                        />
                        <Search
                            size={18}
                            className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
                        />
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        className="sm:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-50 flex-shrink-0"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                {/* Desktop Controls */}
                <div className="hidden sm:flex items-center gap-2">
                    {/* Month */}
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => {
                            setMonthFilter(e.target.value);
                            setPagination((prev) => ({
                                ...prev,
                                page: 1,
                            }));
                        }}
                        className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={requestTypeFilter}
                        onChange={(e) => {
                            setRequestTypeFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                        <option value="">All Types</option>
                        {REQUEST_TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mobile Filters */}
            {mobileMenuOpen && (
                <div className="sm:hidden grid grid-cols-1 gap-3 pb-4 border-b border-gray-200">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="w-full bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm"
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={requestTypeFilter}
                        onChange={(e) => {
                            setRequestTypeFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="w-full bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm"
                    >
                        <option value="">All Types</option>
                        {REQUEST_TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    Loading requests...
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    No regularization requests found
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={requests}
                                defaultRowsPerPage={pagination.limit}
                                footerLegend={[]}
                            />
                        </div>
                    </div>

                    {/* ---------- Server-side pagination controls ---------- */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                        <p className="text-xs text-gray-500">
                            Page <span className="font-medium">{pagination.page}</span> of{" "}
                            <span className="font-medium">{pagination.totalPages}</span>{" "}
                            ({pagination.total} total)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <button
                                onClick={() => goToPage(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EditAttendanceModal
                open={!!editRow}
                attendance={editAttendanceValue}
                onClose={() => !saving && setEditRow(null)}
                onSubmit={handleEditSubmit}
            />

            <ConfirmDeleteModal
                open={!!rejectRow}
                title="Reject Regularization Request"
                message={`Are you sure you want to reject ${rejectRow?.userId?.name || "this"
                    }'s request for ${formatDate(rejectRow?.attendanceDate)}?`}
                confirmText="Reject"
                confirmVariant="danger"
                onCancel={() => setRejectRow(null)}
                onConfirm={handleReject}
            />
            <AcceptRejectRegularizationModal
                open={!!reviewRow}
                regularization={reviewRow}
                onClose={() => setReviewRow(null)}
                onSuccess={fetchRequests}
            />
        </div>
    );
};

export default Regularization;