import React, { useEffect, useRef, useState } from "react";
import { X, UserCheck, UserX, Search, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { getAllUsers } from "../api/authApi";

const inputCls =
    "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const FieldLabel = ({ children, required }) => (
    <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {children}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
);

const today = () => new Date().toISOString().split("T")[0];

/**
 * mode: "assign" | "return"
 * asset: the asset row being acted on
 * Employee search is API-backed (debounced) rather than a client-side
 * filter over a prefetched list — no `employees` prop needed anymore.
 */
const AssetAssignModal = ({ open, onClose, onSubmit, mode = "assign", asset, loading = false }) => {
    const isAssign = mode === "assign";

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showEmployeeList, setShowEmployeeList] = useState(false);
    const [employeeResults, setEmployeeResults] = useState([]);
    const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

    const [assignedDate, setAssignedDate] = useState(today());
    const [expectedReturnDate, setExpectedReturnDate] = useState("");
    const [conditionAtAssignment, setConditionAtAssignment] = useState("Good");
    const [remarks, setRemarks] = useState("");

    const [returnedDate, setReturnedDate] = useState(today());
    const [conditionAtReturn, setConditionAtReturn] = useState("Good");
    const [returnRemarks, setReturnRemarks] = useState("");

    const employeeFieldRef = useRef(null);
    const searchDebounceRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setEmployeeSearch("");
        setSelectedEmployee(null);
        setShowEmployeeList(false);
        setEmployeeResults([]);
        setAssignedDate(today());
        setExpectedReturnDate("");
        setConditionAtAssignment("Good");
        setRemarks("");
        setReturnedDate(today());
        setConditionAtReturn("Good");
        setReturnRemarks("");
    }, [open, asset]);

    // Debounced API search as the user types. Runs with an empty query too
    // (after the debounce) so opening the dropdown shows a first page of
    // employees rather than nothing.
    useEffect(() => {
        if (!open || !isAssign) return;

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(async () => {
            try {
                setEmployeeSearchLoading(true);
                const res = await getAllUsers({
                    page: 1,
                    limit: 20,
                    search: employeeSearch.trim(),
                    role: "",
                    department: "",
                    designation: "",
                });
                if (res?.success) {
                    setEmployeeResults(res.users || []);
                }
            } catch {
                // Non-critical — the list just won't populate for this keystroke
            } finally {
                setEmployeeSearchLoading(false);
            }
        }, 400);

        return () => clearTimeout(searchDebounceRef.current);
    }, [employeeSearch, open, isAssign]);

    // Close the employee dropdown on any click outside the field
    useEffect(() => {
        if (!showEmployeeList) return;

        const handleClickOutside = (e) => {
            if (employeeFieldRef.current && !employeeFieldRef.current.contains(e.target)) {
                setShowEmployeeList(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmployeeList]);

    if (!open) return null;

    const handleSubmit = () => {
        if (isAssign) {
            if (!selectedEmployee) {
                toast.error("Please select an employee to assign this asset to.");
                return;
            }
            if (selectedEmployee.isActive === false) {
                toast.error("Inactive employees can't be assigned assets.");
                return;
            }
            onSubmit?.({
                employeeId: selectedEmployee._id,
                assignedDate,
                expectedReturnDate: expectedReturnDate || null,
                conditionAtAssignment,
                remarks: remarks.trim(),
            });
        } else {
            onSubmit?.({
                returnedDate,
                conditionAtReturn,
                returnRemarks: returnRemarks.trim(),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5" style={{ maxHeight: "90vh" }}>
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{isAssign ? "Assign Asset" : "Return Asset"}</h2>
                        <p className="text-xs text-slate-400">
                            {asset?.assetName} {asset?.assetCode ? `• ${asset.assetCode}` : ""}
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

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 text-sm">
                    {isAssign ? (
                        <>
                            <div className="relative" ref={employeeFieldRef}>
                                <FieldLabel required>Employee</FieldLabel>

                                {selectedEmployee ? (
                                    <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-800">{selectedEmployee.name}</p>
                                            <p className="truncate text-xs text-slate-400">{selectedEmployee.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedEmployee(null);
                                                setEmployeeSearch("");
                                            }}
                                            disabled={loading}
                                            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <input
                                                value={employeeSearch}
                                                onChange={(e) => {
                                                    setEmployeeSearch(e.target.value);
                                                    setShowEmployeeList(true);
                                                }}
                                                onFocus={() => setShowEmployeeList(true)}
                                                className={`${inputCls} pl-9`}
                                                placeholder="Search by name or email..."
                                                disabled={loading}
                                            />
                                            {employeeSearchLoading ? (
                                                <Loader2
                                                    size={15}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                                                />
                                            ) : (
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            )}
                                        </div>

                                        {showEmployeeList && (
                                            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                                {employeeSearchLoading && employeeResults.length === 0 ? (
                                                    <p className="px-3.5 py-2.5 text-xs text-slate-400">Searching...</p>
                                                ) : employeeResults.length === 0 ? (
                                                    <p className="px-3.5 py-2.5 text-xs text-slate-400">No matching employees</p>
                                                ) : (
                                                    employeeResults.map((emp) => {
                                                        const inactive = emp.isActive === false;
                                                        return (
                                                            <button
                                                                key={emp._id}
                                                                type="button"
                                                                disabled={inactive}
                                                                onClick={() => {
                                                                    if (inactive) return;
                                                                    setSelectedEmployee(emp);
                                                                    setShowEmployeeList(false);
                                                                }}
                                                                title={inactive ? "This employee is inactive and can't be assigned assets" : undefined}
                                                                className={`flex w-full flex-col items-start px-3.5 py-2 text-left ${inactive ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"
                                                                    }`}
                                                            >
                                                                <div className="flex w-full items-center justify-between">
                                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                                        {emp.name}

                                                                        {inactive && (
                                                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                                                                Inactive
                                                                            </span>
                                                                        )}
                                                                    </span>

                                                                    {emp.employeeId && (
                                                                        <span className="text-xs font-medium text-slate-500">
                                                                            #{emp.employeeId}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <span className="mt-0.5 text-xs text-slate-500">
                                                                    {emp.email}
                                                                </span>

                                                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                                    {emp.role && (
                                                                        <span>
                                                                            {emp.role.replace(/\b\w/g, (char) => char.toUpperCase())}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <FieldLabel required>Assigned Date</FieldLabel>
                                    <input
                                        type="date"
                                        value={assignedDate}
                                        onChange={(e) => setAssignedDate(e.target.value)}
                                        className={inputCls}
                                        disabled={loading}
                                        max={today()}
                                    />
                                </div>

                                {/* <div>
                                    <FieldLabel>Expected Return Date</FieldLabel>
                                    <input
                                        type="date"
                                        value={expectedReturnDate}
                                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                                        className={inputCls}
                                        disabled={loading}
                                        min={assignedDate}
                                    />
                                </div> */}

                                <div>
                                    <FieldLabel>Condition at Assignment</FieldLabel>
                                    <select
                                        value={conditionAtAssignment}
                                        onChange={(e) => setConditionAtAssignment(e.target.value)}
                                        className={inputCls}
                                        disabled={loading}
                                    >
                                        {["New", "Good", "Fair", "Damaged"].map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Remarks</FieldLabel>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className={`${inputCls} min-h-20 resize-none`}
                                    placeholder="Any notes about this assignment"
                                    disabled={loading}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                <p className="text-xs font-medium text-slate-400">Currently assigned to</p>
                                <p className="text-sm font-medium text-slate-800">
                                    {asset?.currentAssignedTo?.name || asset?.currentAssignedTo?.email || "—"}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <FieldLabel required>Returned Date</FieldLabel>
                                    <input
                                        type="date"
                                        value={returnedDate}
                                        onChange={(e) => setReturnedDate(e.target.value)}
                                        className={inputCls}
                                        disabled={loading}
                                        max={today()}
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Condition at Return</FieldLabel>
                                    <select
                                        value={conditionAtReturn}
                                        onChange={(e) => setConditionAtReturn(e.target.value)}
                                        className={inputCls}
                                        disabled={loading}
                                    >
                                        {["Good", "Fair", "Damaged", "Lost"].map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Return Remarks</FieldLabel>
                                <textarea
                                    value={returnRemarks}
                                    onChange={(e) => setReturnRemarks(e.target.value)}
                                    className={`${inputCls} min-h-20 resize-none`}
                                    placeholder="Any notes about the condition or return"
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}
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
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${isAssign ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                    >
                        {isAssign ? <UserCheck size={15} /> : <UserX size={15} />}
                        {loading ? "Saving..." : isAssign ? "Assign Asset" : "Confirm Return"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetAssignModal;