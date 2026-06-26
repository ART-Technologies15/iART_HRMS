import React, { useState } from "react";

const RejectModal = ({ leave, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold">Reject Leave</h2>
        <p className="text-sm text-gray-600">
          Leave type: <b>{leave.leaveCategory}</b><br />
          Reason: {leave.reason}
        </p>

        <textarea
          className="border rounded w-full p-2 text-sm"
          rows={3}
          placeholder="Enter rejection reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-1 bg-red-600 text-white rounded"
            onClick={() => onSubmit(reason)}
            disabled={!reason.trim()}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
