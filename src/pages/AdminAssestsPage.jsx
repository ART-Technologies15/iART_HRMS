import React, { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, Plus, Menu } from "lucide-react";
import CustomTable from "../components/CustomTable";
import AssetDetailsModal from "../components/AssetDetailsModal";
import AssetFilterModal from "../components/AssetFilterModal";
import AssetFormModal from "../components/AssetFormModal";
import AssetAssignModal from "../components/AssetAssignModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset as deleteAssetApi,
    assignAsset,
    returnAsset,
    toggleAssetStatus
} from "../api/assetsApi";
import { getAllUsers } from "../api/authApi";
import { toast } from "react-toastify";

const STATUS_STYLES = {
    Available: "bg-emerald-50 text-emerald-600",
    Assigned: "bg-indigo-50 text-indigo-600",
    Repair: "bg-amber-50 text-amber-600",
    Lost: "bg-rose-50 text-rose-600",
    Scrapped: "bg-slate-100 text-slate-500",
};

const CONDITION_STYLES = {
    New: "bg-emerald-50 text-emerald-600",
    Good: "bg-emerald-50 text-emerald-600",
    Fair: "bg-amber-50 text-amber-600",
    Damaged: "bg-rose-50 text-rose-600",
    Repair: "bg-amber-50 text-amber-600",
    Lost: "bg-rose-50 text-rose-600",
    Scrapped: "bg-slate-100 text-slate-500",
};

const Badge = ({ value, styles }) => (
    <span
        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-500"
            }`}
    >
        {value || "-"}
    </span>
);

const AdminAssetsPage = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search — raw input vs debounced value sent to API
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [filters, setFilters] = useState({
        category: "",
        status: "",
        condition: "",
    });
    const [activeTab, setActiveTab] = useState("all");

    // Server pagination state
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [filterOptions, setFilterOptions] = useState({ categories: [] });

    const [filterOpen, setFilterOpen] = useState(false);
    const [viewAsset, setViewAsset] = useState(null);
    const [formOpen, setFormOpen] = useState(false); // false | true (add) | asset object (edit)
    const [assignTarget, setAssignTarget] = useState(null); // asset row being assigned
    const [returnTarget, setReturnTarget] = useState(null); // asset row being returned
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [saving, setSaving] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [employees, setEmployees] = useState([]);

    // Guard against double-invoke on mount (React StrictMode / effect re-fire)
    const didInitFetchOptions = useRef(false);

    // Debounce the search input -> `search`
    const searchDebounceRef = useRef(null);
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [searchInput]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const activeFilterValue =
                activeTab === "active" ? true : activeTab === "inactive" ? false : "";

            const res = await getAllAssets({
                page,
                limit: rowsPerPage,
                search,
                category: filters.category,
                status: filters.status,
                condition: filters.condition,
                isActive: activeFilterValue,
            });

            if (res?.success) {
                setAssets(res.assets || res.data || []);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalRecords(res.pagination?.total || 0);
            } else {
                toast.error(res?.message || "Failed to load assets");
            }
        } catch {
            toast.error("Server error while fetching assets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, search, filters, activeTab]);

    const handleApplyFilters = (newFilters) => {
        setPage(1);
        setFilters(newFilters);
    };

    const handleActiveTabChange = (tab) => {
        setPage(1);
        setActiveTab(tab);
    };

    const handleClearFilters = () => {
        setPage(1);
        setActiveTab("all");
        setFilters({ category: "", status: "", condition: "" });
    };

    const handleSaveAsset = async (payload, mode) => {
        try {
            setSaving(true);
            const res =
                mode === "add" ? await createAsset(payload) : await updateAsset(formOpen._id, payload);

            if (!res?.success) throw new Error(res?.message);

            toast.success(mode === "add" ? "Asset created" : "Asset updated");
            setFormOpen(false);
            fetchAssets();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const handleAssignSubmit = async (data) => {
        try {
            setSaving(true);
            const res = await assignAsset(assignTarget._id, data);
            if (!res?.success) throw new Error(res?.message);

            toast.success("Asset assigned successfully");
            setAssignTarget(null);
            fetchAssets();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to assign asset");
        } finally {
            setSaving(false);
        }
    };

    const handleReturnSubmit = async (data) => {
        try {
            setSaving(true);
            const res = await returnAsset(returnTarget._id, data);
            if (!res?.success) throw new Error(res?.message);

            toast.success("Asset returned successfully");
            setReturnTarget(null);
            fetchAssets();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to process return");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        try {
            const res = await deleteAssetApi(deleteTarget._id);
            if (res?.success) {
                toast.success("Asset deleted");
                if (assets.length === 1 && page > 1) {
                    setPage((p) => p - 1);
                } else {
                    fetchAssets();
                }
            } else {
                toast.error(res?.message || "Delete failed");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Server error deleting asset");
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleToggleStatus = async (asset) => {
        try {
            const res = await toggleAssetStatus(asset._id);

            if (!res?.success) {
                toast.error(res?.message || "Failed to update status");
                return;
            }

            toast.success(res.message);

            // Update local state immediately
            setAssets((prev) =>
                prev.map((item) =>
                    item._id === asset._id
                        ? {
                            ...item,
                            isActive: !item.isActive,
                        }
                        : item
                )
            );

            // OR instead of local update:
            // fetchAssets();

        } catch (err) {
            toast.error(err?.response?.data?.message || "Something went wrong");
        }
    };

    const columns = [
        { label: "Asset Code", accessor: "assetCode" },
        { label: "Name", accessor: "assetName" },
        { label: "Category", accessor: "category" },
        {
            label: "Brand / Model",
            accessor: "brandModel",
            render: (_, row) => (
                <span className="text-sm text-slate-600">
                    {[row.brand, row.model].filter(Boolean).join(" / ") || "-"}
                </span>
            ),
        },
        { label: "Serial No.", accessor: "serialNumber" },
        {
            label: "Status",
            accessor: "status",
            render: (val) => <Badge value={val} styles={STATUS_STYLES} />,
        },
        {
            label: "Condition",
            accessor: "condition",
            render: (val) => <Badge value={val} styles={CONDITION_STYLES} />,
        },
        {
            label: "Assigned To",
            accessor: "currentAssignedTo",
            render: (val) => {
                if (!val || typeof val !== "object") {
                    return <span className="text-sm text-slate-400">-</span>;
                }

                const role = val.role
                    ? val.role.charAt(0).toUpperCase() + val.role.slice(1)
                    : "-";

                return (
                    <div className="flex items-center gap-3 min-w-[220px]">
                        {
                            val.profilePhoto ? (
                                < img
                                    src={val.profilePhoto || "/default-avatar.png"}
                                    alt={val.name}
                                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                                    onError={(e) => {
                                        e.target.src = "/default-avatar.png";
                                    }}
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 border border-blue-200">
                                    {val.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                            )
                        }
                        <div div className="min-w-0" >
                            <p className="truncate text-sm font-semibold text-slate-800">
                                {val.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                                {val.employeeId} • {role}
                            </p>

                            {
                                val.designation && (
                                    <p className="truncate text-xs text-slate-400">
                                        {val.designation}
                                    </p>
                                )
                            }
                        </div >
                    </div >
                );
            },
        },
        {
            label: "Active",
            accessor: "isActive",
            render: (val, row) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!row.isActive}
                            onChange={() => handleToggleStatus(row)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            ),
        },
        {
            label: "Actions",
            accessor: "actions",
            render: (_, row) => (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded whitespace-nowrap cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFormOpen(row);
                        }}
                    >
                        Edit
                    </button>

                    {row.status === "Available" && (
                        <button
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded whitespace-nowrap cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAssignTarget(row);
                            }}
                        >
                            Assign
                        </button>
                    )}

                    {row.status === "Assigned" && (
                        <button
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded whitespace-nowrap cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setReturnTarget(row);
                            }}
                        >
                            Return
                        </button>
                    )}


                    <button
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded whitespace-nowrap cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row);
                        }}
                    >
                        Delete
                    </button>

                </div>
            ),
        },
    ];

    const tableData = assets.map((a) => ({ ...a, actions: "" }));

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Assets</h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="Search asset name, code, serial no..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 truncate"
                        />
                        <Search size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        className="sm:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-50 flex-shrink-0"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={() => setFilterOpen(true)}
                        className="inline-flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 whitespace-nowrap"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                    </button>
                    <button
                        onClick={handleClearFilters}
                        className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 whitespace-nowrap"
                    >
                        Clear Filter
                    </button>
                    <button
                        onClick={() => setFormOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap"
                    >
                        <Plus size={16} />
                        Add Asset
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { key: "all", label: "All" },
                    { key: "active", label: "Active" },
                    { key: "inactive", label: "In Active" },
                ].map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleActiveTabChange(tab.key)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition cursor-pointer ${isActive
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {mobileMenuOpen && (
                <div className="sm:hidden grid grid-cols-1 gap-3 pb-4 border-b border-gray-200">
                    <button
                        onClick={() => {
                            setFilterOpen(true);
                            setMobileMenuOpen(false);
                        }}
                        className="w-full inline-flex justify-center items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                    </button>
                    <button
                        onClick={() => {
                            setFormOpen(true);
                            setMobileMenuOpen(false);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex justify-center items-center gap-1"
                    >
                        <Plus size={16} />
                        Add Asset
                    </button>
                </div>
            )}

            {loading ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">Loading assets...</div>
            ) : tableData.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">No assets found</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={tableData}
                                onRowClick={(row) => setViewAsset(row)}
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

            <AssetFilterModal
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialFilters={filters}
                onApply={handleApplyFilters}
                options={filterOptions}
            />

            <AssetDetailsModal open={!!viewAsset} onClose={() => setViewAsset(null)} asset={viewAsset} />

            <AssetFormModal
                open={!!formOpen}
                onClose={() => setFormOpen(false)}
                onSubmit={handleSaveAsset}
                initialData={typeof formOpen === "object" ? formOpen : null}
                loading={saving}
            />

            <AssetAssignModal
                open={!!assignTarget}
                onClose={() => setAssignTarget(null)}
                onSubmit={handleAssignSubmit}
                mode="assign"
                asset={assignTarget}
                employees={employees}
                loading={saving}
            />

            <AssetAssignModal
                open={!!returnTarget}
                onClose={() => setReturnTarget(null)}
                onSubmit={handleReturnSubmit}
                mode="return"
                asset={returnTarget}
                employees={employees}
                loading={saving}
            />

            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Asset"
                message={`This action cannot be undone. Are you sure you want to delete ${deleteTarget?.assetName}?`}
                onConfirm={handleDeleteAsset}
            />
        </div>
    );
};

export default AdminAssetsPage;