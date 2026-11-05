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
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 px-4">
      <div className="bg-white dark:bg-[#131316] border border-transparent dark:border-[#33333a] rounded-lg w-full max-w-sm p-6 shadow-lg dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] space-y-5 animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">
            {title || "Confirm Delete"}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200">
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
            className="px-4 py-2 border border-gray-300 dark:border-[#33333a] rounded hover:bg-gray-100 dark:hover:bg-[#1e1e23] text-gray-700 dark:text-zinc-200"
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
