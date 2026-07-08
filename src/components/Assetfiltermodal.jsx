import React, { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";

const STATUS_OPTIONS = ["Available", "Assigned", "Repair", "Lost", "Scrapped"];
const CONDITION_OPTIONS = ["New", "Good", "Fair", "Damaged", "Repair", "Lost", "Scrapped"];

const emptyFilters = { category: "", status: "", condition: "" };

const AssetFilterModal = ({ open, onClose, initialFilters, onApply, options }) => {
  const [local, setLocal] = useState(emptyFilters);

  useEffect(() => {
    if (open) setLocal({ ...emptyFilters, ...(initialFilters || {}) });
  }, [open, initialFilters]);

  if (!open) return null;

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(emptyFilters);
    onApply(emptyFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">Filter Assets</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Category</label>
            <select
              value={local.category}
              onChange={(e) => setLocal((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Categories</option>
              {(options?.categories || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={local.status}
              onChange={(e) => setLocal((p) => ({ ...p, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Condition</label>
            <select
              value={local.condition}
              onChange={(e) => setLocal((p) => ({ ...p, condition: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Conditions</option>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetFilterModal;