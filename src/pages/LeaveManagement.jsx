import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  applyLeave,
  getMyLeaves,
  getLeavesForAdmin,
  cancelLeave,
  reapplyLeave,
  adminApproveLeave,
  adminRejectLeave,
  editLeave, // ← Add this
  adminMarkPending,
} from "../api/leaveApi";
import CustomTable from "../components/CustomTable";
import RejectModal from "../components/RejectModal";
import FilterModal from "../components/FilterModal";
import LeaveFormModal from "../components/LeaveForm";
import {
  Plus,
  X,
  Filter,
  CalendarDays,
  Check,
  XCircle,
  Pencil,
  Ban,
} from "lucide-react";
import { toast } from "react-toastify";

// helpers
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};
const chip = (text, color) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
    {text}
  </span>
);

const LeavesPage = () => {
  const { user } = useAuth();
  const role = user?.role || "user";

  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, leave: null });

  const [filters, setFilters] = useState({
    employee: "",
    fromDate: "",
    toDate: "",
    reason: "",
    status: "",
  });
  const leaveBalance = user?.leaveInfo?.balance ?? 0;
  const lop = user?.leaveInfo?.extraLOP ?? 0;
  const lastUpdated = user?.leaveInfo?.updatedOn
    ? new Date(user.leaveInfo.updatedOn).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "-";

  // fetch
  const fetchLeaves = async () => {
    try {
      if (role === "admin") {
        const res = await getLeavesForAdmin({});
        setLeaves(res.leaves || []);
      } else {
        const params = {};
        if (filters.fromDate) params.startDate = filters.fromDate;
        if (filters.toDate) params.endDate = filters.toDate;

        const res = await getMyLeaves(user._id, params);
        setLeaves(res.leaves || []);
      }
    } catch (err) {
      console.error("aaha hai fassad di jaad", err);
      toast.error(err?.message || "Failed to fetch leaves");
      setLeaves([]);
    }
  };

  useEffect(() => {
    if (!user) return; // don't call the API until user exists
    fetchLeaves();
  }, [user, role, filters.fromDate, filters.toDate]);

  // actions
  const handleApply = async (payload) => {
    try {
      const res = await applyLeave(payload);

      if (!res?.success) {
        toast.error(res?.message || "Apply failed");
        return;
      }

      toast.success(res?.message || "Leave applied");
      setShowForm(false);
      await fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Apply failed");
    }
  };

  const handleEditOpen = (leave) => {
    setEditingLeave(leave);
    setShowForm(true);
  };
  // USER: update leave
  const handleUpdate = async (payload) => {
    try {
      const res = await editLeave(editingLeave._id, {
        userId: user._id,
        reason: payload.reason,
        leaveDays: payload.leaveDays,
      });

      if (!res?.success) return toast.error(res?.message || "Update failed");

      toast.success(res?.message || "Leave updated");
      setEditingLeave(null);
      setShowForm(false);
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Update failed");
    }
  };

  // USER: cancel
  const handleCancel = async (leave) => {
    try {
      const res = await cancelLeave(leave._id, user._id);

      if (!res?.success) return toast.error(res?.message || "Cancel failed");

      toast.success(res?.message || "Leave cancelled");
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Cancel failed");
    }
  };

  // USER: reapply
  const handleReapply = async (leave) => {
    try {
      const res = await reapplyLeave(leave._id, user._id);

      if (!res?.success) return toast.error(res?.message || "Reapply failed");

      toast.success(res?.message || "Leave moved back to pending");
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Reapply failed");
    }
  };

  // ADMIN: approve
  const handleApprove = async (leave) => {
    try {
      const res = await adminApproveLeave(leave._id, user._id);

      if (!res?.success) return toast.error(res?.message || "Approve failed");

      toast.success(res?.message || "Leave approved");
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Approve failed");
    }
  };

  // ADMIN: reject
  const handleReject = async (leave, reason) => {
    try {
      const res = await adminRejectLeave(leave._id, user._id, reason);

      if (!res?.success) return toast.error(res?.message || "Reject failed");

      toast.success(res?.message || "Leave rejected");
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Reject failed");
    }
  };

  // ADMIN: mark pending again
  const handleMarkPending = async (leave) => {
    try {
      const res = await adminMarkPending(leave._id, user._id);

      if (!res?.success) return toast.error(res?.message || "Update failed");

      toast.success(res?.message || "Leave moved to pending");
      fetchLeaves();
    } catch (e) {
      toast.error(e?.message || "Update failed");
    }
  };

  // client filters
  const filteredLeaves = leaves.filter((l) => {
    if (
      role === "admin" &&
      filters.employee &&
      l.userId?.name !== filters.employee
    ) {
      return false;
    }
    if (
      filters.reason &&
      !l.reason?.toLowerCase().includes(filters.reason.toLowerCase())
    ) {
      return false;
    }
    if (filters.status && l.status !== filters.status) return false;

    if (filters.fromDate || filters.toDate) {
      const first = l.leaveDays?.[0]?.date
        ? new Date(l.leaveDays[0].date)
        : null;
      if (filters.fromDate && first && first < new Date(filters.fromDate))
        return false;
      if (filters.toDate && first && first > new Date(filters.toDate))
        return false;
    }
    return true;
  });

  const employees =
    role === "admin"
      ? [...new Set(leaves.map((l) => l.userId?.name).filter(Boolean))]
      : [];

  // table columns
  const columns = useMemo(() => {
    const base = [
      ...(role === "admin"
        ? [
          {
            id: "employee",
            label: "Employee",
            accessor: "userId.name", // ✅ dot-path
            render: (_, row) => (
              <span className="font-medium">{row?.userId?.name ?? "-"}</span>
            ),
          },
        ]
        : []),

      {
        id: "dates",
        label: "Dates",
        accessor: "leaveDays", // ✅ raw array passed into render
        render: (value) => (
          <div className="text-sm leading-5">
            {(value ?? []).map((d, i) => (
              <div key={i}>
                {fmtDate(d?.date)}{" "}
                <span className="text-xs text-gray-500">
                  ({d?.type === "half" ? "Half" : "Full"})
                </span>
              </div>
            ))}
          </div>
        ),
      },

      {
        id: "reason",
        label: "Reason",
        accessor: "reason",
        render: (value) => (
          <span className="text-sm text-gray-700">{value ?? "-"}</span>
        ),
      },

      {
        id: "status",
        label: "Status",
        accessor: "status",
        render: (value) => {
          if (value === "approved")
            return chip("Approved", "bg-green-100 text-green-700");
          if (value === "pending")
            return chip("Pending", "bg-amber-100 text-amber-700");
          if (value === "rejected")
            return chip("Rejected", "bg-rose-100 text-rose-700");
          if (value === "cancelled")
            return chip("Cancelled", "bg-gray-100 text-gray-600");
          return "-";
        },
      },

      {
        id: "Rejection reason",
        label: "Rejection Reason",
        accessor: "rejectionReason",
        render: (value, row) => {
          const status = row.status; // Access the status from the full row
          if (status !== "rejected") {
            return <span className="text-sm text-gray-700">-</span>;
          }
          return <span className="text-sm text-gray-700">{value ?? "-"}</span>;
        },
      },

      {
        id: "actions",
        label: "Actions",
        accessor: "_id",
        render: (_, row) => {
          if (row.status === "approved") {
            return <span className="text-gray-400">-</span>;
          }

          const isUser = role !== "admin";
          const isPending = row.status === "pending";

          // USER CONTROLS
          if (isUser) {
            return (
              <div className="flex gap-2">
                {/* Edit Button - only for pending & owner */}
                {isPending && isUser && (
                  <button
                    onClick={() => handleEditOpen(row)}
                    className="px-2 py-1 text-xs rounded border hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}

                {/* Cancel Button - if not cancelled or rejected */}
                {row.status !== "cancelled" && row.status !== "rejected" && (
                  <button
                    onClick={() => handleCancel(row)}
                    className="px-2 py-1 text-xs rounded border hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Ban size={14} /> Cancel
                  </button>
                )}

                {/* Reapply Button - only if cancelled */}
                {row.status === "cancelled" && (
                  <button
                    onClick={() => handleReapply(row)}
                    className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                  >
                    <Check size={14} /> Reapply
                  </button>
                )}
              </div>
            );
          }

          // ADMIN CONTROLS
          return (
            <div className="flex gap-2">
              {row.status !== "cancelled" && row.status !== "approved" && (
                <button
                  onClick={() => handleApprove(row)}
                  className="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                >
                  <Check size={14} /> Approve
                </button>
              )}

              {row.status !== "cancelled" && row.status !== "rejected" && (
                <button
                  onClick={() => setRejectModal({ open: true, leave: row })}
                  className="px-2 py-1 text-xs rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
                >
                  <XCircle size={14} /> Reject
                </button>
              )}

              {(row.status === "approved" || row.status === "rejected") && (
                <button
                  onClick={() => handleMarkPending(row)}
                  className="px-2 py-1 text-xs rounded border bg-orange-300 hover:bg-orange-400 flex items-center gap-1"
                >
                  <CalendarDays size={14} /> Pending
                </button>
              )}
            </div>
          );
        },
      },
    ];

    return base;
  }, [role]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Leave Management</h1>

        <div className="flex gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilter(true)}
            className="border px-4 py-2 rounded hover:bg-gray-100 flex items-center gap-2"
          >
            <Filter size={18} />
            Filter
          </button>

          {/* Apply Leave Button (User only) */}
          {role !== "admin" && (
            <button
              onClick={() => {
                setEditingLeave(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              {showForm ? <X size={18} /> : <Plus size={18} />}
              {showForm ? "Close Form" : "Apply Leave"}
            </button>
          )}
        </div>
      </div>

      {/* Form Modal: Apply or Edit (User only) */}
      {showForm && (
        <LeaveFormModal
          title={editingLeave ? "Edit Leave" : "Apply Leave"}
          initialValues={
            editingLeave
              ? {
                reason: editingLeave.reason,
                leaveDays: editingLeave.leaveDays?.map((d) => ({
                  date: d.date?.slice(0, 10), // YYYY-MM-DD
                  type: d.type, // 'full' | 'half'
                })),
              }
              : undefined
          }
          currentUserId={user._id}
          onClose={() => {
            setEditingLeave(null);
            setShowForm(false);
          }}
          onSubmit={async (payload) => {
            if (editingLeave) {
              await handleUpdate(payload);
            } else {
              await handleApply(payload);
            }
          }}
        />
      )}

      {role !== "admin" && (
        <div className="flex flex-row gap-4">
          <div className="bg-amber-100 rounded-xl shadow border p-4 w-full max-w-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Leave Balance</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {leaveBalance}
                </p>
              </div>
              <div className="text-xs text-gray-500 text-right">
                Last updated <br /> {lastUpdated}
              </div>
            </div>
          </div>

          <div className="bg-amber-100 rounded-xl shadow border p-4 w-full max-w-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">LOP (Previous Month)</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {lop}
                </p>
              </div>
              <div className="text-xs text-gray-500 text-right">
                Last updated <br /> {lastUpdated}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Table */}
      <CustomTable
        columns={columns}
        data={filteredLeaves}
        defaultRowsPerPage={10}
      />

      {/* Reject Modal */}
      {rejectModal.open && (
        <RejectModal
          leave={rejectModal.leave}
          onClose={() => setRejectModal({ open: false, leave: null })}
          onSubmit={async (reason) => {
            await handleReject(rejectModal.leave, reason);
            setRejectModal({ open: false, leave: null });
          }}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        role={role}
        initialFilters={filters}
        onApply={setFilters}
        employees={employees}
      />
    </div>
  );
};

export default LeavesPage;
