import React, { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, Plus, Menu } from "lucide-react";
import CustomTable from "../components/CustomTable";
import UserDetailsModal from "../components/UserDetailsModal";
import AdminUserFilterModal from "../components/AdminUserFilterModal";
import UserFormModal from "../components/AddEditUserModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { useNavigate } from "react-router-dom";
import {
  getAllUsers,
  registerUser,
  updateUser,
  deleteUser as deleteUserApi,
  toggleUserStatus,
} from "../api/authApi";
import {
  getEmployeeAssets
} from "../api/assetsApi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import EmployeeAssetsModal from "../components/EmployeeAssetsModal";

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search — raw input vs debounced value sent to API
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    designation: "",
    role: "",
    department: "",
  });

  // Server pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [filterOptions, setFilterOptions] = useState({
    roles: [],
    departments: [],
    designations: [],
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [employeeAssetsOpen, setEmployeeAssetsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [activeTab, setActiveTab] = useState("all");

  // Guard against double-invoke on mount (React StrictMode / effect re-fire)
  const didInitFetchOptions = useRef(false);

  // Debounce the search input -> `search`
  const searchDebounceRef = useRef(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1); // reset to page 1 whenever the search term changes
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  // Fetch users whenever page, rowsPerPage, search, or filters change
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const activeFilterValue =
        activeTab === "active" ? true : activeTab === "inactive" ? false : "";
      const res = await getAllUsers({
        page,
        limit: rowsPerPage,
        search,
        role: filters.role,
        department: filters.department,
        designation: filters.designation,
        isActive: activeFilterValue,
      });

      if (res?.success) {
        setUsers(res.users);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
      } else {
        toast.error(res?.message || "Failed to load users");
      }
    } catch {
      toast.error("Server error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, search, filters, activeTab]);

  // Fetch filter dropdown options once on mount using getAllUsers itself
  // (large limit, no search/filters, so we get the full distinct set)
  // useEffect(() => {
  //   if (didInitFetchOptions.current) return;
  //   didInitFetchOptions.current = true;

  //   const fetchOptions = async () => {
  //     try {
  //       const res = await getAllUsers({ page: 1, limit: 1000, search: "", role: "", department: "", designation: "" });
  //       if (res?.success) {
  //         const roles = [...new Set(res.users.map((u) => u.role))].filter(Boolean).sort();
  //         const departments = [...new Set(res.users.map((u) => u.department))].filter(Boolean).sort();
  //         const designations = [...new Set(res.users.map((u) => u.designation))].filter(Boolean).sort();
  //         setFilterOptions({ roles, departments, designations });
  //       }
  //     } catch {
  //       // Non-critical — filter dropdowns just won't populate
  //     }
  //   };

  //   fetchOptions();
  // }, []);

  const handleActiveTabChange = (tab) => {
    setPage(1);
    setActiveTab(tab);
  };

  const handleApplyFilters = (newFilters) => {
    setPage(1); // reset to page 1 whenever filters change
    setFilters(newFilters);
  };

  const handleSaveUser = async (formData, mode) => {
    try {
      setSaving(true);
      const res =
        mode === "add"
          ? await registerUser(formData)
          : await updateUser(addUserOpen._id, formData);

      if (!res?.success) throw new Error(res?.message);

      toast.success(mode === "add" ? "User created" : "User updated");
      setAddUserOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const res = await deleteUserApi(deleteUser._id);
      if (res?.success) {
        toast.success("User deleted");
        // If we just deleted the last row on a page > 1, step back a page
        if (users.length === 1 && page > 1) {
          setPage((p) => p - 1);
        } else {
          fetchUsers();
        }
      } else toast.error(res?.message || "Delete failed");
    } catch {
      toast.error("Server error deleting user");
    } finally {
      setDeleteUser(null);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await toggleUserStatus(userId, newStatus);

      if (res?.success) {
        toast.success(`User ${newStatus ? "activated" : "deactivated"} successfully`);
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: newStatus } : u))
        );
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Error updating status");
    }
  };

  const columns = [
    {
      label: "Name",
      accessor: "name",
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          {row.profilePhoto ? (
            <img
              src={row.profilePhoto}
              alt={row.name}
              className="h-10 w-10 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 border border-blue-200">
              {row.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {row.name}
            </p>

            <span className="mt-1 inline-flex w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {row.employeeId}
            </span>
          </div>
        </div>
      ),
    },
    { label: "Email", accessor: "email" },
    { label: "Phone", accessor: "mobile" },
    { label: "Designation", accessor: "designation" },
    {
      label: "Role",
      accessor: "role",
      render: (val) => (
        <span>
          {val?.toUpperCase() || "-"}
        </span>
      ),
    },
    {
      label: "Active",
      accessor: "isActive",
      render: (val, row) => {
        const isAdminUser = row.role === "admin";

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <label
              className={`relative inline-flex items-center ${isAdminUser ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!row.isActive}
                disabled={isAdminUser}
                onChange={() =>
                  !isAdminUser &&
                  handleToggleStatus(row._id, row.isActive)
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        );
      },
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
              setAddUserOpen(row);
            }}
          >
            Edit
          </button>
          <button
            className="px-2 py-1 text-xs bg-green-600 text-white rounded whitespace-nowrap cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/user-attendance", { state: { user: row } });
            }}
          >
            Attendance
          </button>
          <button
            className="px-2 py-1 text-xs bg-violet-600 text-white rounded whitespace-nowrap cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEmployee(row);
              setEmployeeAssetsOpen(true);
            }}
          >
            Assets
          </button>
          {
            user?.role === "admin" && (
              <button
                className="px-2 py-1 text-xs bg-red-600 text-white rounded whitespace-nowrap cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteUser(row);
                }}
              >
                Delete
              </button>
            )
          }
        </div>
      ),
    },
  ];

  const tableData = users.map((u) => ({ ...u, actions: "" }));

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Users</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 truncate"
            />
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
            />
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
            onClick={() => setAddUserOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap"
          >
            <Plus size={16} />
            Add User
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
              setAddUserOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex justify-center items-center gap-1"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          Loading users...
        </div>
      ) : tableData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          No users found
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <CustomTable
                columns={columns}
                data={tableData}
                onRowClick={(row) => setViewUser(row)}
                footerLegend={[]}
                // Controlled (server-side) pagination
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

      <AdminUserFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={handleApplyFilters}
        options={filterOptions}
      />

      <UserDetailsModal
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
      />

      <UserFormModal
        open={!!addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSubmit={handleSaveUser}
        initialData={typeof addUserOpen === "object" ? addUserOpen : null}
        loading={saving}
        isAdmin={user?.role === "admin"}
        isHr={user?.role === "hr"}
        isAdminHr={user?.role === "admin" || user?.role === "hr"}
      />

      <ConfirmDeleteModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete User"
        message={`This action cannot be undone. Are you sure you want to delete ${deleteUser?.name}?`}
        onConfirm={handleDeleteUser}
      />
      <EmployeeAssetsModal
        open={employeeAssetsOpen}
        onClose={() => {
          setEmployeeAssetsOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />
    </div>
  );
};

export default AdminUsersPage;