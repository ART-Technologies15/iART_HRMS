import React, { useEffect, useState } from "react";
import { Search, RefreshCcw } from "lucide-react";
import CustomTable from "../components/CustomTable";
import VerificationReviewModal from "../components/VerificationReviewModal";
import { getVerificationRequests, reviewPendingVerification, reviewAllPendingVerification } from "../api/authApi";
import { toast } from "react-toastify";

const TYPE_BADGE = {
    pan: "bg-blue-50 text-blue-700",
    aadhaar: "bg-violet-50 text-violet-700",
    bank: "bg-emerald-50 text-emerald-700",
};
const TYPE_LABEL = { pan: "PAN", aadhaar: "Aadhaar", bank: "Bank" };

const AdminPendingVerificationRequest = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await getVerificationRequests({ page, limit: rowsPerPage, search });
            if (res?.success) {
                setRequests(res.users);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalRecords(res.pagination?.total || 0);
            } else {
                toast.error(res?.message || "Failed to load verification requests");
            }
        } catch {
            toast.error("Server error while fetching verification requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, search]);

    const handleReview = async (id, payload) => {
        try {
            const res = await reviewPendingVerification(id, payload);
            if (res?.success) {
                toast.success(
                    payload.action === "approve"
                        ? `${TYPE_LABEL[payload.field]} approved`
                        : `${TYPE_LABEL[payload.field]} rejected`
                );

                // Refresh the modal's own data in place, and refetch the list
                setSelected((prev) =>
                    prev && prev._id === id
                        ? {
                            ...prev,
                            pendingVerification: {
                                ...prev.pendingVerification,
                                [payload.field]: { ...prev.pendingVerification[payload.field], status: payload.action === "approve" ? "approved" : "rejected" },
                            },
                        }
                        : prev
                );
                setSelected(null)
                fetchRequests();
            } else {
                toast.error(res?.message || "Review action failed");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Server error during review");
        }
    };

    const handleApproveAll = async (id) => {
        try {
            const res = await reviewAllPendingVerification(id);
            if (res?.success) {
                toast.success(res.message || "Approved");

                setSelected((prev) =>
                    prev && prev._id === id
                        ? {
                            ...prev,
                            pendingVerification: {
                                ...prev.pendingVerification,
                                ...Object.fromEntries(
                                    Object.entries(res.results || {}).map(([field, r]) => [
                                        field,
                                        {
                                            ...prev.pendingVerification[field],
                                            status: r.status === "approved" ? "approved" : "pending",
                                        },
                                    ])
                                ),
                            },
                        }
                        : prev
                );

                // Surface which specific fields were skipped, if any
                Object.entries(res.results || {}).forEach(([field, r]) => {
                    if (r.status === "skipped") toast.warn(`${TYPE_LABEL[field]}: ${r.message}`);
                });
                setSelected(null)
                fetchRequests();
            } else {
                toast.error(res?.message || "Approve all failed");
                if (res?.results) {
                    Object.entries(res.results).forEach(([field, r]) => {
                        if (r.status === "skipped") toast.warn(`${TYPE_LABEL[field]}: ${r.message}`);
                    });
                }
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Server error during bulk approval");
        }
    };

    const columns = [
        {
            label: "Name",
            accessor: "name",
            render: (_, row) => (
                <div className="min-w-[200px]">
                    <p className="text-sm font-semibold text-slate-800">{row.name}</p>
                    <span className="mt-1 inline-flex w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {row.employeeId}
                    </span>
                </div>
            ),
        },
        { label: "Email", accessor: "email" },
        { label: "Department", accessor: "department" },
        { label: "Role", accessor: "role", render: (v) => v?.toUpperCase() },
        {
            label: "Pending For",
            accessor: "pendingTypes",
            render: (_, row) => (
                <div className="flex flex-wrap gap-1">
                    {row.pendingTypes?.map((t) => (
                        <span key={t} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[t]}`}>
                            {TYPE_LABEL[t]}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            label: "User Created By",
            accessor: "createdBy",
            render: (_, row) => row.createdBy?.name || row.name,
        },
        {
            label: "Actions",
            accessor: "actions",
            render: (_, row) => (
                <button
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row);
                    }}
                >
                    Review
                </button>
            ),
        },
    ];

    const tableData = requests.map((u) => ({ ...u, actions: "" }));

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Documents KYC</h1>
                    <p className="text-sm text-slate-500">
                        {totalRecords} employee{totalRecords === 1 ? "" : "s"} waiting on review
                    </p>
                </div>
            </div>

            <div className="relative max-w-sm">
                <input
                    type="text"
                    placeholder="Search name, email, employee ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">Loading...</div>
            ) : tableData.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    No pending verification requests
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={tableData}
                                onRowClick={(row) => setSelected(row)}
                                footerLegend={[]}
                                currentPage={page}
                                totalPages={totalPages}
                                totalRecords={totalRecords}
                                rowsPerPage={rowsPerPage}
                                onPageChange={(p) => setPage(p)}
                                onRowsPerPageChange={(l) => {
                                    setRowsPerPage(l);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <VerificationReviewModal
                open={!!selected}
                onClose={() => setSelected(null)}
                requestUser={selected}
                onReview={handleReview}
                onApproveAll={handleApproveAll}
            />
        </div>
    );
};

export default AdminPendingVerificationRequest;