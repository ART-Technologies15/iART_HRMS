import React, { useState } from "react";
import { MoreVertical } from "lucide-react";

const LeaveActionMenu = ({ row, role, onCancel, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const canCancel = role === "user" && row.status === "pending";
  const canApproveOrReject = role === "admin" && row.status === "pending";

  if (!canCancel && !canApproveOrReject) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)}>
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-32 bg-white shadow-md rounded border text-sm z-20">
          {canCancel && (
            <button
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              onClick={() => {
                onCancel(row._id);
                setOpen(false);
              }}
            >
              Cancel
            </button>
          )}

          {canApproveOrReject && (
            <>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => {
                  onApprove(row._id);
                  setOpen(false);
                }}
              >
                Approve
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => {
                  onReject(row);
                  setOpen(false);
                }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveActionMenu;
