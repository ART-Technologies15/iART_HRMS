import React from "react";
import { X, AlertTriangle } from "lucide-react";

const ConfirmDeleteModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-lg space-y-5 animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {title || "Confirm Delete"}
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 text-red-600">
          <AlertTriangle size={22} />
          <p className="text-sm leading-relaxed">
            {message || "This action cannot be undone. Are you sure you want to proceed?"}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
