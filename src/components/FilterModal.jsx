import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const FilterModal = ({
  open,
  onClose,
  role,
  initialFilters,
  onApply,
  employees,
}) => {
  const [filters, setFilters] = useState(initialFilters);

  // Reset local state when modal opens
  useEffect(() => {
    if (open) setFilters(initialFilters);
  }, [open, initialFilters]);

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReset = () => {
    const cleared = { employee: "", fromDate: "", toDate: "", reason: "" };
    setFilters(cleared);
    onApply(cleared);
    onClose();
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Filter Options</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {role === "admin" && (
            <div>
              <label className="block mb-1 text-sm font-medium">Employee</label>
              <select
                name="employee"
                value={filters.employee}
                onChange={handleChange}
                className="border rounded w-full p-2"
              >
                <option value="">All Employees</option>
                {employees.map((emp, i) => (
                  <option key={i} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-1 text-sm font-medium">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleChange}
              className="border rounded w-full p-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleChange}
              className="border rounded w-full p-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Reason</label>
            <input
              type="text"
              name="reason"
              value={filters.reason}
              onChange={handleChange}
              placeholder="Search by reason..."
              className="border rounded w-full p-2"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
