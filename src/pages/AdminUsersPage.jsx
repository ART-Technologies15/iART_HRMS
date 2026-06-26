import React, { useEffect, useMemo, useState } from "react";
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
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    designation: "",
    role: "",
    department: "",
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsers();
      if (res?.success) setUsers(res.users);
      else toast.error(res?.message || "Failed to load users");
    } catch {
      toast.error("Server error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const options = useMemo(() => {
    const roles = [...new Set(users.map((u) => u.role))].sort();
    const departments = [...new Set(users.map((u) => u.department))].sort();
    const designations = [...new Set(users.map((u) => u.designation))].sort();
    return { roles, departments, designations };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u._id !== user._id)
      .filter(
        (u) =>
          (!filters.role || u.role === filters.role) &&
          (!filters.department || u.department === filters.department) &&
          (!filters.designation || u.designation === filters.designation)
      )
      .filter((u) => {
        if (!q) return true;
        const haystack = [
          u.name,
          u.email,
          u.mobile,
          u.alternateMobile,
          u.address,
          u.designation,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .map((u) => ({ ...u, actions: "" }));
  }, [users, search, filters, user]);

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
        fetchUsers();
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
        toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        // Optimistic update or fetch
        setUsers(users.map(u =>
          u._id === userId ? { ...u, isActive: newStatus } : u
        ));
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Error updating status");
    }
  };

  const columns = [
    { label: "Name", accessor: "name" },
    { label: "Email", accessor: "email" },
    { label: "Phone", accessor: "mobile" },
    { label: "Designation", accessor: "designation" },
    { label: "Role", accessor: "role" },
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
              onChange={() => handleToggleStatus(row._id, row.isActive)}
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
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              setAddUserOpen(row);
            }}
          >
            Edit
          </button>
          <button
            className="px-2 py-1 text-xs bg-green-600 text-white rounded whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/user-attendance", { state: { user: row } });
            }}
          >
            Attendance
          </button>
          <button
            className="px-2 py-1 text-xs bg-red-600 text-white rounded whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteUser(row);
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
      {/* Header */}
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Users</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Mobile: Search + Toggle */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Desktop Controls */}
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

      {/* Mobile Filters (Full Width, Single Row) */}
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

      {/* Table - Perfectly Centered & No Overflow */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          Loading users...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          No users found
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <CustomTable
                columns={columns}
                data={filtered}
                defaultRowsPerPage={10}
                footerLegend={[]}
                onRowClick={(row) => setViewUser(row)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdminUserFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={setFilters}
        options={options}
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
      />

      <ConfirmDeleteModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete User"
        message={`This action cannot be undone. Are you sure you want to delete ${deleteUser?.name}?`}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
};

export default AdminUsersPage;
