import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, ChevronRight, CircleDashed, ChevronDown, Check, MoreVertical } from "lucide-react";
import { toast } from "react-toastify";
import CustomTable from "../components/CustomTable";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { useAuth } from "../context/AuthContext";
import { getAllUsers } from "../api/authApi";
import {
  createProject,
  getProjects,
  getMyProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
} from "../api/projectApi";
import ActionDropdown from "../reusableComponents/ActionDropdown";

const statusOptions = ["planning", "active", "on_hold", "completed", "cancelled"];
const priorityOptions = ["low", "medium", "high", "critical"];

const StatusBadge = ({ value }) => {
  const map = {
    planning: "bg-slate-100 text-slate-700",
    active: "bg-emerald-100 text-emerald-700",
    on_hold: "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${map[value] || "bg-slate-100 text-slate-700"}`}>
      {value || "-"}
    </span>
  );
};

const PriorityBadge = ({ value }) => {
  const map = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${map[value] || "bg-slate-100 text-slate-700"}`}>
      {value || "-"}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const extractProjects = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(response?.projects)) return response.projects;
  return [];
};

const normalizeProjectMembers = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.members)) return value.members;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.members)) return value.data.members;
  return [];
};

const getMemberId = (member) => member?.user?._id || member?._id || member;

const getStoredUserRole = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.role || "";
  } catch {
    return "";
  }
};

export const ProjectFormModal = ({ open, mode, project, onClose, onSubmit, managers }) => {
  const defaultForm = {
    name: "",
    code: "",
    description: "",
    status: "planning",
    priority: "medium",
    startDate: "",
    endDate: "",
    department: "",
    managerId: "",
    assignmentType: "all",
    memberIds: [],
  };

  const [form, setForm] = useState(defaultForm);
  const [allUsers, setAllUsers] = useState([]);
  const [existingMemberIds, setExistingMemberIds] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const managerPickerRef = useRef(null);

  const normalizeMemberIds = (members = []) =>
    Array.from(
      new Set(
        (Array.isArray(members) ? members : [])
          .map(getMemberId)
          .filter(Boolean)
      )
    );

  useEffect(() => {
    if (!open) return;

    const listMemberEntries = normalizeProjectMembers(project?.members);
    const listMemberIds = normalizeMemberIds(listMemberEntries);

    setForm(
      project
        ? {
          name: project.name || "",
          code: project.code || "",
          description: project.description || "",
          status: project.status || "planning",
          priority: project.priority || "medium",
          startDate: project.startDate ? project.startDate.slice(0, 10) : "",
          endDate: project.endDate ? project.endDate.slice(0, 10) : "",
          department: project.department || "",
          managerId: project.manager?._id || project.managerId || "",
          assignmentType: project.assignmentType || "all",
          memberIds: listMemberIds,
        }
        : defaultForm
    );
    setExistingMemberIds(listMemberIds);
    setProjectMembers(listMemberEntries);
  }, [open, project]);

  useEffect(() => {
    if (!open || mode !== "edit" || !project?._id) return undefined;

    let active = true;
    const fetchProjectMembers = async () => {
      try {
        setMembersLoading(true);
        const res = await getProjectById(project._id);
        const projectData = res?.data?.project || res?.data || res?.project || res;
        const memberEntries = normalizeProjectMembers(res?.data?.members || projectData?.members);
        const managerId = projectData?.manager?._id || projectData?.managerId || "";
        const memberIds = normalizeMemberIds(memberEntries).filter((id) => id !== managerId);

        if (active) {
          setProjectMembers(memberEntries.filter((member) => getMemberId(member) !== managerId));
          setExistingMemberIds(memberIds);
          setForm((prev) => ({
            ...prev,
            managerId,
            memberIds: Array.from(new Set([...memberIds, ...prev.memberIds.filter((id) => id !== managerId)])),
          }));
        }
      } catch (error) {
        if (active) {
          toast.error(error?.response?.data?.message || "Unable to load project members");
        }
      } finally {
        if (active) setMembersLoading(false);
      }
    };

    fetchProjectMembers();
    return () => {
      active = false;
    };
  }, [open, mode, project?._id]);

  useEffect(() => {
    if (!open) return;
    const fetchMembers = async () => {
      try {
        const res = await getAllUsers({ page: 1, limit: 1000, isActive: true });
        if (res?.success) setAllUsers(res.users || []);
      } catch {
        setAllUsers([]);
      }
    };
    fetchMembers();
  }, [open]);

  // Reset the manager picker whenever the modal closes
  useEffect(() => {
    if (!open) {
      setManagerPickerOpen(false);
      setManagerSearch("");
    }
  }, [open]);

  // Close the manager dropdown on outside click or Escape
  useEffect(() => {
    if (!managerPickerOpen) return undefined;

    const closePicker = () => {
      setManagerPickerOpen(false);
      setManagerSearch("");
    };

    const handleClickOutside = (e) => {
      if (managerPickerRef.current && !managerPickerRef.current.contains(e.target)) {
        closePicker();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePicker();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [managerPickerOpen]);

  const memberOptions = Array.from(
    new Map(
      [
        ...allUsers,
        ...projectMembers.map((member) => member?.user || member),
      ]
        .filter((member) => member?._id && member._id !== form.managerId)
        .map((member) => [member._id, member])
    ).values()
  );
  const visibleMemberOptions = memberOptions.filter((member) =>
    `${member.name || ""} ${member.employeeId || ""} ${member.role || ""}`
      .toLowerCase()
      .includes(memberSearch.trim().toLowerCase())
  );
  const visibleManagers = managers.filter((manager) =>
    `${manager.name || ""} ${manager.employeeId || ""} ${manager.department || ""} ${manager.designation || ""}`
      .toLowerCase()
      .includes(managerSearch.trim().toLowerCase())
  );
  const selectedManager = managers.find((manager) => String(manager._id) === String(form.managerId));

  if (!open) return null;

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleMember = (memberId) => {
    if (memberId === form.managerId) return;
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  const handleManagerChange = (managerId) => {
    setForm((prev) => ({
      ...prev,
      managerId,
      memberIds: prev.memberIds.filter((memberId) => memberId !== managerId),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      memberIds: form.assignmentType === "specific"
        ? Array.from(new Set((form.memberIds || []).filter((memberId) => memberId !== form.managerId)))
        : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="mb-5 flex shrink-0 items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{mode === "create" ? "Create" : "Edit"} project</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">{mode === "create" ? "New project" : project?.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block font-medium">Project name</span>
                <input required value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Code</span>
                <input required disabled={mode === "edit"} value={form.code} onChange={(e) => handleChange("code", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Department</span>
                <input value={form.department} onChange={(e) => handleChange("department", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Priority</span>
                <select value={form.priority} onChange={(e) => handleChange("priority", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Status</span>
                <select value={form.status} onChange={(e) => handleChange("status", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              {/* ---------------- Manager picker (overlay dropdown) ---------------- */}
              <div className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Manager</span>

                {/* relative wrapper: the dropdown is positioned against this,
                    so it floats over the fields below instead of pushing them down */}
                <div ref={managerPickerRef} className="relative">
                  <button
                    type="button"
                    aria-expanded={managerPickerOpen}
                    aria-haspopup="listbox"
                    onClick={() => setManagerPickerOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left hover:border-blue-400 focus:border-blue-500 focus:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-700">
                        {selectedManager?.name || (form.managerId ? "Current manager is inactive or unavailable" : "Select an active manager")}
                      </span>
                      {selectedManager && (
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {selectedManager.employeeId || selectedManager.designation || selectedManager.department || "Active user"}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-400 transition-transform ${managerPickerOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {managerPickerOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="relative border-b border-slate-100">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="search"
                          autoFocus
                          value={managerSearch}
                          onChange={(e) => setManagerSearch(e.target.value)}
                          placeholder="Search active employees"
                          className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {visibleManagers.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-slate-500">No active employees found.</p>
                        ) : visibleManagers.map((manager) => (
                          <button
                            key={manager._id}
                            type="button"
                            role="option"
                            aria-selected={String(manager._id) === String(form.managerId)}
                            onClick={() => {
                              handleManagerChange(manager._id);
                              setManagerPickerOpen(false);
                              setManagerSearch("");
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-700">{manager.name}</span>
                              <span className="block truncate text-xs text-slate-500">
                                {[manager.employeeId, manager.designation, manager.department].filter(Boolean).join(" · ") || manager.role || "Active user"}
                              </span>
                            </span>
                            {String(manager._id) === String(form.managerId) && <Check size={16} className="shrink-0 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {form.managerId && !selectedManager && (
                  <p className="mt-1 text-xs text-amber-700">
                    This project currently has an inactive or unavailable manager. Choose an active employee to replace them.
                  </p>
                )}
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Start date</span>
                <input type="date" value={form.startDate} onChange={(e) => handleChange("startDate", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">End date</span>
                <input type="date" value={form.endDate} onChange={(e) => handleChange("endDate", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-slate-700">Assignment type</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={form.assignmentType === "all"} onChange={() => handleChange("assignmentType", "all")} />
                    All employees
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={form.assignmentType === "specific"} onChange={() => handleChange("assignmentType", "specific")} />
                    Specific employees
                  </label>
                </div>
              </div>

              {form.assignmentType === "specific" && (
                <div className="block text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block font-medium">Members</span>
                  {membersLoading && <span className="mb-1 block text-xs text-slate-500">Loading saved members...</span>}
                  <div className="overflow-hidden rounded-lg border border-slate-300">
                    <input
                      type="search"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search employees"
                      className="w-full border-b border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="max-h-48 overflow-y-auto p-1">
                      {visibleMemberOptions.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-slate-500">No employees found.</p>
                      ) : visibleMemberOptions.map((member) => {
                        const isExistingMember = existingMemberIds.includes(member._id);
                        return (
                          <label key={member._id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={form.memberIds.includes(member._id)}
                              onChange={() => toggleMember(member._id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-700">{member.name || "Existing project member"}</span>
                              <span className="block truncate text-xs text-slate-500">{member.employeeId || member.role || "Employee"}</span>
                            </span>
                            {isExistingMember && <span className="text-[10px] font-medium text-slate-400">Current</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {form.memberIds.length} selected. The project manager is excluded from members.
                  </p>
                </div>
              )}

              <label className="block text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block font-medium">Description</span>
                <textarea rows={4} value={form.description} onChange={(e) => handleChange("description", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {mode === "create" ? "Create project" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || getStoredUserRole();
  const isAdmin = userRole === "admin";

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectModal, setProjectModal] = useState({ open: false, mode: "create", project: null });
  const [statusModal, setStatusModal] = useState({ open: false, project: null, status: "planning", remark: "" });
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [managers, setManagers] = useState([]);
  const projectsRequestId = useRef(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const fetchManagers = async () => {
    try {
      const res = await getAllUsers({ page: 1, limit: 1000, isActive: true });
      if (res?.success) setManagers(res.users || []);
    } catch {
      // ignore non-critical error
    }
  };

  const fetchProjects = async (role = userRole, searchTerm = debouncedSearch) => {
    const requestId = ++projectsRequestId.current;
    try {
      setLoading(true);
      if (role === "admin") {
        const res = await getProjects({ page: 1, limit: 10, search: searchTerm, status, priority });
        if (res?.success) {
          if (requestId === projectsRequestId.current) setProjects(extractProjects(res));
        } else {
          if (requestId === projectsRequestId.current) {
            toast.error(res?.message || "Unable to load projects");
            setProjects([]);
          }
        }
      } else {
        const res = await getMyProjects();
        if (!res?.success) {
          if (requestId === projectsRequestId.current) {
            toast.error(res?.message || "Unable to load projects");
            setProjects([]);
          }
          return;
        }
        const projectList = extractProjects(res);
        const filtered = projectList.filter((project) => {
          const q = searchTerm.toLowerCase();
          const matchesSearch = !q || `${project.name || ""} ${project.code || ""} ${project.manager?.name || ""}`.toLowerCase().includes(q);
          return matchesSearch && (!status || project.status === status) && (!priority || project.priority === priority);
        });
        if (requestId === projectsRequestId.current) setProjects(filtered);
      }
    } catch (err) {
      if (requestId === projectsRequestId.current) {
        toast.error(err?.response?.data?.message || "Unable to load projects");
        setProjects([]);
      }
    } finally {
      if (requestId === projectsRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchManagers();
  }, [isAdmin]);

  useEffect(() => {
    if (!userRole) return undefined;
    fetchProjects(userRole, debouncedSearch);
    return () => {
      projectsRequestId.current += 1;
    };
  }, [debouncedSearch, status, priority, userRole]);

  const handleCreateOrUpdateProject = async (payload) => {
    try {
      const res = projectModal.project
        ? await updateProject(projectModal.project._id, payload)
        : await createProject(payload);

      if (res?.success) {
        toast.success(projectModal.project ? "Project updated" : "Project created");
        setProjectModal({ open: false, mode: "create", project: null });
        fetchProjects();
      } else {
        toast.error(res?.message || "Project action failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Project action failed");
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModal.project) return;
    try {
      const res = await updateProjectStatus(statusModal.project._id, {
        status: statusModal.status,
        remark: statusModal.remark || undefined,
      });
      if (res?.success) {
        toast.success("Project status updated");
        setStatusModal({ open: false, project: null, status: "planning", remark: "" });
        fetchProjects();
      } else {
        toast.error(res?.message || "Status update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const handleDeleteProject = async () => {
    if (!archiveTarget) return;
    try {
      const res = await deleteProject(archiveTarget._id);
      if (res?.success) {
        toast.success("Project archived");
        setArchiveTarget(null);
        fetchProjects();
      } else {
        toast.error(res?.message || "Archive failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Archive failed");
    }
  };

  const tableColumns = [
    {
      label: "Project",
      accessor: "name",
      render: (_, row) => (
        <div className="min-w-[220px]">
          <p className="text-sm font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-500">{row.code}</p>
        </div>
      ),
    },
    {
      label: "Manager",
      accessor: "manager",
      render: (value) => <span className="text-sm text-slate-700">{value?.name || "-"}</span>,
    },
    {
      label: "Status",
      accessor: "status",
      render: (value) => <StatusBadge value={value} />,
    },
    {
      label: "Priority",
      accessor: "priority",
      render: (value) => <PriorityBadge value={value} />,
    },
    {
      label: "Dates",
      accessor: "startDate",
      render: (_, row) => (
        <div className="text-xs text-slate-600">
          <div>{formatDate(row.startDate)}</div>
          <div>→ {formatDate(row.endDate)}</div>
        </div>
      ),
    },
    {
      label: "Assignment",
      accessor: "assignmentType",
      render: (value) => (
        <span className="text-sm text-slate-700 capitalize">{value || "all"}</span>
      ),
    },
    {
      label: "Actions",
      accessor: "_id",
      render: (_, row) => (
        <ActionDropdown
          openOn="click"
          triggerIcon={MoreVertical}
          triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          actions={[
            {
              label: "Open Project",
              icon: ChevronRight,
              onClick: () => navigate(`/projects/${row._id}`),
            },
            ...(isAdmin
              ? [
                {
                  label: "Edit Project",
                  icon: Pencil,
                  onClick: () =>
                    setProjectModal({
                      open: true,
                      mode: "edit",
                      project: row,
                    }),
                },
                {
                  label: "Change Status",
                  icon: CircleDashed,
                  onClick: () =>
                    setStatusModal({
                      open: true,
                      project: row,
                      status: row.status || "planning",
                      remark: "",
                    }),
                },
                { divider: true },
                {
                  label: "Archive Project",
                  icon: Trash2,
                  className: "text-red-600 hover:bg-red-50 cursor-pointer",
                  onClick: () => setArchiveTarget(row),
                },
              ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-800">Projects</h1>
        </div>

        {isAdmin && (
          <button type="button" onClick={() => setProjectModal({ open: true, mode: "create", project: null })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} />
            Create Project
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project or code" className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
            <option value="">All status</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
            <option value="">All priority</option>
            {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading projects...</div>
      ) : isAdmin ? (
        <CustomTable
          columns={tableColumns}
          data={projects}
          onRowClick={(row) => navigate(`/projects/${row._id}`)}
          defaultRowsPerPage={10}
          rowsPerPageOptions={[5, 10, 20]}
        />
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          You are not part of any project yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((project) => {
            const total = project.myTaskSummary?.total || 0;
            const done = project.myTaskSummary?.done || 0;
            const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

            return (
              <button
                key={project._id}
                type="button"
                onClick={() => navigate(`/projects/${project._id}`)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-800">{project.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{project.code || "-"}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <StatusBadge value={project.status} />
                    <PriorityBadge value={project.priority} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Manager</p>
                    <p className="mt-1 truncate text-slate-700">{project.manager?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">My role</p>
                    <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{project.myRole || "member"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Start</p>
                    <p className="mt-1 text-slate-700">{formatDate(project.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">End</p>
                    <p className="mt-1 text-slate-700">{formatDate(project.endDate)}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {total === 0 ? (
                    <p className="text-xs text-slate-500">No tasks assigned yet</p>
                  ) : (
                    <>
                      <div className="mb-2 flex justify-between text-xs text-slate-600">
                        <span>{done} of {total} tasks done</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <ProjectFormModal
          open={projectModal.open}
          mode={projectModal.mode}
          project={projectModal.project}
          managers={managers}
          onClose={() => setProjectModal({ open: false, mode: "create", project: null })}
          onSubmit={handleCreateOrUpdateProject}
        />
      )}

      {statusModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Change project status</h3>
              <button type="button" onClick={() => setStatusModal({ open: false, project: null, status: "planning", remark: "" })} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Status</span>
                <select value={statusModal.status} onChange={(e) => setStatusModal((prev) => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Remark</span>
                <textarea rows={3} value={statusModal.remark} onChange={(e) => setStatusModal((prev) => ({ ...prev, remark: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>

            <div className="sticky bottom-0 mt-5 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white pt-4">
              <button type="button" onClick={() => setStatusModal({ open: false, project: null, status: "planning", remark: "" })} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="button" onClick={handleUpdateStatus} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleDeleteProject}
        title="Archive Project"
        message="This will archive the project. Are you sure you want to continue?"
        confirmLabel="Archive"
      />
    </div>
  );
};

export default ProjectsPage;
