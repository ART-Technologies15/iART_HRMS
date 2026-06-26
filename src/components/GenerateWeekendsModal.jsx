// src/components/GenerateWeekendsModal.jsx
import React, { useState } from "react";
import { generateWeekends } from "../api/calendarApi";
import { toast } from "react-toastify";

const GenerateWeekendsModal = ({ year, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const res = await generateWeekends(year);
    setLoading(false);

    if (res?.success) {
      toast.success(`Weekends generated for ${year}`);
      onSuccess(); // refresh calendar in parent
      onClose();
    } else {
      toast.error(res?.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold text-[#344B7A] mb-3">
          Generate Weekends
        </h3>

        <p className="text-sm text-gray-600 mb-6">
          This will <b>overwrite existing weekend data</b> for the year{" "}
          <b>{year}</b>. Do you want to continue?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#4A6CF7] text-white hover:bg-[#395bdc]"
          >
            {loading ? "Processing..." : "Yes, Generate"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateWeekendsModal;
