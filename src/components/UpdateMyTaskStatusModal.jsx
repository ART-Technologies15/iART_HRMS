import React, { useEffect, useState } from "react";

const statusOptions = ["todo", "in_progress", "in_review", "blocked", "done", "cancelled"];

const UpdateMyTaskStatusModal = ({
  open,
  task,
  initialStatus = "todo",
  initialProgress = 0,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({ status: initialStatus, progress: initialProgress, hoursSpent: 0, remarks: "" });

  useEffect(() => {
    if (open) {
      setForm({ status: initialStatus || "todo", progress: initialProgress || 0, hoursSpent: 0, remarks: "" });
    }
  }, [open, initialStatus, initialProgress]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    onSave({
      status: form.status,
      progress: Number(form.progress || 0),
      hoursSpent: Number(form.hoursSpent || 0),
      remarks: form.remarks || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My task</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">Update my status</h2>
            {task?.title && <p className="mt-1 text-sm text-slate-500">{task.title}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">Close</button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Status</span>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              {statusOptions.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </select>
          </label>

          {/* <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Progress (%)</span>
            <input type="number" min={0} max={100} value={form.progress} onChange={(event) => setForm((prev) => ({ ...prev, progress: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Hours spent</span>
            <input type="number" min={0} step="0.5" value={form.hoursSpent} onChange={(event) => setForm((prev) => ({ ...prev, hoursSpent: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label> */}

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Remarks</span>
            <textarea rows={3} value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="sticky bottom-0 mt-5 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Save</button>
        </div>
      </form>
    </div>
  );
};

export default UpdateMyTaskStatusModal;