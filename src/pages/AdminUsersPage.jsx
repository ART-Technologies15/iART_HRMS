import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Menu,
  Pencil,
  CalendarDays,
  Package,
  Trash2,
  FileText,
  MoreVertical,
  Upload,
  ExternalLink,
} from "lucide-react";
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
  getAssignLetter,
  assignLetter,
  updateLetterStatus,
} from "../api/authApi";
import {
  getEmployeeAssets
} from "../api/assetsApi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import EmployeeAssetsModal from "../components/EmployeeAssetsModal";
import { getErrorMessage } from "../helper/commonFuction";
import ActionDropdown from "../reusableComponents/ActionDropdown";
import Drawer from "../reusableComponents/Drawer";

const LETTER_TYPES = [
  { value: "appointment", label: "Appointment Letter" },
  { value: "offer", label: "Offer Letter" },
  { value: "appraisal", label: "Appraisal Letter" },
  { value: "experience", label: "Experience Letter" },
  { value: "relieving", label: "Relieving Letter" },
];

const extractLetters = (response) => {
  const candidates = [
    response?.letters,
    response?.data?.letters,
    response?.data?.assignments,
    response?.data,
  ];
  return candidates.find(Array.isArray) || [];
};

const getLetterFileUrl = (letter) => {
  const file = letter.fileUrl || letter.file || letter.url || letter.documentUrl || letter.letterUrl;
  return typeof file === "string" ? file : file?.url || "";
};

const formatLetterDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

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
  const [lettersDrawerOpen, setLettersDrawerOpen] = useState(false);
  const [lettersEmployee, setLettersEmployee] = useState(null);
  const [lettersEmployeeDetails, setLettersEmployeeDetails] = useState(null);
  const [employeeLetters, setEmployeeLetters] = useState([]);
  const [letterCounts, setLetterCounts] = useState({ total: 0, active: 0, revoked: 0 });
  const [lettersLoading, setLettersLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [letterType, setLetterType] = useState("appointment");
  const [letterFile, setLetterFile] = useState(null);
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [updatingLetterId, setUpdatingLetterId] = useState(null);

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
      console.log(err);
      toast.error(getErrorMessage(err));
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

  const fetchEmployeeLetters = useCallback(async (employeeId) => {
    if (!employeeId) return;
    try {
      setLettersLoading(true);
      const response = await getAssignLetter(employeeId);
      if (!response?.success) {
        toast.error(response?.message || "Unable to load employee letters");
        setEmployeeLetters([]);
        setLettersEmployeeDetails(null);
        setLetterCounts({ total: 0, active: 0, revoked: 0 });
        return;
      }
      const letters = extractLetters(response);
      const data = response.data || {};
      setEmployeeLetters(letters);
      setLettersEmployeeDetails(data.employee || null);
      setLetterCounts({
        total: data.totalLetters ?? letters.length,
        active: data.activeLetters ?? letters.filter((letter) => letter.status === "active").length,
        revoked: data.revokedLetters ?? letters.filter((letter) => letter.status === "revoked").length,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load employee letters");
      setEmployeeLetters([]);
      setLettersEmployeeDetails(null);
      setLetterCounts({ total: 0, active: 0, revoked: 0 });
    } finally {
      setLettersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lettersDrawerOpen && lettersEmployee?._id) {
      fetchEmployeeLetters(lettersEmployee._id);
    }
  }, [lettersDrawerOpen, lettersEmployee?._id, fetchEmployeeLetters]);

  const openLettersDrawer = (employee) => {
    setLettersEmployee(employee);
    setLettersEmployeeDetails(null);
    setEmployeeLetters([]);
    setLetterCounts({ total: 0, active: 0, revoked: 0 });
    setLetterType("appointment");
    setLetterFile(null);
    setUploadOpen(false);
    setLettersDrawerOpen(true);
  };

  const handleUploadLetter = async (event) => {
    event.preventDefault();
    if (!lettersEmployee?._id || !letterFile) {
      toast.error("Choose a PDF file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("userId", lettersEmployee._id);
    formData.append("type", letterType);
    formData.append("file", letterFile);

    try {
      setUploadingLetter(true);
      const response = await assignLetter(formData);
      if (response?.success) {
        toast.success("Letter uploaded and assigned");
        setLetterFile(null);
        setUploadOpen(false);
        await fetchEmployeeLetters(lettersEmployee._id);
      } else {
        toast.error(response?.message || "Unable to upload letter");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to upload letter");
    } finally {
      setUploadingLetter(false);
    }
  };

  const handleLetterStatusChange = async (letter, nextStatus) => {
    const letterId = letter._id || letter.id;
    if (!letterId) {
      toast.error("Letter ID is unavailable");
      return;
    }
    try {
      setUpdatingLetterId(letterId);
      const response = await updateLetterStatus(letterId, nextStatus);
      if (response?.success) {
        toast.success(`Letter ${nextStatus === "active" ? "activated" : "revoked"}`);
        setEmployeeLetters((prev) => prev.map((item) =>
          (item._id || item.id) === letterId ? { ...item, status: nextStatus } : item
        ));
        setLetterCounts((prev) => ({
          ...prev,
          active: Math.max(0, prev.active + (nextStatus === "active" ? 1 : -1)),
          revoked: Math.max(0, prev.revoked + (nextStatus === "revoked" ? 1 : -1)),
        }));
      } else {
        toast.error(response?.message || "Unable to update letter status");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update letter status");
    } finally {
      setUpdatingLetterId(null);
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
    const isActive = !!row.isActive;

    return (
      <div onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          disabled={isAdminUser}
          onClick={() => handleToggleStatus(row._id, isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200
            disabled:cursor-not-allowed disabled:opacity-60
            ${isActive ? "bg-emerald-600" : "bg-slate-300"}
            ${isAdminUser ? "cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
              ${isActive ? "translate-x-[22px]" : "translate-x-0.5"}
            `}
          />
        </button>
      </div>
    );
  },
},
    {
      label: "Actions",
      accessor: "actions",
      render: (_, row) => (
        <ActionDropdown
          openOn="click"
          triggerIcon={MoreVertical}
          triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          actions={[
            { label: "Edit User", icon: Pencil, onClick: () => setAddUserOpen(row) },
            { label: "View Attendance", icon: CalendarDays, onClick: () => navigate("/user-attendance", { state: { user: row } }) },
            { label: "View Assets", icon: Package, onClick: () => { setSelectedEmployee(row); setEmployeeAssetsOpen(true); } },
            { label: "Documents", icon: FileText, onClick: () => navigate("/user-attendance", { state: { user: row } }) },
            { label: "View Letters", icon: FileText, onClick: () => openLettersDrawer(row) },
            ...(user?.role === "admin" ? [
              { divider: true },
              { label: "Delete User", icon: Trash2, className: "text-red-600 hover:bg-red-50 cursor-pointer", onClick: () => setDeleteUser(row) },
            ] : []),
          ]}
        />
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
      <Drawer
        isOpen={lettersDrawerOpen}
        onClose={() => setLettersDrawerOpen(false)}
        direction="right"
        size="min(600px, 100vw)"
        title={`${lettersEmployeeDetails?.name || lettersEmployee?.name || "Employee"} - Letters`}
        footer={(
          <div className="flex justify-end">
            <button type="button" onClick={() => setLettersDrawerOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        )}
      >
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Assigned letters</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {lettersEmployeeDetails?.employeeId || lettersEmployee?.employeeId || ""}
                {(lettersEmployeeDetails?.department || lettersEmployeeDetails?.designation) && " · "}
                {[lettersEmployeeDetails?.department, lettersEmployeeDetails?.designation].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUploadOpen((open) => !open)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Upload size={15} />
              Upload Letter
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: letterCounts.total, style: "bg-slate-100 text-slate-700" },
              { label: "Active", value: letterCounts.active, style: "bg-emerald-50 text-emerald-700" },
              { label: "Revoked", value: letterCounts.revoked, style: "bg-rose-50 text-rose-700" },
            ].map((count) => (
              <div key={count.label} className={`rounded-lg px-3 py-2 ${count.style}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{count.label}</p>
                <p className="mt-0.5 text-lg font-semibold">{count.value}</p>
              </div>
            ))}
          </div>

          {uploadOpen && (
            <form onSubmit={handleUploadLetter} className="space-y-3 rounded-xl border border-blue-100 p-4">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Letter type</span>
                <select value={letterType} onChange={(event) => setLetterType(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  {LETTER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">PDF file</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setLetterFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-2"
                />
              </label>
              {letterFile && <p className="truncate text-xs text-slate-500">{letterFile.name}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setUploadOpen(false); setLetterFile(null); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={uploadingLetter || !letterFile} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Upload size={15} /> {uploadingLetter ? "Uploading..." : "Upload PDF"}
                </button>
              </div>
            </form>
          )}

          {lettersLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : employeeLetters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">No letters assigned to this employee.</div>
          ) : (
            <div className="space-y-3">
              {employeeLetters.map((letter, index) => {
                const letterId = letter._id || letter.id;
                const status = letter.status || "active";
                const fileUrl = getLetterFileUrl(letter);
                const typeLabel = LETTER_TYPES.find((type) => type.value === letter.type)?.label || letter.type || "Letter";

                return (
                  <article key={letterId || `${letter.type}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileText size={17} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-800">{typeLabel}</h3>
                          <p className="mt-1 text-xs text-slate-500">Assigned {formatLetterDate(letter.assignedAt || letter.createdAt)}</p>
                          <p className="mt-1 text-xs text-slate-500">Assigned by: {letter.assignedBy?.name || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">Updated by: {letter.updatedBy?.name || "-"}</p>
                          {letter.fileName && <p className="mt-1 truncate text-xs text-slate-500">{letter.fileName}</p>}
                          {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"><ExternalLink size={13} /> Open letter</a>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{status}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">{updatingLetterId === letterId ? "Saving..." : status === "active" ? "Active" : "Revoked"}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={status === "active"}
                            aria-label={`${status === "active" ? "Revoke" : "Activate"} ${typeLabel}`}
                            disabled={!letterId || updatingLetterId === letterId}
                            onClick={() => handleLetterStatusChange(letter, status === "active" ? "revoked" : "active")}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${status === "active" ? "bg-emerald-600" : "bg-slate-300"}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${status === "active" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>
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