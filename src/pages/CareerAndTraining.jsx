import React, { useEffect, useRef, useState } from "react";
import {
    Search,
    Menu,
    Plus,
    X,
    Pencil,
    Trash2,
    Eye,
    XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import CustomTable from "../components/CustomTable";
import {
    getWebsiteOpportunities,
    createCareerPost,
    updateCareerPost,
    closeCareerPost,
} from "../api/authApi";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { useNavigate } from "react-router-dom";

// =====================================================================
// Tabs
// =====================================================================

const TABS = [
    { key: "training", label: "Training" },
    { key: "internship", label: "Internship" },
    { key: "career", label: "Career" },
];

const TAB_CONFIG = {
    training: { apiType: "training", opportunityType: null },
    internship: { apiType: "internship", opportunityType: "internship" },
    career: { apiType: "career", opportunityType: "job" },
};

const CAREER_STATUS_OPTIONS = ["draft", "published", "closed", "archived"];
const TRAINING_STATUS_OPTIONS = [
    "new",
    "contacted",
    "under-review",
    "approved",
    "rejected",
    "completed",
];

// =====================================================================
// Helpers
// =====================================================================

const STATUS_STYLES = {
    draft: "bg-slate-100 text-slate-600",
    published: "bg-green-50 text-green-700",
    closed: "bg-red-50 text-red-700",
    archived: "bg-slate-100 text-slate-500",
    new: "bg-blue-50 text-blue-700",
    contacted: "bg-amber-50 text-amber-700",
    "under-review": "bg-purple-50 text-purple-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    completed: "bg-slate-100 text-slate-600",
};

const StatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
            }`}
    >
        {status ? status.replace(/-/g, " ") : "-"}
    </span>
);

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "-";

const formatSalary = (salary) => {
    if (!salary) return "-";
    if (salary.displayText) return salary.displayText;
    if (salary.min || salary.max) {
        const min = salary.min ? `₹${salary.min.toLocaleString("en-IN")}` : "";
        const max = salary.max ? `₹${salary.max.toLocaleString("en-IN")}` : "";
        return `${min}${min && max ? " - " : ""}${max}${salary.period ? `/${salary.period}` : ""
            }`;
    }
    return "-";
};

const formatDuration = (duration) => {
    if (!duration || !duration.value) return "-";
    return `${duration.value} ${duration.unit}`;
};

// =====================================================================
// Multi-item list input (responsibilities / requirements)
// =====================================================================

const MultiListInput = ({ label, items, onChange, placeholder }) => {
    const [draft, setDraft] = useState("");

    const addItem = () => {
        const value = draft.trim();
        if (!value) return;
        if (items.includes(value)) {
            toast.info("Already added");
            return;
        }
        onChange([...items, value]);
        setDraft("");
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addItem();
        }
    };

    return (
        <div className="col-span-2">
            <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>

            {items.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                    {items.map((item, idx) => (
                        <li
                            key={idx}
                            className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                        >
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                                {idx + 1}
                            </span>
                            <span className="min-w-0 flex-1 break-words">{item}</span>
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="mt-0.5 flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                title="Remove"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                    <Plus size={14} />
                    Add
                </button>
            </div>
        </div>
    );
};

// =====================================================================
// Skills tag input
// =====================================================================

const SkillsInput = ({ skills, onChange }) => {
    const [draft, setDraft] = useState("");

    const addSkill = () => {
        const value = draft.trim();
        if (!value) return;
        if (skills.map((s) => s.toLowerCase()).includes(value.toLowerCase())) {
            toast.info("Skill already added");
            return;
        }
        onChange([...skills, value]);
        setDraft("");
    };

    const removeSkill = (index) => {
        onChange(skills.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSkill();
        }
        if (e.key === "Backspace" && !draft && skills.length > 0) {
            removeSkill(skills.length - 1);
        }
    };

    return (
        <div className="col-span-2">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Skills</p>

            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-400">
                {skills.map((skill, idx) => (
                    <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                        {skill}
                        <button
                            type="button"
                            onClick={() => removeSkill(idx)}
                            className="rounded-full p-0.5 hover:bg-blue-100"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addSkill}
                    placeholder={skills.length === 0 ? "Type a skill and press Enter" : "Add more..."}
                    className="min-w-[120px] flex-1 border-0 bg-transparent py-1 text-sm outline-none focus:ring-0"
                />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">Press Enter or comma to add</p>
        </div>
    );
};

// =====================================================================
// Main page
// =====================================================================

export const CareerAndTraining = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("training");

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState("");
    const [categoryInput, setCategoryInput] = useState("");
    const [subCategoryInput, setSubCategoryInput] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");

    const [status, setStatus] = useState("");

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [openingModal, setOpeningModal] = useState(null);

    const [closeTarget, setCloseTarget] = useState(null);
    const [closing, setClosing] = useState(false);

    const searchDebounceRef = useRef(null);
    const categoryDebounceRef = useRef(null);
    const subCategoryDebounceRef = useRef(null);

    const isCareerTab = activeTab !== "training";

    useEffect(() => {
        setSearchInput("");
        setSearch("");
        setCategoryInput("");
        setCategory("");
        setSubCategoryInput("");
        setSubCategory("");
        setStatus("");
        setPage(1);
    }, [activeTab]);

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [searchInput]);

    useEffect(() => {
        if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
        categoryDebounceRef.current = setTimeout(() => {
            setPage(1);
            setCategory(categoryInput.trim());
        }, 400);
        return () => clearTimeout(categoryDebounceRef.current);
    }, [categoryInput]);

    useEffect(() => {
        if (subCategoryDebounceRef.current) clearTimeout(subCategoryDebounceRef.current);
        subCategoryDebounceRef.current = setTimeout(() => {
            setPage(1);
            setSubCategory(subCategoryInput.trim());
        }, 400);
        return () => clearTimeout(subCategoryDebounceRef.current);
    }, [subCategoryInput]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const tabConfig = TAB_CONFIG[activeTab];
            const params = {
                type: tabConfig.apiType,
                page,
                limit: rowsPerPage,
                search,
                category,
                subCategory,
                status,
            };
            if (tabConfig.opportunityType) {
                params.opportunityType = tabConfig.opportunityType;
            }
            const res = await getWebsiteOpportunities(params);
            if (res?.success) {
                setRecords(res.data || []);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalRecords(res.pagination?.total || 0);
            } else {
                toast.error(res?.message || "Failed to load opportunities");
                setRecords([]);
            }
        } catch (err) {
            console.error("Error fetching website opportunities:", err);
            toast.error(err?.message || "Server error while fetching opportunities");
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, rowsPerPage, search, category, subCategory, status]);

    const handleConfirmClose = async () => {
        if (!closeTarget) return;
        try {
            setClosing(true);
            const res = await closeCareerPost(closeTarget.id, { status: "closed" });
            if (res?.success !== false) {
                toast.success("Opening closed successfully");
                setCloseTarget(null);
                fetchRecords();
            } else {
                toast.error(res?.message || "Failed to close opening");
            }
        } catch (err) {
            console.error("Error closing career post:", err);
            toast.error(err?.message || "Server error while closing opening");
        } finally {
            setClosing(false);
        }
    };

    const careerColumns = [
        {
            label: "Title",
            accessor: "title",
            render: (_, row) => (
                <div className="min-w-[220px]">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.title || "-"}</p>
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                        {row.opportunityType}
                        {row.internshipType ? ` · ${row.internshipType}` : ""}
                    </span>
                </div>
            ),
        },
        {
            label: "Category",
            accessor: "category",
            render: (_, row) => (
                <div className="min-w-[160px]">
                    <p className="text-sm text-slate-700">{row.category || "-"}</p>
                    <p className="text-xs text-slate-400">{row.subCategory || ""}</p>
                </div>
            ),
        },
        {
            label: "Location",
            accessor: "location",
            render: (value, row) => (
                <div className="min-w-[130px]">
                    <p className="text-sm text-slate-700">{value || "-"}</p>
                    <p className="text-xs capitalize text-slate-400">{row.workMode}</p>
                </div>
            ),
        },
        {
            label: "Salary / Duration",
            accessor: "salary",
            render: (value, row) =>
                row.opportunityType === "job" ? (
                    <span className="whitespace-nowrap text-sm text-slate-600">{formatSalary(value)}</span>
                ) : (
                    <span className="whitespace-nowrap text-sm text-slate-600">{formatDuration(row.duration)}</span>
                ),
        },
        {
            label: "Vacancies",
            accessor: "vacancies",
            render: (value) => <span className="text-sm text-slate-600">{value ?? "-"}</span>,
        },
        {
            label: "Deadline",
            accessor: "applicationDeadline",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">{formatDate(value)}</span>
            ),
        },
        {
            label: "Status",
            accessor: "status",
            render: (value) => <StatusBadge status={value} />,
        },
        {
            label: "Actions",
            accessor: "_id",
            render: (value, row) => (
                <div className="flex items-center gap-2">

                    {/* Edit */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpeningModal({
                                mode: "edit",
                                record: row,
                            });
                        }}
                        title="Edit Opening"
                        aria-label="Edit Opening"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                        <Pencil size={15} />
                    </button>

                    {/* Close */}
                    {row.status === "published" && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCloseTarget({
                                    id: value,
                                    title: row.title,
                                });
                            }}
                            title="Close Opening"
                            aria-label="Close Opening"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                            <XCircle size={15} />
                        </button>
                    )}

                    {/* Applications */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/job-details/${row._id}`);
                        }}
                        title="View Applications"
                        aria-label="View Applications"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                        <Eye size={15} />
                    </button>

                </div>
            ),
        },
    ];

    const trainingColumns = [
        {
            label: "Candidate",
            accessor: "fullName",
            render: (_, row) => (
                <div className="min-w-[200px]">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.fullName || "-"}</p>
                    {row.email ? (
                        <a
                            href={`mailto:${row.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 block truncate text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            {row.email}
                        </a>
                    ) : (
                        <p className="mt-1 text-xs text-slate-500">-</p>
                    )}
                </div>
            ),
        },
        {
            label: "Phone",
            accessor: "phone",
            render: (value) =>
                value ? (
                    <a
                        href={`tel:${value}`}
                        onClick={(e) => e.stopPropagation()}
                        className="whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    <span className="text-sm text-slate-500">-</span>
                ),
        },
        {
            label: "Category",
            accessor: "category",
            render: (_, row) => (
                <div className="min-w-[160px]">
                    <p className="text-sm text-slate-700">{row.category || "-"}</p>
                    <p className="text-xs text-slate-400">{row.subCategory || ""}</p>
                </div>
            ),
        },
        {
            label: "Experience",
            accessor: "experience",
            render: (value) => (
                <span className="text-sm capitalize text-slate-600">{value || "-"}</span>
            ),
        },
        {
            label: "Duration",
            accessor: "duration",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">{formatDuration(value)}</span>
            ),
        },
        {
            label: "Resume",
            accessor: "resume",
            render: (value) =>
                value?.fileUrl ? (
                    <a
                        href={value.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        View Resume
                    </a>
                ) : (
                    <span className="text-sm text-slate-400">-</span>
                ),
        },
        {
            label: "Status",
            accessor: "status",
            render: (value) => <StatusBadge status={value} />,
        },
        {
            label: "Applied On",
            accessor: "createdAt",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">{formatDate(value)}</span>
            ),
        },
    ];

    const columns = activeTab === "training" ? trainingColumns : careerColumns;
    const statusOptions =
        activeTab === "training" ? TRAINING_STATUS_OPTIONS : CAREER_STATUS_OPTIONS;

    const LoadingSkeleton = () => (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            {columns.map((col) => (
                                <th
                                    key={col.label}
                                    className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index} className="animate-pulse border-b border-gray-100">
                                {columns.map((_, cIdx) => (
                                    <td key={cIdx} className="px-5 py-4">
                                        <div className="h-4 w-24 rounded bg-gray-200" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen max-w-full overflow-x-hidden bg-[#F3F8FB] p-4 space-y-6 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">
                    Career And Training
                </h1>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {totalRecords} {activeTab === "training" ? "Enquiries" : "Openings"}
                    </span>
                    {isCareerTab && (
                        <button
                            type="button"
                            onClick={() => setOpeningModal({ mode: "create", record: null })}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        >
                            <Plus size={16} />
                            Add {activeTab === "internship" ? "Internship" : "Job"}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex w-fit rounded-lg border border-gray-200 bg-white p-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key
                            ? "bg-blue-700 text-white"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:min-w-[240px]">
                    <div className="relative min-w-0 flex-1">
                        <input
                            type="text"
                            placeholder={
                                isCareerTab
                                    ? "Search title, category, location..."
                                    : "Search name, email, phone..."
                            }
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-3 top-2.5 text-gray-400"
                        />
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        className="flex-shrink-0 rounded-md border border-gray-300 bg-white p-2 hover:bg-gray-50 sm:hidden"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <div className="hidden flex-wrap items-center gap-3 sm:flex">
                    <input
                        type="text"
                        placeholder="Category"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        type="text"
                        placeholder="Sub Category"
                        value={subCategoryInput}
                        onChange={(e) => setSubCategoryInput(e.target.value)}
                        className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map((opt) => (
                            <option key={opt} value={opt} className="capitalize">
                                {opt.replace(/-/g, " ")}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="grid grid-cols-1 gap-3 border-b border-gray-200 pb-4 sm:hidden">
                    <input
                        type="text"
                        placeholder="Category"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Sub Category"
                        value={subCategoryInput}
                        onChange={(e) => setSubCategoryInput(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt.replace(/-/g, " ")}
                            </option>
                        ))}
                    </select>
                    <div className="rounded-lg bg-white p-3 text-sm text-gray-600">
                        Total:{" "}
                        <span className="font-semibold text-gray-800">{totalRecords}</span>
                    </div>
                </div>
            )}

            {loading ? (
                <LoadingSkeleton />
            ) : records.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-medium text-gray-600">
                        No {isCareerTab ? "openings" : "training enquiries"} found
                    </p>
                    {(search || category || subCategory) && (
                        <p className="mt-1 text-xs text-gray-400">
                            Try changing your search term or filters.
                        </p>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={records}
                                onRowClick={(row) => setSelectedRecord(row)}
                                footerLegend={[]}
                                currentPage={page}
                                totalPages={totalPages}
                                totalRecords={totalRecords}
                                rowsPerPage={rowsPerPage}
                                onPageChange={(newPage) => setPage(newPage)}
                                onRowsPerPageChange={(newLimit) => {
                                    setRowsPerPage(newLimit);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedRecord && (
                <DetailModal
                    isCareer={isCareerTab}
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                    onEdit={
                        isCareerTab
                            ? () => {
                                setSelectedRecord(null);
                                setOpeningModal({
                                    mode: "edit",
                                    record: selectedRecord,
                                });
                            }
                            : undefined
                    }
                />
            )}

            {openingModal && (
                <OpeningModal
                    mode={openingModal.mode}
                    record={openingModal.record}
                    defaultOpportunityType={
                        activeTab === "internship" ? "internship" : "job"
                    }
                    onClose={() => setOpeningModal(null)}
                    onSaved={() => {
                        setOpeningModal(null);
                        setPage(1);
                        fetchRecords();
                    }}
                />
            )}

            {closeTarget && (
                <ConfirmDeleteModal
                    open={!!closeTarget}
                    title="Close Opening"
                    message={`Are you sure you want to close "${closeTarget.title || "this opening"
                        }"? It will no longer accept applications.`}
                    confirmLabel={closing ? "Closing..." : "Close Opening"}
                    confirmLoading={closing}
                    onConfirm={handleConfirmClose}
                    onClose={() => setCloseTarget(null)}
                />
            )}
        </div>
    );
};

// =====================================================================
// Detail modal — redesigned for career / internship
// =====================================================================

const DetailModal = ({ isCareer, record, onClose, onEdit }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-6 py-4">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-800">
                        {isCareer ? record.title : record.fullName}
                    </h2>
                    {isCareer && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                                {record.opportunityType}
                                {record.internshipType ? ` · ${record.internshipType}` : ""}
                            </span>
                            <StatusBadge status={record.status} />
                        </div>
                    )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-5 px-6 py-5">
                {isCareer ? (
                    <>
                        {/* Meta grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <MetaCard label="Category" value={`${record.category || "-"} / ${record.subCategory || "-"}`} />
                            <MetaCard label="Location" value={`${record.location || "-"} (${record.workMode || "-"})`} />
                            <MetaCard label="Vacancies" value={record.vacancies ?? "-"} />
                            {record.opportunityType === "job" && (
                                <MetaCard label="Salary" value={formatSalary(record.salary)} />
                            )}
                            {record.opportunityType === "internship" && (
                                <MetaCard label="Duration" value={formatDuration(record.duration)} />
                            )}
                            <MetaCard label="Deadline" value={formatDate(record.applicationDeadline)} />
                        </div>

                        {record.description && (
                            <Section title="Description">
                                <p className="text-sm leading-relaxed text-gray-700">{record.description}</p>
                            </Section>
                        )}

                        {record.responsibilities?.length > 0 && (
                            <Section title="Responsibilities">
                                <ol className="space-y-2">
                                    {record.responsibilities.map((item, idx) => (
                                        <li key={idx} className="flex gap-2.5 text-sm text-gray-700">
                                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                                                {idx + 1}
                                            </span>
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ol>
                            </Section>
                        )}

                        {record.requirements?.length > 0 && (
                            <Section title="Requirements">
                                <ul className="space-y-2">
                                    {record.requirements.map((item, idx) => (
                                        <li key={idx} className="flex gap-2.5 text-sm text-gray-700">
                                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {record.skills?.length > 0 && (
                            <Section title="Skills">
                                <div className="flex flex-wrap gap-1.5">
                                    {record.skills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <MetaCard label="Email" value={record.email || "-"} />
                            <MetaCard label="Phone" value={record.phone || "-"} />
                            <MetaCard label="Experience" value={record.experience || "-"} />
                            <MetaCard
                                label="Category"
                                value={`${record.category || "-"} / ${record.subCategory || "-"}`}
                            />
                            <MetaCard label="Duration" value={formatDuration(record.duration)} />
                            <MetaCard label="Status" value={<StatusBadge status={record.status} />} />
                        </div>

                        {(record.linkedinProfile ||
                            record.githubProfile ||
                            record.resume?.fileUrl) && (
                                <Section title="Links">
                                    <div className="space-y-3 text-sm">
                                        {record.linkedinProfile && (
                                            <div>
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    LinkedIn Profile
                                                </p>
                                                <a
                                                    href={record.linkedinProfile}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline break-all"
                                                >
                                                    {record.linkedinProfile}
                                                </a>
                                            </div>
                                        )}

                                        {record.githubProfile && (
                                            <div>
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    GitHub Profile
                                                </p>
                                                <a
                                                    href={record.githubProfile}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline break-all"
                                                >
                                                    {record.githubProfile}
                                                </a>
                                            </div>
                                        )}

                                        {record.resume?.fileUrl && (
                                            <div>
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Resume
                                                </p>
                                                <a
                                                    href={record.resume.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {record.resume.fileName || "View Resume"}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}

                        {record.about && (
                            <Section title="About">
                                <p className="text-sm leading-relaxed text-gray-700">{record.about}</p>
                            </Section>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
);

const MetaCard = ({ label, value }) => (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
);

const Section = ({ title, children }) => (
    <div>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
        {children}
    </div>
);

// =====================================================================
// Opening modal
// =====================================================================

const INITIAL_FORM = {
    title: "",
    opportunityType: "job",
    internshipType: "paid",
    category: "",
    subCategory: "",
    description: "",
    responsibilities: [],
    requirements: [],
    skills: [],
    location: "Remote",
    workMode: "onsite",
    vacancies: 1,
    salaryMin: "",
    salaryMax: "",
    durationValue: "",
    durationUnit: "months",
    applicationDeadline: "",
    status: "published",
};

const buildForm = (record, defaultOpportunityType) => {
    if (!record) {
        return {
            ...INITIAL_FORM,
            opportunityType: defaultOpportunityType || "job",
            responsibilities: [],
            requirements: [],
            skills: [],
        };
    }
    return {
        title: record.title || "",
        opportunityType: record.opportunityType || "job",
        internshipType: record.internshipType || "paid",
        category: record.category || "",
        subCategory: record.subCategory || "",
        description: record.description || "",
        responsibilities: Array.isArray(record.responsibilities)
            ? [...record.responsibilities]
            : [],
        requirements: Array.isArray(record.requirements) ? [...record.requirements] : [],
        skills: Array.isArray(record.skills) ? [...record.skills] : [],
        location: record.location || "Remote",
        workMode: record.workMode || "onsite",
        vacancies: record.vacancies ?? 1,
        salaryMin: record.salary?.min ?? "",
        salaryMax: record.salary?.max ?? "",
        durationValue: record.duration?.value ?? "",
        durationUnit: record.duration?.unit || "months",
        applicationDeadline: record.applicationDeadline
            ? new Date(record.applicationDeadline).toISOString().slice(0, 10)
            : "",
        status: record.status || "published",
    };
};

const buildPayload = (form) => {
    const payload = {
        title: form.title.trim(),
        opportunityType: form.opportunityType,
        category: form.category.trim(),
        subCategory: form.subCategory.trim(),
        description: form.description.trim(),
        location: form.location.trim() || "Remote",
        workMode: form.workMode,
        vacancies: Number(form.vacancies) || 1,
        responsibilities: form.responsibilities || [],
        requirements: form.requirements || [],
        skills: form.skills || [],
        status: form.status,
        applicationDeadline: form.applicationDeadline || null,
    };

    if (form.opportunityType === "internship") {
        payload.internshipType = form.internshipType;
        payload.duration = {
            value: form.durationValue ? Number(form.durationValue) : null,
            unit: form.durationUnit,
        };
    } else {
        payload.salary = {
            min: form.salaryMin ? Number(form.salaryMin) : null,
            max: form.salaryMax ? Number(form.salaryMax) : null,
            currency: "INR",
            period: "monthly",
        };
    }

    return payload;
};

const diffPayload = (initial, current) => {
    const diff = {};
    Object.keys(current).forEach((key) => {
        const a = initial[key];
        const b = current[key];
        const changed =
            typeof a === "object" || typeof b === "object"
                ? JSON.stringify(a) !== JSON.stringify(b)
                : a !== b;
        if (changed) diff[key] = b;
    });
    return diff;
};

const OpeningModal = ({ mode, record, defaultOpportunityType, onClose, onSaved }) => {
    const isEdit = mode === "edit";
    const initialFormRef = useRef(buildForm(record, defaultOpportunityType));
    const [form, setForm] = useState(initialFormRef.current);
    const [submitting, setSubmitting] = useState(false);

    const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setList = (key) => (items) => setForm((f) => ({ ...f, [key]: items }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (
            !form.title.trim() ||
            !form.category.trim() ||
            !form.subCategory.trim() ||
            !form.description.trim()
        ) {
            toast.error("Title, category, sub category and description are required");
            return;
        }

        const payload = buildPayload(form);

        try {
            setSubmitting(true);
            if (isEdit) {
                const initialPayload = buildPayload(initialFormRef.current);
                const diff = diffPayload(initialPayload, payload);
                if (Object.keys(diff).length === 0) {
                    toast.info("No changes to update");
                    setSubmitting(false);
                    return;
                }
                const res = await updateCareerPost(record._id, diff);
                if (res?.success !== false) {
                    toast.success("Opening updated successfully");
                    onSaved();
                } else {
                    toast.error(res?.message || "Failed to update opening");
                }
            } else {
                const res = await createCareerPost(payload);
                if (res?.success !== false) {
                    toast.success("Opening created successfully");
                    onSaved();
                } else {
                    toast.error(res?.message || "Failed to create opening");
                }
            }
        } catch (err) {
            console.error(`Error ${isEdit ? "updating" : "creating"} career post:`, err);
            toast.error(
                err?.message ||
                `Server error while ${isEdit ? "updating" : "creating"} opening`
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isEdit ? "Edit Opening" : "Add Opening"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="col-span-2 text-xs font-medium text-gray-500">
                            Title
                            <input
                                type="text"
                                value={form.title}
                                onChange={update("title")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="e.g. Full Stack Developer"
                            />
                        </label>

                        <label className="text-xs font-medium text-gray-500">
                            Opportunity Type
                            <select
                                value={form.opportunityType}
                                onChange={update("opportunityType")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="job">Job</option>
                                <option value="internship">Internship</option>
                            </select>
                        </label>

                        {form.opportunityType === "internship" && (
                            <label className="text-xs font-medium text-gray-500">
                                Internship Type
                                <select
                                    value={form.internshipType}
                                    onChange={update("internshipType")}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </label>
                        )}

                        {isEdit && (
                            <label className="text-xs font-medium text-gray-500">
                                Status
                                <select
                                    value={form.status}
                                    onChange={update("status")}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    {CAREER_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <label className="text-xs font-medium text-gray-500">
                            Category
                            <input
                                type="text"
                                value={form.category}
                                onChange={update("category")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="e.g. Web Development"
                            />
                        </label>

                        <label className="text-xs font-medium text-gray-500">
                            Sub Category
                            <input
                                type="text"
                                value={form.subCategory}
                                onChange={update("subCategory")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="e.g. Full Stack"
                            />
                        </label>

                        <label className="col-span-2 text-xs font-medium text-gray-500">
                            Description
                            <textarea
                                value={form.description}
                                onChange={update("description")}
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Short role summary"
                            />
                        </label>

                        {/* Multi-item lists */}
                        <MultiListInput
                            label="Responsibilities"
                            items={form.responsibilities}
                            onChange={setList("responsibilities")}
                            placeholder="e.g. Develop web applications"
                        />

                        <MultiListInput
                            label="Requirements"
                            items={form.requirements}
                            onChange={setList("requirements")}
                            placeholder="e.g. Strong knowledge of React"
                        />

                        <SkillsInput skills={form.skills} onChange={setList("skills")} />

                        <label className="text-xs font-medium text-gray-500">
                            Location
                            <input
                                type="text"
                                value={form.location}
                                onChange={update("location")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </label>

                        <label className="text-xs font-medium text-gray-500">
                            Work Mode
                            <select
                                value={form.workMode}
                                onChange={update("workMode")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="onsite">Onsite</option>
                                <option value="remote">Remote</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </label>

                        <label className="text-xs font-medium text-gray-500">
                            Vacancies
                            <input
                                type="number"
                                min={1}
                                value={form.vacancies}
                                onChange={update("vacancies")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </label>

                        <label className="text-xs font-medium text-gray-500">
                            Application Deadline
                            <input
                                type="date"
                                value={form.applicationDeadline}
                                onChange={update("applicationDeadline")}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </label>

                        {form.opportunityType === "job" ? (
                            <>
                                <label className="text-xs font-medium text-gray-500">
                                    Salary Min (₹/month)
                                    <input
                                        type="number"
                                        value={form.salaryMin}
                                        onChange={update("salaryMin")}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </label>
                                <label className="text-xs font-medium text-gray-500">
                                    Salary Max (₹/month)
                                    <input
                                        type="number"
                                        value={form.salaryMax}
                                        onChange={update("salaryMax")}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </label>
                            </>
                        ) : (
                            <>
                                <label className="text-xs font-medium text-gray-500">
                                    Duration Value
                                    <input
                                        type="number"
                                        value={form.durationValue}
                                        onChange={update("durationValue")}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </label>
                                <label className="text-xs font-medium text-gray-500">
                                    Duration Unit
                                    <select
                                        value={form.durationUnit}
                                        onChange={update("durationUnit")}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="days">Days</option>
                                        <option value="weeks">Weeks</option>
                                        <option value="months">Months</option>
                                    </select>
                                </label>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                            {submitting
                                ? isEdit
                                    ? "Saving..."
                                    : "Creating..."
                                : isEdit
                                    ? "Save Changes"
                                    : "Create Opening"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CareerAndTraining;
