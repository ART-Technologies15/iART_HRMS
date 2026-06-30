import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";

const defaultForm = {
    title: "",
    body: "",
    color: "#3B82F6",
    dateFrom: "",
    dateTo: "",
    isActive: true,
};

const inputCls =
    "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const FieldLabel = ({ children, required }) => (
    <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {children}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
);

const NotificationFormModal = ({ open, onClose, onSubmit, initialData, loading = false }) => {
    const isEdit = !!initialData;
    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        if (!open) return;
        if (isEdit) {
            setForm({
                ...defaultForm,
                ...initialData,
                dateFrom: initialData.dateFrom
                    ? new Date(initialData.dateFrom).toISOString().split("T")[0]
                    : "",
                dateTo: initialData.dateTo
                    ? new Date(initialData.dateTo).toISOString().split("T")[0]
                    : "",
            });
        } else {
            setForm(defaultForm);
        }
    }, [open, isEdit, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => {
            const updated = {
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            };

            // If From Date becomes later than To Date, clear To Date
            if (
                name === "dateFrom" &&
                updated.dateTo &&
                updated.dateFrom > updated.dateTo
            ) {
                updated.dateTo = "";
            }

            // If To Date becomes earlier than From Date, clear From Date
            if (
                name === "dateTo" &&
                updated.dateFrom &&
                updated.dateTo < updated.dateFrom
            ) {
                updated.dateFrom = "";
            }

            return updated;
        });
    };

    const handleSubmit = () => {
        if (!form.title.trim() || !form.body.trim() || !form.dateFrom || !form.dateTo) {
            toast.warning("Title, body, from date and to date are required.");
            return;
        }
        onSubmit?.(form, isEdit ? "edit" : "add");
    };

    if (!open) return null;

    const today = new Date().toISOString().split("T")[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div
                className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
                style={{ maxHeight: "90vh" }}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {isEdit ? "Edit Notification" : "Add Notification"}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {isEdit ? "Update notification details" : "Create a new notification"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    <div>
                        <FieldLabel required>Title</FieldLabel>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            className={inputCls}
                            placeholder="Notification title"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <FieldLabel required>Body</FieldLabel>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            className={`${inputCls} min-h-24 resize-none`}
                            placeholder="Notification message"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <FieldLabel required>From Date</FieldLabel>
                            <input
                                type="date"
                                name="dateFrom"
                                value={form.dateFrom}
                                onChange={handleChange}
                                min={today}
                                max={form.dateTo || undefined}
                                className={inputCls}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <FieldLabel required>To Date</FieldLabel>
                            <input
                                type="date"
                                name="dateTo"
                                value={form.dateTo}
                                onChange={handleChange}
                                min={form.dateFrom || today}
                                className={inputCls}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Priority Color</FieldLabel>

                        <div className="flex flex-wrap gap-4">
                            {[
                                { name: "Red", value: "#FF0000" },
                                { name: "Yellow", value: "#FFFF00" },
                                { name: "Orange", value: "#FF9900" },
                            ].map((color) => (
                                <label
                                    key={color.value}
                                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition
                    ${form.color === color.value
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="color"
                                        value={color.value}
                                        checked={form.color === color.value}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="h-4 w-4 text-indigo-600"
                                    />

                                    <span
                                        className="h-5 w-5 rounded-full border border-slate-300"
                                        style={{ backgroundColor: color.value }}
                                    />

                                    <span className="text-sm font-medium text-slate-700">
                                        {color.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? "Saving..." : isEdit ? "Save Changes" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationFormModal;