import React, { useState } from "react";
import { MoreVertical } from "lucide-react";

const LeaveActionMenu = ({ row, role, onCancel, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const canCancel = role === "user" && row.status === "pending";
  const canApproveOrReject = role === "admin" && row.status === "pending";

  if (!canCancel && !canApproveOrReject) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#1e1e23] text-gray-600 dark:text-zinc-300">
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#131316] shadow-md dark:shadow-[0_10px_25px_rgba(0,0,0,0.6)] rounded border border-gray-200 dark:border-[#33333a] text-sm z-20 overflow-hidden">
          {canCancel && (
            <button
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1e1e23] text-gray-700 dark:text-zinc-200"
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
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1e1e23] text-gray-700 dark:text-zinc-200"
                onClick={() => {
                  onApprove(row._id);
                  setOpen(false);
                }}
              >
                Approve
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1e1e23] text-gray-700 dark:text-zinc-200"
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
