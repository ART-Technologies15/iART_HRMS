import React, { useEffect, useState } from "react";
import { X, Package, Info } from "lucide-react";
import { toast } from "react-toastify";

const CATEGORY_SUGGESTIONS = [
    "Laptop",
    "Laptop Mac",
    "CPU",
    "CPU Mac",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Headset",
    "Mobile",
    "SIM",
    "Cable",
    "Furniture",
    "Other",
];

// "Assigned" is intentionally excluded here — that status is only ever set
// via the dedicated Assign/Return flow so an assignment record always
// exists alongside it.
const MANUAL_STATUS_OPTIONS = ["Available", "Repair", "Lost", "Scrapped"];
const CONDITION_OPTIONS = ["New", "Good", "Fair", "Damaged", "Repair", "Lost", "Scrapped"];

const defaultForm = {
    assetCode: "",
    assetName: "",
    category: "",
    brand: "",
    model: "",
    serialNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    warrantyExpiry: "",
    vendor: "",
    condition: "New",
    status: "Available",
    notes: "",
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

const SectionHeader = ({ icon: Icon, title, hint }) => (
    <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <Icon size={15} />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {hint && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">{hint}</span>
        )}
    </div>
);

const toDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

const AssetFormModal = ({ open, onClose, onSubmit, initialData, loading = false }) => {
    const isEdit = !!initialData;
    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        if (!open) return;

        if (isEdit) {
            setForm({
                ...defaultForm,
                ...initialData,
                purchaseDate: toDateInput(initialData.purchaseDate),
                warrantyExpiry: toDateInput(initialData.warrantyExpiry),
                purchasePrice: initialData.purchasePrice ?? "",
                // If the asset is currently Assigned, keep it out of the manual
                // dropdown's control — we still show it as a disabled/read-only
                // badge below instead of letting it be edited directly here.
            });
        } else {
            setForm(defaultForm);
        }
    }, [open, isEdit, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (!form.assetCode.trim()) {
            toast.error("Asset code is required.");
            return false;
        }
        if (!form.assetName.trim()) {
            toast.error("Asset name is required.");
            return false;
        }
        if (!form.category.trim()) {
            toast.error("Please select or enter a category.");
            return false;
        }
        if (!form.serialNumber.trim()) {
            toast.error("Serial number is required.");
            return false;
        }
        if (!form.purchaseDate) {
            toast.error("Purchase date is required.");
            return false;
        }
        if (form.purchasePrice === "") {
            toast.error("Purchase price is required.");
            return false;
        }
        if (Number(form.purchasePrice) < 0) {
            toast.error("Purchase price cannot be negative.");
            return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const payload = {
            assetCode: form.assetCode.trim(),
            assetName: form.assetName.trim(),
            category: form.category.trim(),
            brand: form.brand.trim(),
            model: form.model.trim(),
            serialNumber: form.serialNumber.trim(),
            purchaseDate: form.purchaseDate || null,
            purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
            warrantyExpiry: form.warrantyExpiry || null,
            vendor: form.vendor.trim(),
            condition: form.condition,
            notes: form.notes.trim(),
            isActive: form.isActive,
        };

        // Only allow status changes among the non-"Assigned" states here.
        // Currently-assigned assets keep their status untouched from this form.
        if (form.status !== "Assigned") {
            payload.status = form.status;
        }

        onSubmit?.(payload, isEdit ? "edit" : "add");
    };

    if (!open) return null;

    const isCurrentlyAssigned = isEdit && initialData?.status === "Assigned";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5" style={{ maxHeight: "90vh" }}>
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Asset" : "Add New Asset"}</h2>
                        <p className="text-xs text-slate-400">
                            {isEdit ? "Update asset details" : "Register a new asset in inventory"}
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

                <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 text-sm">
                    {isCurrentlyAssigned && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-700">
                            <Info size={15} className="mt-0.5 shrink-0" />
                            <span>
                                This asset is currently assigned. Its status stays "Assigned" until it's returned via the Return
                                action on the assets list.
                            </span>
                        </div>
                    )}

                    <section>
                        <SectionHeader icon={Package} title="Identification" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <FieldLabel required>Asset Code</FieldLabel>
                                <input
                                    name="assetCode"
                                    value={form.assetCode}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. AST-0001"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel required>Asset Name</FieldLabel>
                                <input
                                    name="assetName"
                                    value={form.assetName}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Dell Latitude 5420"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel required>Category</FieldLabel>
                                <input
                                    name="category"
                                    list="category-suggestions"
                                    value={form.category}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="Select or type a category"
                                    disabled={loading}
                                />
                                <datalist id="category-suggestions">
                                    {CATEGORY_SUGGESTIONS.map((c) => (
                                        <option key={c} value={c} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <FieldLabel required>Serial Number</FieldLabel>
                                <input
                                    name="serialNumber"
                                    value={form.serialNumber}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="Enter serial number"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel>Brand</FieldLabel>
                                <input
                                    name="brand"
                                    value={form.brand}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Dell"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel>Model</FieldLabel>
                                <input
                                    name="model"
                                    value={form.model}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Latitude 5420"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-100 pt-6">
                        <SectionHeader icon={Package} title="Purchase & Warranty" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <FieldLabel required>Purchase Date</FieldLabel>
                                <input
                                    type="date"
                                    name="purchaseDate"
                                    value={form.purchaseDate}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled={loading}
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            <div>
                                <FieldLabel required>Purchase Price</FieldLabel>
                                <input
                                    type="number"
                                    min="0"
                                    name="purchasePrice"
                                    value={form.purchasePrice}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. 45000"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel>Warranty Expiry</FieldLabel>
                                <input
                                    type="date"
                                    name="warrantyExpiry"
                                    value={form.warrantyExpiry}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <FieldLabel>Vendor</FieldLabel>
                                <input
                                    name="vendor"
                                    value={form.vendor}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Amazon Business"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-100 pt-6">
                        <SectionHeader icon={Package} title="Status & Condition" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <FieldLabel>Status</FieldLabel>
                                <select
                                    name="status"
                                    value={isCurrentlyAssigned ? "Assigned" : form.status}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled={loading || isCurrentlyAssigned}
                                >
                                    {isCurrentlyAssigned && <option value="Assigned">Assigned</option>}
                                    {MANUAL_STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <FieldLabel>Condition</FieldLabel>
                                <select
                                    name="condition"
                                    value={form.condition}
                                    onChange={handleChange}
                                    className={inputCls}
                                    disabled={loading}
                                >
                                    {CONDITION_OPTIONS.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <FieldLabel>Notes</FieldLabel>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    className={`${inputCls} min-h-20 resize-none`}
                                    placeholder="Any additional notes about this asset"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Asset"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetFormModal;