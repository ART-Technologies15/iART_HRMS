import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const AdminUserFilterModal = ({
  open,
  onClose,
  initialFilters = { designation: "", role: "", department: "" },
  onApply,
  options = { roles: [], designations: [], departments: [] },
}) => {
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    if (open) setFilters(initialFilters);
  }, [open, initialFilters]);

  const handleChange = (e) => {
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleReset = () => {
    const cleared = { designation: "", role: "", department: "" };
    setFilters(cleared);
    onApply?.(cleared);
    onClose?.();
  };

  const handleApply = () => {
    onApply?.(filters);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-semibold">Filter Users</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Designation</label>
            <select
              name="designation"
              value={filters.designation}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All</option>
              {options.designations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={filters.role}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All</option>
              {options.roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All</option>
              {options.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 py-3 border-t flex justify-between">
          <button onClick={handleReset} className="px-4 py-2 border rounded-md hover:bg-gray-50">
            Reset
          </button>
          <button onClick={handleApply} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserFilterModal;
