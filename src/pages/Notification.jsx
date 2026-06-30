import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Menu } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
    createNotification,
    updateNotification,
    getAllNotifications,
    deleteNotification,
    toggleNotificationStatus
} from "../api/notificationApi";
import CustomTable from "../components/CustomTable";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import NotificationFormModal from "../components/NotificationFormModal";

const Notifications = () => {
    const { user } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [formOpen, setFormOpen] = useState(false);       // true = add, object = edit
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });

    const [expandedRows, setExpandedRows] = useState({});

    // ── Fetch ──────────────────────────────────────────────
    const fetchNotifications = async (
        keyword = search,
        currentPage = page,
        currentLimit = rowsPerPage
    ) => {
        try {
            setLoading(true);

            const res = await getAllNotifications({
                page: currentPage,
                limit: currentLimit,
                search: keyword,
            });

            if (res.success) {
                setNotifications(res.notifications);
                setPagination(res.pagination);
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            toast.error("Server error while fetching notifications");
        } finally {
            setLoading(false);
        }
    };

    const hasMounted = useRef(false);
    const isSearchResetting = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            isSearchResetting.current = true;
            setPage(1);
            fetchNotifications(search, 1, rowsPerPage);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (isSearchResetting.current) {
            isSearchResetting.current = false;
            return; // skip — search effect already fetched with page=1
        }
        fetchNotifications(search, page, rowsPerPage);
    }, [page, rowsPerPage]);

    // ── Save (add / edit) ──────────────────────────────────
    const handleSave = async (formData, mode) => {
        try {
            setSaving(true);
            const res =
                mode === "add"
                    ? await createNotification(formData)
                    : await updateNotification(formOpen._id, formData);

            if (!res?.success) throw new Error(res?.message);

            toast.success(mode === "add" ? "Notification created" : "Notification updated");
            setFormOpen(false);
            fetchNotifications(search, page, rowsPerPage);
        } catch (err) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────
    const handleDelete = async () => {
        try {
            const res = await deleteNotification(deleteTarget._id);
            if (res?.success) {
                toast.success("Notification deleted");
                fetchNotifications(search, page, rowsPerPage);
            } else {
                toast.error(res?.message || "Delete failed");
            }
        } catch {
            toast.error("Server error deleting notification");
        } finally {
            setDeleteTarget(null);
        }
    };

    // ── Edit Status (active / inactive) ──────────────────────────────────
    const handleToggleStatus = async (row) => {
        try {
            const res = await toggleNotificationStatus(
                row._id,
                !row.active
            );

            if (res?.success) {
                toast.success(
                    `Notification ${!row.active ? "activated" : "deactivated"} successfully`
                );

                setNotifications((prev) =>
                    prev.map((item) =>
                        item._id === row._id
                            ? { ...item, active: !item.active }
                            : item
                    )
                );
            } else {
                toast.error(res?.message || "Failed to update status");
            }
        } catch (err) {
            toast.error(err?.message || "Server error");
        }
    };

    // ── Columns ────────────────────────────────────────────
    const columns = [
        { label: "Title", accessor: "title" },
        {
            label: "Body",
            accessor: "body",
            render: (value, row) => {
                const expanded = expandedRows[row._id];
                const shouldShowToggle = value && value.length > 120;

                return (
                    <div className="max-w-[350px] whitespace-normal break-words">
                        <span title={value}>
                            {expanded || !shouldShowToggle
                                ? value
                                : `${value.slice(0, 120)}...`}
                        </span>

                        {shouldShowToggle && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRows((prev) => ({
                                        ...prev,
                                        [row._id]: !prev[row._id],
                                    }));
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-700 font-medium text-xs cursor-pointer"
                            >
                                {expanded ? "Less" : "More"}
                            </button>
                        )}
                    </div>
                );
            },
        },
        {
            label: "Color",
            accessor: "color",
            render: (val) => (
                <span
                    className="inline-block w-5 h-5 rounded border border-gray-200"
                    style={{ background: val || "#3B82F6" }}
                    title={val}
                />
            ),
        },
        {
            label: "From",
            accessor: "dateFrom",
            render: (val) => val ? new Date(val).toLocaleDateString("en-IN") : "—",
        },
        {
            label: "To",
            accessor: "dateTo",
            render: (val) => val ? new Date(val).toLocaleDateString("en-IN") : "—",
        },
        {
            label: "Status",
            accessor: "active",
            render: (_, row) => (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(row);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 cursor-pointer
                    ${row.active ? "bg-green-500" : "bg-gray-300"}
                `}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all duration-300
                        ${row.active ? "translate-x-5" : "translate-x-0.5"}
                    `}
                        />
                    </button>

                    <span
                        className={`text-xs font-semibold
                    ${row.active ? "text-green-600" : "text-gray-500"}
                `}
                    >
                        {row.active ? "Active" : "Inactive"}
                    </span>
                </div>
            ),
        },
        {
            label: "Actions",
            accessor: "actions",
            render: (_, row) => (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded whitespace-nowrap cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFormOpen(row);
                        }}
                    >
                        Edit
                    </button>
                    <button
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded whitespace-nowrap cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row);
                        }}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Notifications</h1>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="Search title, body..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <Search size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        className="sm:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-50 flex-shrink-0"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={() => setFormOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap"
                    >
                        <Plus size={16} /> Add Notification
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="sm:hidden pb-4 border-b border-gray-200">
                    <button
                        onClick={() => { setFormOpen(true); setMobileMenuOpen(false); }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex justify-center items-center gap-1"
                    >
                        <Plus size={16} /> Add Notification
                    </button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    Loading notifications...
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    No notifications found
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={notifications}
                                currentPage={page}
                                totalPages={pagination.totalPages}
                                totalRecords={pagination.total}
                                rowsPerPage={rowsPerPage}
                                onPageChange={setPage}
                                onRowsPerPageChange={(value) => {
                                    setRowsPerPage(value);
                                    setPage(1);
                                }}
                                footerLegend={[]}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <NotificationFormModal
                open={!!formOpen}
                onClose={() => setFormOpen(false)}
                onSubmit={handleSave}
                initialData={typeof formOpen === "object" ? formOpen : null}
                loading={saving}
            />

            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Notification"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default Notifications;