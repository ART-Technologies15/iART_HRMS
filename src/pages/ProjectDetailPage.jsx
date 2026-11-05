import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, UserPlus, Users, FolderKanban, Clock3,
  ChevronDown, ChevronRight, Search, Eye, ClipboardCheck, CircleDashed,
  FileText, FileImage, FileSpreadsheet, File, Link2, ExternalLink,
  Upload, X, Image as ImageIcon, FileType, Loader2,
  Pin, PinOff, Lock, StickyNote,
} from "lucide-react";
import { toast } from "react-toastify";
import CustomTable from "../components/CustomTable";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ProjectTaskModal from "../components/ProjectTaskModal";
import UpdateMyTaskStatusModal from "../components/UpdateMyTaskStatusModal";
import { ProjectFormModal } from "./ProjectsPage";
import { useAuth } from "../context/AuthContext";
import { getAllUsers } from "../api/authApi";
import {
  getProjectById,
  getProjectMembers,
  addProjectMembers,
  removeProjectMember,
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateMyTaskStatus,
  updateProject,
  assignTaskUsers,
  assignTaskToAll,
  uploadProjectFiles,
  addProjectLink,
  getProjectFiles,
  deleteProjectFile,
  createProjectNote,
  getProjectNotes,
  updateProjectNote,
  deleteProjectNote,
} from "../api/projectApi";
import ActionDropdown from "../reusableComponents/ActionDropdown";

const statusOptions = ["todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const priorityOptions = ["low", "medium", "high", "critical"];
const fileCategoryOptions = ["document", "design", "report", "other"];

const ALLOWED_FILE_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "gif", "tiff", "tif", "avif", "heic", "heif", "svg",
  "pdf",
  "doc", "docx",
  "xls", "xlsx", "csv",
  "ppt", "pptx",
  "txt",
];
const ALLOWED_MIME_PREFIXES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff", "image/avif",
  "image/heic", "image/heif", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "application/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const StatusBadge = ({ value }) => {
  const classes = {
    todo: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    in_review: "bg-violet-100 text-violet-700",
    blocked: "bg-rose-100 text-rose-700",
    done: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-200 text-gray-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${classes[value] || "bg-slate-100 text-slate-700"}`}>{value?.replace(/_/g, " ") || "-"}</span>;
};

const PriorityBadge = ({ value }) => {
  const classes = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${classes[value] || "bg-slate-100 text-slate-700"}`}>{value || "-"}</span>;
};

const CategoryBadge = ({ value }) => (
  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
    {value || "other"}
  </span>
);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NOTE_TITLE_MAX = 150;
const NOTE_CONTENT_MAX = 10000;

const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const defaultTaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  startDate: "",
  dueDate: "",
  section: "",
  parentTask: "",
  assignmentType: "specific",
  assigneeIds: [],
};

const normalizeMemberList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (Array.isArray(value.members)) return value.members;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.data?.members)) return value.data.members;
  return [];
};

const getFileIcon = (item) => {
  if (item.type === "link") {
    const provider = (item.provider || "").toLowerCase();
    if (provider.includes("sheet")) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
    if (provider.includes("doc")) return <FileText className="h-5 w-5 text-blue-600" />;
    if (provider.includes("slide")) return <FileType className="h-5 w-5 text-orange-600" />;
    if (provider.includes("form")) return <FileText className="h-5 w-5 text-violet-600" />;
    if (provider.includes("drive")) return <FolderKanban className="h-5 w-5 text-amber-600" />;
    if (provider.includes("figma")) return <ImageIcon className="h-5 w-5 text-pink-600" />;
    if (provider.includes("notion")) return <FileText className="h-5 w-5 text-slate-700" />;
    if (provider.includes("github")) return <File className="h-5 w-5 text-slate-800" />;
    if (provider.includes("microsoft")) return <FileSpreadsheet className="h-5 w-5 text-blue-700" />;
    return <Link2 className="h-5 w-5 text-slate-500" />;
  }
  const mime = (item.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return <FileImage className="h-5 w-5 text-sky-600" />;
  if (mime.includes("pdf")) return <FileText className="h-5 w-5 text-red-600" />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (mime.includes("word") || mime.includes("document") || mime.includes("text")) return <FileText className="h-5 w-5 text-blue-600" />;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return <FileType className="h-5 w-5 text-orange-600" />;
  return <File className="h-5 w-5 text-slate-500" />;
};

const isImageMime = (mime) => (mime || "").toLowerCase().startsWith("image/");

const validateClientFile = (file) => {
  if (file.size > MAX_FILE_SIZE) { return `"${file.name}" exceeds 10 MB (${formatFileSize(file.size)}).`; }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const mimeOk = ALLOWED_MIME_PREFIXES.some((m) => (file.type || "").toLowerCase() === m || (file.type || "").toLowerCase().startsWith(m.split("/")[0] + "/") && m.includes(file.type));
  const extOk = ALLOWED_FILE_EXTENSIONS.includes(ext);
  // Prefer extension when mime is empty (some browsers)
  if (!extOk && !mimeOk) {
    return `"${file.name}" has an unsupported type. Allowed: images, PDF, Word, Excel, CSV, PowerPoint, plain text.`;
  }
  if (!extOk && file.type && !ALLOWED_MIME_PREFIXES.includes(file.type.toLowerCase())) {
    // loose check for image/*
    if (!(file.type.toLowerCase().startsWith("image/") && ["jpeg", "jpg", "png", "webp", "gif", "tiff", "tif", "avif", "heic", "heif", "svg"].includes(ext))) {
      return `"${file.name}" has an unsupported type. Allowed: images, PDF, Word, Excel, CSV, PowerPoint, plain text.`;
    }
  }
  return null;
};

const TaskFormModal = ({ open, mode, task, projectId, parentTaskId = "", parentLocked = false, assignmentOnly = false, canManageHierarchy = false, onClose, onSubmit, users }) => {
  const [form, setForm] = useState(defaultTaskForm);
  const [parentTasks, setParentTasks] = useState([]);
  const [parentTasksLoading, setParentTasksLoading] = useState(false);
  const hasSubtasks = Number(task?.subtaskSummary?.total || 0) > 0;
  const isParentLocked = parentLocked || hasSubtasks;
  const isSubtaskForm = Boolean(parentTaskId || form.parentTask);

  useEffect(() => {
    if (!open) return;
    const taskParentId = task?.parentTask?._id || task?.parentTask || "";
    setForm(
      task
        ? {
          title: task.title || "",
          description: task.description || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          startDate: task.startDate ? task.startDate.slice(0, 10) : "",
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
          section: task.section || "",
          parentTask: parentTaskId || taskParentId,
          assignmentType: task.assignmentType || "specific",
          assigneeIds: task.assignments?.map((a) => a.user?._id || a._id || a).filter(Boolean) || [],
        }
        : { ...defaultTaskForm, parentTask: parentTaskId || "" }
    );
  }, [open, task, parentTaskId]);

  useEffect(() => {
    if (!open || !projectId || assignmentOnly) return undefined;
    let active = true;

    const fetchParentTasks = async () => {
      try {
        setParentTasksLoading(true);
        const res = await getProjectTasks(projectId, { topLevel: true, page: 1, limit: 1000 });
        if (!res?.success) {
          toast.error(res?.message || "Unable to load parent tasks");
          return;
        }
        const data = res.data || {};
        const parentOptions = Array.isArray(data) ? data : data.tasks || [];
        if (active) setParentTasks(parentOptions.filter((option) => option._id !== task?._id));
      } catch (err) {
        if (active) toast.error(err?.response?.data?.message || "Unable to load parent tasks");
      } finally {
        if (active) setParentTasksLoading(false);
      }
    };

    fetchParentTasks();
    return () => {
      active = false;
    };
  }, [open, projectId, task?._id, assignmentOnly]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="mb-5 flex shrink-0 items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{assignmentOnly ? "Assignment" : isSubtaskForm ? "Subtask" : mode === "create" ? "Create" : "Edit"} task</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">{assignmentOnly ? "Assign Task" : isSubtaskForm && mode === "create" ? "Add Subtask" : mode === "create" ? "New task" : task?.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50">Close</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
            {!assignmentOnly && <>
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Title</span>
                <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Description</span>
                <textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Status</span>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                    {statusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Priority</span>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                    {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Section</span>
                  <input value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Start date</span>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Due date</span>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
                </label>
              </div>

              {canManageHierarchy && (
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Parent task</span>
                  <select
                    value={form.parentTask || ""}
                    disabled={isParentLocked}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentTask: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="">{task?.parentTask ? "Convert to normal task" : "None (normal task)"}</option>
                    {parentTasks.map((parent) => <option key={parent._id} value={parent._id}>{parent.title}</option>)}
                  </select>
                  {parentTasksLoading && <span className="mt-1 block text-xs text-slate-500">Loading project tasks...</span>}
                  {hasSubtasks && <span className="mt-1 block text-xs text-amber-700">This task has subtasks, so it cannot become a subtask.</span>}
                  {parentLocked && <span className="mt-1 block text-xs text-slate-500">This subtask will be added under its selected parent.</span>}
                </label>
              )}
            </>}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Assignment type</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={form.assignmentType === "specific"} onChange={() => setForm((prev) => ({ ...prev, assignmentType: "specific" }))} />
                  Specific project members
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={form.assignmentType === "all"} onChange={() => setForm((prev) => ({ ...prev, assignmentType: "all" }))} />
                  All project members
                </label>
              </div>
            </div>

            {form.assignmentType === "specific" && (
              <AssigneePicker
                users={users}
                selectedIds={form.assigneeIds}
                onChange={(assigneeIds) => setForm((prev) => ({ ...prev, assigneeIds }))}
              />
            )}

          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{assignmentOnly ? "Save assignment" : mode === "create" ? isSubtaskForm ? "Create subtask" : "Create task" : "Save task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssigneePicker = ({ users, selectedIds, onChange }) => {
  const [search, setSearch] = useState("");
  const visibleUsers = users.filter((listedUser) =>
    `${listedUser.name || ""} ${listedUser.employeeId || ""} ${listedUser.role || ""} ${listedUser.department || ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const toggleUser = (userId) => {
    const id = String(userId);
    onChange(selectedIds.some((selectedId) => String(selectedId) === id)
      ? selectedIds.filter((selectedId) => String(selectedId) !== id)
      : [...selectedIds, id]);
  };

  return (
    <div className="text-sm text-slate-700">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-medium">Project members</span>
        <span className="text-xs text-slate-500">{selectedIds.length} selected</span>
      </div>
      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((selectedId) => {
            const selectedUser = users.find((option) => String(option._id) === String(selectedId));
            return (
              <span key={selectedId} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                <span className="max-w-[220px] truncate">{selectedUser?.name || "Selected employee"}</span>
                <button type="button" onClick={() => toggleUser(selectedId)} aria-label={`Remove ${selectedUser?.name || "selected employee"}`} className="font-semibold text-blue-500 hover:text-blue-800">×</button>
              </span>
            );
          })}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-300">
        <div className="relative border-b border-slate-200">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees by name, ID or department"
            className="w-full py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {visibleUsers.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No employees found.</p>
          ) : visibleUsers.map((listedUser) => {
            const checked = selectedIds.some((selectedId) => String(selectedId) === String(listedUser._id));
            return (
              <label key={listedUser._id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleUser(listedUser._id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">{listedUser.name || "Employee"}</span>
                  <span className="block truncate text-xs text-slate-500">{[listedUser.employeeId, listedUser.designation, listedUser.department || listedUser.role].filter(Boolean).join(" · ")}</span>
                </span>
                {checked && <span className="text-[10px] font-medium text-blue-600">Selected</span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Upload Files Modal ─── */
const UploadFilesModal = ({ open, onClose, onSuccess, projectId, tasks = [], lockedTaskId = null }) => {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState(lockedTaskId || "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setCategory("other");
    setDescription("");
    setTaskId(lockedTaskId || "");
    setErrors([]);
    setSubmitting(false);
  }, [open, lockedTaskId]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const nextErrors = [];
    const accepted = [];
    const currentCount = files.length;

    for (const file of incoming) {
      if (currentCount + accepted.length >= MAX_FILES) {
        nextErrors.push(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }
      const err = validateClientFile(file);
      if (err) nextErrors.push(err);
      else accepted.push(file);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
    setErrors(nextErrors);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setErrors(["Select at least one file."]);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      const extra = {
        category: category || "other",
        description: description || undefined,
        taskId: taskId || undefined,
      };
      const res = await uploadProjectFiles(projectId, files, extra);
      if (res?.success) {
        toast.success(files.length === 1 ? "File uploaded" : `${files.length} files uploaded`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="mb-4 flex shrink-0 items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Files</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Upload files</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"}`}
            >
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">Drag & drop files here, or</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 text-sm font-medium text-blue-600 hover:underline">
                browse
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif,.tiff,.tif,.avif,.heic,.heif,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,image/*,application/pdf"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <p className="mt-2 text-xs text-slate-400">Max {MAX_FILES} files · 10 MB each · images, PDF, Office, text</p>
            </div>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(index)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label="Remove file">
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errors.length > 0 && (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                {errors.map((msg, i) => (
                  <p key={i} className="text-xs text-amber-800">{msg}</p>
                ))}
              </div>
            )}

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                {fileCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Description <span className="font-normal text-slate-400">(optional)</span></span>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Task</span>
              <select
                value={taskId}
                disabled={Boolean(lockedTaskId)}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Whole project</option>
                {tasks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
              {lockedTaskId && <span className="mt-1 block text-xs text-slate-500">Attached to this task.</span>}
            </label>
          </div>

          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting || files.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Add Link Modal ─── */
const AddLinkModal = ({ open, onClose, onSuccess, projectId, tasks = [], lockedTaskId = null }) => {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState(lockedTaskId || "");
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setName("");
    setCategory("other");
    setDescription("");
    setTaskId(lockedTaskId || "");
    setUrlError("");
    setSubmitting(false);
  }, [open, lockedTaskId]);

  const validateUrl = (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "URL is required.";
    if (!/^https?:\/\//i.test(trimmed)) return "URL must start with http:// or https://";
    try {
      // Keep exact string; only validate structure
      // eslint-disable-next-line no-new
      new URL(trimmed);
      return "";
    } catch {
      return "Enter a valid URL.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) {
      setUrlError(err);
      return;
    }
    setUrlError("");
    setSubmitting(true);
    try {
      const payload = {
        url: url.trim(), // keep exactly as pasted
        name: name.trim() || undefined,
        category: category || "other",
        description: description.trim() || undefined,
        taskId: taskId || undefined,
      };
      const res = await addProjectLink(projectId, payload);
      if (res?.success) {
        toast.success("Link added");
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Unable to add link");
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      if (status === 409) {
        toast.error(message || "This link has already been added");
      } else {
        toast.error(message || "Unable to add link");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="mb-4 flex shrink-0 items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Links</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Add link</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">URL</span>
              <input
                required
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                placeholder="https://docs.google.com/spreadsheets/..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              {urlError && <span className="mt-1 block text-xs text-red-600">{urlError}</span>}
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Name <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Defaults to the site name, e.g. Google Sheet"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                {fileCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Description <span className="font-normal text-slate-400">(optional)</span></span>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Task</span>
              <select
                value={taskId}
                disabled={Boolean(lockedTaskId)}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Whole project</option>
                {tasks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
              {lockedTaskId && <span className="mt-1 block text-xs text-slate-500">Attached to this task.</span>}
            </label>
          </div>

          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Adding…" : "Add link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Single file/link row (shared by tab + task modal) ─── */
const FileLinkRow = ({ item, currentUser, isAdmin, compact = false, onDelete, onOpen }) => {
  const canDelete =
    isAdmin ||
    String(item.uploadedBy?._id || item.uploadedBy) === String(currentUser?._id || "");

  const uploader = item.uploadedBy || {};
  const uploaderName = uploader.name || "Unknown";
  const initials = uploaderName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex flex-col gap-3 rounded-lg border border-slate-200 bg-white ${compact ? "p-3" : "p-4"} sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {item.type === "file" && isImageMime(item.mimeType) && item.url ? (
            <img src={item.url} alt="" className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50">
              {getFileIcon(item)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-800">{item.name || (item.type === "link" ? "Link" : "File")}</p>
            <CategoryBadge value={item.category} />
            {item.task?.title ? (
              <span className="inline-flex max-w-[160px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700" title={item.task.title}>
                {item.task.title}
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Project</span>
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              {uploader.profilePhoto ? (
                <img src={uploader.profilePhoto} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[9px] font-semibold text-sky-700">{initials || "U"}</span>
              )}
              {uploaderName}
            </span>
            <span>·</span>
            <span>{formatDate(item.createdAt)}</span>
            {item.type === "file" && item.size != null && (
              <>
                <span>·</span>
                <span>{formatFileSize(item.size)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink size={14} />
          Open
        </a>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Files tab panel ─── */
const ProjectFilesPanel = ({
  projectId,
  tasks,
  currentUser,
  isAdmin,
  onOpenUpload,
  onOpenLink,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // "", "file", "link"
  const [categoryFilter, setCategoryFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState(""); // "", "none", or taskId
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

  const loadFiles = useCallback(async (requestedPage = page) => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: requestedPage,
        limit,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(taskFilter && { task: taskFilter }),
      };
      const res = await getProjectFiles(projectId, params);
      if (res?.success) {
        const data = res.data || {};
        setItems(Array.isArray(data.files) ? data.files : []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      } else {
        setItems([]);
        setError(res?.message || "Unable to load files");
        toast.error(res?.message || "Unable to load files");
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Unable to load files";
      setItems([]);
      if (status === 403 || status === 404) {
        setError("You do not have access to these files, or they are unavailable.");
      } else {
        setError(message);
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, limit, search, typeFilter, categoryFilter, taskFilter]);

  useEffect(() => {
    loadFiles(1);
    setPage(1);
  }, [projectId, search, typeFilter, categoryFilter, taskFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) loadFiles(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteProjectFile(projectId, deleteTarget._id);
      if (res?.success) {
        toast.success(deleteTarget.type === "link" ? "Link removed" : "File deleted");
        setDeleteTarget(null);
        await loadFiles(page);
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const refresh = () => {
    setPage(1);
    loadFiles(1);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search files & links"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All types</option>
            <option value="file">Files</option>
            <option value="link">Links</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All categories</option>
            {fileCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All (project + tasks)</option>
            <option value="none">Project-level only</option>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>{t.title}</option>
            ))}
          </select>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload size={16} />
            Upload Files
          </button>
          <button
            type="button"
            onClick={onOpenLink}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Link2 size={16} />
            Add Link
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />
          Loading files…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No files or links yet</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={onOpenUpload} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Upload size={16} /> Upload Files
            </button>
            <button type="button" onClick={onOpenLink} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Link2 size={16} /> Add Link
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <FileLinkRow
                key={item._id}
                item={item}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 text-sm text-slate-600">
              <span>{total} item{total === 1 ? "" : "s"}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>Page {page} of {pages}</span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === "link" ? "Remove link" : "Delete file"}
        message={
          deleteTarget?.type === "link"
            ? "Remove this link from the project?"
            : "Delete this file? It will be removed permanently."
        }
        confirmLabel={deleteTarget?.type === "link" ? "Remove" : "Delete"}
      />

      {/* expose refresh via ref pattern — parent calls via key or callback */}
      <span className="hidden" data-refresh={refresh} />
    </section>
  );
};

/* ─── Note form modal (create / edit) ─── */
const NoteFormModal = ({ open, mode, note, projectId, tasks = [], lockedTaskId = null, onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setTaskId(note.task?._id || note.task || lockedTaskId || "");
      setIsPinned(Boolean(note.isPinned));
    } else {
      setTitle("");
      setContent("");
      setTaskId(lockedTaskId || "");
      setIsPinned(false);
    }
    setContentError("");
    setSubmitting(false);
  }, [open, mode, note, lockedTaskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedContent = (content || "").trim();
    if (!trimmedContent) {
      setContentError("Content is required.");
      return;
    }
    if (trimmedContent.length > NOTE_CONTENT_MAX) {
      setContentError(`Content must be at most ${NOTE_CONTENT_MAX.toLocaleString()} characters.`);
      return;
    }
    if ((title || "").length > NOTE_TITLE_MAX) {
      toast.error(`Title must be at most ${NOTE_TITLE_MAX} characters.`);
      return;
    }
    setContentError("");
    setSubmitting(true);
    try {
      if (mode === "edit" && note?._id) {
        const payload = {
          title: (title || "").trim() || "",
          content: trimmedContent,
          isPinned: Boolean(isPinned),
          taskId: taskId ? taskId : null,
        };
        const res = await updateProjectNote(projectId, note._id, payload);
        if (res?.success) {
          toast.success("Note updated");
          onSuccess?.();
          onClose();
        } else {
          toast.error(res?.message || "Unable to update note");
        }
      } else {
        const payload = {
          title: (title || "").trim() || undefined,
          content: trimmedContent,
          isPinned: Boolean(isPinned) || undefined,
          taskId: taskId || undefined,
        };
        const res = await createProjectNote(projectId, payload);
        if (res?.success) {
          toast.success("Note added");
          onSuccess?.();
          onClose();
        } else {
          toast.error(res?.message || "Unable to create note");
        }
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      if (status === 404) {
        toast.error(message || "Note not found");
        onSuccess?.();
        onClose();
      } else {
        toast.error(message || (mode === "edit" ? "Unable to update note" : "Unable to create note"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="mb-4 flex shrink-0 items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My notes</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">{mode === "edit" ? "Edit note" : "Add note"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Title <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                value={title}
                maxLength={NOTE_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled note"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-slate-400">{title.length}/{NOTE_TITLE_MAX}</span>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Content</span>
              <textarea
                required
                rows={8}
                value={content}
                maxLength={NOTE_CONTENT_MAX}
                onChange={(e) => { setContent(e.target.value); setContentError(""); }}
                placeholder="Write your private note…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                {contentError ? <span className="text-xs text-red-600">{contentError}</span> : <span />}
                <span className="text-xs text-slate-400">{content.length.toLocaleString()}/{NOTE_CONTENT_MAX.toLocaleString()}</span>
              </div>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Task</span>
              <select
                value={taskId}
                disabled={Boolean(lockedTaskId)}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Whole project</option>
                {tasks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
              {lockedTaskId && <span className="mt-1 block text-xs text-slate-500">Linked to this task.</span>}
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Pin this note
            </label>
          </div>

          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving…" : mode === "edit" ? "Save note" : "Add note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Note card ─── */
const NoteCard = ({ note, onEdit, onDelete, onTogglePin, pinningId }) => {
  const [expanded, setExpanded] = useState(false);
  const content = note.content || "";
  const lines = content.split(/\r?\n/);
  const isLong = lines.length > 3 || content.length > 280;
  const preview = isLong && !expanded
    ? lines.slice(0, 3).join("\n").slice(0, 280) + (content.length > 280 || lines.length > 3 ? "…" : "")
    : content;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {note.isPinned ? (
              <Pin className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" aria-label="Pinned" />
            ) : null}
            <p className="truncate text-sm font-semibold text-slate-800">{note.title?.trim() || "Untitled note"}</p>
            {note.task?.title ? (
              <span className="inline-flex max-w-[160px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700" title={note.task.title}>
                {note.task.title}
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Project</span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">{preview || "—"}</p>
          {isLong && (
            <span className="mt-1 inline-block text-xs font-medium text-blue-600">{expanded ? "Show less" : "Show more"}</span>
          )}
          <p className="mt-2 text-xs text-slate-400">Edited {formatDateTime(note.updatedAt || note.createdAt)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={note.isPinned ? "Unpin" : "Pin"}
            aria-label={note.isPinned ? "Unpin note" : "Pin note"}
            disabled={pinningId === note._id}
            onClick={() => onTogglePin(note)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {pinningId === note._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            type="button"
            title="Edit note"
            aria-label="Edit note"
            onClick={() => onEdit(note)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            title="Delete note"
            aria-label="Delete note"
            onClick={() => onDelete(note)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectDetailsModal = ({
  open,
  onClose,
  projectInfo,
  memberCount,
  members = [],
  canManage = false,
  showMyTasks = false,
  taskStats = [],
  taskStatTotal = 0,
  onAddMembers,
  onRemoveMember,
}) => {
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("overview");
      setSearch("");
      setRemoveTarget(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !removeTarget) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, removeTarget, onClose]);

  if (!open) return null;

  const manager = projectInfo?.manager || null;
  const managerId = String(manager?._id || "");

  const memberRows = members
    .map((member) => {
      const person = member.user || member;
      return {
        id: String(person._id || member._id || ""),
        name: person.name || member.name || "Member",
        role: person.role || member.role || "Employee",
        employeeId: person.employeeId || member.employeeId || "",
      };
    })
    .filter((row) => row.id && row.id !== managerId)
    .filter((row) =>
      `${row.name} ${row.employeeId} ${row.role}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );

  const totalMembers = memberCount ?? memberRows.length;

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      await onRemoveMember(removeTarget.id);
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "members", label: `Members (${totalMembers})` },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Project details
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {projectInfo?.code || "—"}
            </p>
            <h2 className="mt-0.5 truncate text-xl font-semibold text-slate-800">
              {projectInfo?.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge value={projectInfo?.status} />
              <PriorityBadge value={projectInfo?.priority} />
              {projectInfo?.myRole && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                  {projectInfo.myRole}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="shrink-0 border-b border-slate-200 px-6">
          <div className="flex gap-5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  tab === t.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Manager",
                    value: manager?.name || "-",
                    sub: manager?.employeeId || "",
                  },
                  { label: "Department", value: projectInfo?.department || "-" },
                  {
                    label: "Dates",
                    value: `${formatDate(projectInfo?.startDate)} – ${formatDate(projectInfo?.endDate)}`,
                  },
                  {
                    label: "Assignment",
                    value: projectInfo?.assignmentType || "specific",
                    capitalize: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {item.label}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium text-slate-700 ${
                        item.capitalize ? "capitalize" : ""
                      }`}
                    >
                      {item.value}
                    </p>
                    {item.sub && (
                      <p className="text-xs text-slate-500">{item.sub}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {projectInfo?.description ||
                    "No project description added yet."}
                </p>
              </div>

              {showMyTasks && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      My tasks
                    </h3>
                    <span className="text-xs text-slate-500">
                      {taskStatTotal} total
                    </span>
                  </div>
                  {taskStats.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No tasks assigned yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {taskStats.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <StatusBadge value={item._id} />
                          <span className="text-sm font-semibold text-slate-700">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {projectInfo?.assignmentType === "all" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  All employees are included in this project.
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members"
                    className="w-full rounded-lg border border-slate-300 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={onAddMembers}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <UserPlus size={15} />
                    Add members
                  </button>
                )}
              </div>

              {manager && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {manager.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[manager.employeeId, manager.designation]
                        .filter(Boolean)
                        .join(" · ") || "Project manager"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    Manager
                  </span>
                </div>
              )}

              {memberRows.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  {search
                    ? "No members match your search."
                    : "No members assigned yet."}
                </p>
              ) : (
                memberRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {row.name}
                      </p>
                      <p className="truncate text-xs capitalize text-slate-500">
                        {[row.employeeId, row.role].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(row)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            {tab === "members" ? (
              <>
                <span className="font-semibold text-slate-700">
                  {memberRows.length}
                </span>{" "}
                member{memberRows.length === 1 ? "" : "s"}
                {search.trim() ? " matching search" : ""}
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">
                  {totalMembers}
                </span>{" "}
                project member{totalMembers === 1 ? "" : "s"}
              </>
            )}
          </p>
          <div className="flex gap-2">
            {canManage && tab === "members" && (
              <button
                type="button"
                onClick={onAddMembers}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserPlus size={15} />
                Add members
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!removeTarget}
        onClose={() => !removing && setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove member"
        message={`Remove ${removeTarget?.name || "this member"} from the project? They will lose access to the project's tasks.`}
        confirmLabel="Remove"
      />
    </div>
  );
};

/* ─── My Notes tab panel ─── */
const ProjectNotesPanel = ({ projectId, tasks, onOpenCreate, onOpenEdit }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pinningId, setPinningId] = useState(null);
  const searchTimer = useRef(null);

  const loadNotes = useCallback(async (requestedPage = page) => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: requestedPage,
        limit,
        ...(search && { search }),
        ...(taskFilter && { task: taskFilter }),
        ...(pinnedOnly && { pinned: true }),
      };
      const res = await getProjectNotes(projectId, params);
      if (res?.success) {
        const data = res.data || {};
        setItems(Array.isArray(data.notes) ? data.notes : []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      } else {
        setItems([]);
        setError(res?.message || "Unable to load notes");
        toast.error(res?.message || "Unable to load notes");
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Unable to load notes";
      setItems([]);
      setError(status === 403 || status === 404
        ? "You do not have access to these notes, or they are unavailable."
        : message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, limit, search, taskFilter, pinnedOnly]);

  useEffect(() => {
    loadNotes(1);
    setPage(1);
  }, [projectId, search, taskFilter, pinnedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) loadNotes(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const handleTogglePin = async (note) => {
    try {
      setPinningId(note._id);
      const res = await updateProjectNote(projectId, note._id, { isPinned: !note.isPinned });
      if (res?.success) {
        toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
        await loadNotes(page);
      } else {
        toast.error(res?.message || "Unable to update pin");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        toast.error("Note not found");
        await loadNotes(page);
      } else {
        toast.error(err?.response?.data?.message || "Unable to update pin");
      }
    } finally {
      setPinningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteProjectNote(projectId, deleteTarget._id);
      if (res?.success) {
        toast.success("Note deleted");
        setDeleteTarget(null);
        await loadNotes(page);
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        toast.error("Note not found");
        setDeleteTarget(null);
        await loadNotes(page);
      } else {
        toast.error(err?.response?.data?.message || "Delete failed");
      }
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Only you can see these notes</span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search notes"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All (project + tasks)</option>
            <option value="none">Whole project only</option>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>{t.title}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={pinnedOnly}
              onChange={(e) => setPinnedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Pinned only
          </label>
        </div>
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />
          Loading notes…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <StickyNote className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No notes yet. Add a note to keep track of things for this project.</p>
          <button type="button" onClick={onOpenCreate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} /> Add Note
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                pinningId={pinningId}
                onEdit={onOpenEdit}
                onDelete={setDeleteTarget}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 text-sm text-slate-600">
              <span>{total} note{total === 1 ? "" : "s"}</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
                <span>Page {page} of {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete note"
        message="Delete this note? This cannot be undone."
        confirmLabel="Delete"
      />
    </section>
  );
};

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageProject = isAdmin || user?.role === "hr";
  const [project, setProject] = useState(null);
  const [projectError, setProjectError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskFilters, setTaskFilters] = useState({ status: "", priority: "", section: "", search: "" });
  const [taskPage, setTaskPage] = useState(1);
  const [taskLimit, setTaskLimit] = useState(10);
  const [taskPages, setTaskPages] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState(() => new Set());
  const [subtasksByParent, setSubtasksByParent] = useState({});
  const [subtasksLoading, setSubtasksLoading] = useState({});
  const [taskModal, setTaskModal] = useState({ open: false, mode: "create", task: null, parentTaskId: "", parentLocked: false, assignmentOnly: false });
  const [memberModal, setMemberModal] = useState({ open: false, selectedUserIds: [] });
  const [memberSearch, setMemberSearch] = useState("");
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [taskStatusModal, setTaskStatusModal] = useState({ open: false, task: null, status: "todo", remark: "" });
  const [taskDelete, setTaskDelete] = useState(null);
  const [viewTaskId, setViewTaskId] = useState(null);
  const [myStatusTask, setMyStatusTask] = useState(null);
  const [taskDetailRefreshToken, setTaskDetailRefreshToken] = useState(0);

  const [detailsOpen, setDetailsOpen] = useState(false);

  // Files & Links
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [filesPanelKey, setFilesPanelKey] = useState(0);
  const [lockedTaskForFiles, setLockedTaskForFiles] = useState(null);

  // My Notes
  const [noteModal, setNoteModal] = useState({ open: false, mode: "create", note: null });
  const [notesPanelKey, setNotesPanelKey] = useState(0);
  const [lockedTaskForNotes, setLockedTaskForNotes] = useState(null);

  const loadProject = async () => {
    try {
      const res = await getProjectById(projectId);
      if (res?.success) {
        const data = res.data || {};
        setProject({
          ...data,
          project: data.project || data,
          taskStats: data.taskStats || [],
          memberCount: data.memberCount ?? data.project?.members?.length ?? 0,
        });
        setProjectError("");
      } else {
        const message = res?.message || "Unable to load project";
        setProjectError(message);
        toast.error(message);
      }
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || "Unable to load project";
      setProjectError(statusCode === 403 || statusCode === 404
        ? "This project is unavailable or you do not have access to it."
        : message);
      toast.error(message);
    }
  };

  const loadTasks = async (requestedPage = taskPage) => {
    try {
      const params = isAdmin
        ? { page: 1, limit: 200, topLevel: true }
        : {
          page: requestedPage,
          limit: taskLimit,
          topLevel: true,
          status: taskFilters.status,
          priority: taskFilters.priority,
          section: taskFilters.section,
          search: taskFilters.search,
        };
      const res = await getProjectTasks(projectId, params);
      if (res?.success) {
        const data = res.data || {};
        const taskList = Array.isArray(data) ? data : data.tasks || [];
        setTasks(taskList);
        if (!isAdmin) {
          setTaskPages(data.pages || data.totalPages || data.pagination?.pages || data.pagination?.totalPages || 1);
          setTaskTotal(data.total || data.totalRecords || data.pagination?.total || data.pagination?.totalRecords || taskList.length);
        }
      } else {
        setTasks([]);
        toast.error(res?.message || "Unable to load project tasks");
      }
    } catch (err) {
      setTasks([]);
      toast.error(err?.response?.data?.message || "Unable to load project tasks");
    }
  };

  const loadMembers = async () => {
    try {
      const memberRes = await getProjectMembers(projectId);
      if (memberRes?.success === false) {
        setMembers([]);
        toast.error(memberRes.message || "Unable to load project members");
        return;
      }
      const nextMembers = normalizeMemberList(memberRes?.data ?? memberRes);
      setMembers(nextMembers);
    } catch (err) {
      setMembers([]);
      toast.error(err?.response?.data?.message || "Unable to load project members");
    }
  };

  const loadUsers = async () => {
    if (!canManageProject) return;
    try {
      const res = await getAllUsers({ page: 1, limit: 1000, isActive: true });
      if (res?.success) setUsers(res.users || []);
    } catch (err) {
      setUsers([]);
      toast.error(err?.response?.data?.message || "Unable to load users");
    }
  };

  useEffect(() => {
    if (!projectId) return;
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadProject(), loadMembers(), loadUsers()]);
      setLoading(false);
    };
    loadAll();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadTasks(1);
    if (!isAdmin) setTaskPage(1);
  }, [projectId, isAdmin, taskLimit, taskFilters.status, taskFilters.priority, taskFilters.section, taskFilters.search]);

  useEffect(() => {
    if (!isAdmin && taskPage > 1) loadTasks(taskPage);
  }, [taskPage]);

  const loadSubtasks = async (parentTaskId) => {
    try {
      setSubtasksLoading((prev) => ({ ...prev, [parentTaskId]: true }));
      const res = await getProjectTasks(projectId, { parentTask: parentTaskId, page: 1, limit: 100 });
      if (res?.success) {
        const data = res.data || {};
        const children = Array.isArray(data) ? data : data.tasks || [];
        setSubtasksByParent((prev) => ({ ...prev, [parentTaskId]: children }));
      } else {
        toast.error(res?.message || "Unable to load subtasks");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load subtasks");
    } finally {
      setSubtasksLoading((prev) => ({ ...prev, [parentTaskId]: false }));
    }
  };

  const toggleSubtasks = (taskId) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else {
        next.add(taskId);
        if (!subtasksByParent[taskId] && !subtasksLoading[taskId]) loadSubtasks(taskId);
      }
      return next;
    });
  };

  const refreshTaskData = async (changedTask) => {
    await Promise.all([
      loadTasks(isAdmin ? 1 : taskPage),
      loadProject(),
    ]);

    const parentId = changedTask?.parentTask?._id || changedTask?.parentTask;
    if (parentId) await loadSubtasks(parentId);
    if (changedTask?._id && (subtasksByParent[changedTask._id] || Number(changedTask.subtaskSummary?.total || 0) > 0)) {
      await loadSubtasks(changedTask._id);
    }
    setTaskDetailRefreshToken((prev) => prev + 1);
  };

  const handleCreateTask = async (payload) => {
    try {
      if (taskModal.assignmentOnly && taskModal.task) {
        const assignmentRes = payload.assignmentType === "all"
          ? await assignTaskToAll(taskModal.task._id)
          : await assignTaskUsers(taskModal.task._id, { userIds: payload.assigneeIds || [], switchToSpecific: true });

        if (!assignmentRes?.success) {
          toast.error(assignmentRes?.message || "Unable to assign task");
          return;
        }

        toast.success("Task assignments updated");
        setTaskModal({ open: false, mode: "create", task: null, parentTaskId: "", parentLocked: false, assignmentOnly: false });
        await refreshTaskData(taskModal.task);
        return;
      }

      const normalized = {
        ...payload,
        startDate: payload.startDate || undefined,
        dueDate: payload.dueDate || undefined,
        parentTask: payload.parentTask || null,
        assignmentType: payload.assignmentType || "specific",
        assigneeIds: payload.assignmentType === "all" ? [] : payload.assigneeIds || [],
      };
      const res = taskModal.task ? await updateTask(taskModal.task._id, normalized) : await createTask(projectId, normalized);
      if (res?.success) {
        const parentIds = [
          taskModal.task?.parentTask?._id || taskModal.task?.parentTask,
          normalized.parentTask,
        ].filter(Boolean);
        toast.success(taskModal.task ? "Task updated" : normalized.parentTask ? "Subtask created" : "Task created");
        setTaskModal({ open: false, mode: "create", task: null, parentTaskId: "", parentLocked: false, assignmentOnly: false });
        await Promise.all([loadTasks(isAdmin ? 1 : taskPage), loadProject()]);
        for (const parentId of new Set(parentIds)) {
          await loadSubtasks(parentId);
        }
        if (taskModal.task?._id && (subtasksByParent[taskModal.task._id] || Number(taskModal.task.subtaskSummary?.total || 0) > 0)) {
          await loadSubtasks(taskModal.task._id);
        }
        if (normalized.parentTask) {
          setExpandedTasks((prev) => new Set(prev).add(normalized.parentTask));
        }
        setTaskDetailRefreshToken((prev) => prev + 1);
      } else {
        toast.error(res?.message || "Task action failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Task action failed");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskDelete) return;
    const deletedTask = taskDelete;
    const parentId = deletedTask.parentTask?._id || deletedTask.parentTask;
    try {
      const res = await deleteTask(deletedTask._id);
      if (res?.success) {
        toast.success(Number(deletedTask.subtaskSummary?.total || 0) > 0
          ? `Task and ${deletedTask.subtaskSummary.total} subtasks archived`
          : "Task archived");
        setTaskDelete(null);
        setExpandedTasks((prev) => {
          const next = new Set(prev);
          next.delete(deletedTask._id);
          return next;
        });
        setSubtasksByParent((prev) => {
          const next = { ...prev };
          delete next[deletedTask._id];
          return next;
        });
        await Promise.all([loadTasks(isAdmin ? 1 : taskPage), loadProject()]);
        if (parentId) await loadSubtasks(parentId);
        setTaskDetailRefreshToken((prev) => prev + 1);
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const handleStatusUpdate = async () => {
    if (!taskStatusModal.task) return;
    try {
      const res = await updateTaskStatus(taskStatusModal.task._id, { status: taskStatusModal.status, remark: taskStatusModal.remark || undefined });
      if (res?.success) {
        toast.success("Task status updated");
        setTaskStatusModal({ open: false, task: null, status: "todo", remark: "" });
        await refreshTaskData(taskStatusModal.task);
      } else {
        toast.error(res?.message || "Status update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const handleMyStatusUpdate = async (payload) => {
    if (!myStatusTask) return;
    try {
      const res = await updateMyTaskStatus(myStatusTask._id, payload);
      if (res?.success) {
        toast.success("Your task status was updated");
        setMyStatusTask(null);
        await refreshTaskData(myStatusTask);
      } else {
        toast.error(res?.message || "Status update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const handleAddMember = async () => {
    const managerId = project?.project?.manager?._id || project?.manager?._id;
    const userIds = memberModal.selectedUserIds.filter((userId) => userId !== managerId);
    if (userIds.length === 0) {
      toast.error("Select at least one employee to add.");
      return;
    }
    try {
      const res = await addProjectMembers(projectId, { userIds, role: "member" });
      if (res?.success) {
        toast.success(userIds.length === 1 ? "Member added" : "Members added");
        setMemberModal({ open: false, selectedUserIds: [] });
        setMemberSearch("");
        await Promise.all([loadMembers(), loadProject()]);
      } else {
        toast.error(res?.message || "Unable to add member");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const res = await removeProjectMember(projectId, userId);
      if (res?.success) {
        toast.success("Member removed");
        loadMembers();
      } else {
        toast.error(res?.message || "Unable to remove member");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to remove member");
    }
  };

  const handleUpdateProject = async (payload) => {
    try {
      const res = await updateProject(projectInfo._id, payload);
      if (res?.success) {
        toast.success("Project updated");
        setEditProjectOpen(false);
        await Promise.all([loadProject(), loadMembers()]);
      } else {
        toast.error(res?.message || "Unable to update project");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update project");
    }
  };

  const handleTaskDetailChanged = async (changedTask) => {
    if (!changedTask) return;
    await Promise.all([loadTasks(isAdmin ? 1 : taskPage), loadProject()]);
    const parentId = changedTask.parent?._id || changedTask.parentTask?._id || changedTask.parentTask;
    if (parentId) await loadSubtasks(parentId);
    if (Number(changedTask.subtaskSummary?.total || 0) > 0) await loadSubtasks(changedTask._id);
  };

  const refreshFilesPanel = () => {
    setFilesPanelKey((k) => k + 1);
    setTaskDetailRefreshToken((t) => t + 1);
  };

  const refreshNotesPanel = () => {
    setNotesPanelKey((k) => k + 1);
    setTaskDetailRefreshToken((t) => t + 1);
  };

  const openUploadForTask = (taskId) => {
    setLockedTaskForFiles(taskId || null);
    setUploadModalOpen(true);
  };

  const openLinkForTask = (taskId) => {
    setLockedTaskForFiles(taskId || null);
    setLinkModalOpen(true);
  };

  const openCreateNote = (taskId = null) => {
    setLockedTaskForNotes(taskId || null);
    setNoteModal({ open: true, mode: "create", note: null });
  };

  const openEditNote = (note) => {
    setLockedTaskForNotes(null);
    setNoteModal({ open: true, mode: "edit", note });
  };

  const normalizedMembers = useMemo(() => normalizeMemberList(members), [members]);
  const projectMemberIds = useMemo(
    () => new Set(normalizedMembers.map((member) => String(member.user?._id || member._id || member))),
    [normalizedMembers]
  );
  const taskAssignableMembers = useMemo(
    () => users.filter((listedUser) => projectMemberIds.has(String(listedUser._id))),
    [users, projectMemberIds]
  );

  const membersNotInProject = useMemo(
    () => users.filter((listedUser) =>
      String(listedUser._id) !== String(project?.project?.manager?._id || project?.manager?._id || "") &&
      !normalizedMembers.some((member) => String(member.user?._id || member._id || member) === String(listedUser._id))
    ),
    [users, normalizedMembers, project]
  );

  const displayedMembers = normalizedMembers.filter((member) =>
    String(member.user?._id || member._id || member) !== String(project?.project?.manager?._id || project?.manager?._id || "")
  );

  const visibleAddableMembers = membersNotInProject.filter((listedUser) =>
    `${listedUser.name || ""} ${listedUser.employeeId || ""} ${listedUser.role || ""}`
      .toLowerCase()
      .includes(memberSearch.trim().toLowerCase())
  );

  const getMyAssignment = (task) => task.assignments?.find((assignment) => {
    const assignedUserId = assignment.user?._id || assignment.user;
    return String(assignedUserId || "") === String(user?._id || "");
  });

  const loadTaskForModal = async (taskRow) => {
    try {
      const res = await getTaskById(taskRow._id);
      if (!res?.success) {
        toast.error(res?.message || "Unable to load task details");
        return null;
      }
      const data = res.data || {};
      const fullTask = data.task || taskRow;
      return {
        ...fullTask,
        parentTask: data.parent?._id || fullTask.parentTask || null,
        assignments: data.assignments || fullTask.assignments || taskRow.assignments || [],
        subtaskSummary: data.subtaskSummary || fullTask.subtaskSummary || taskRow.subtaskSummary,
      };
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load task details");
      return null;
    }
  };

  const openTaskEditor = async (task) => {
    const fullTask = await loadTaskForModal(task);
    if (fullTask) setTaskModal({ open: true, mode: "edit", task: fullTask, parentTaskId: "", parentLocked: false, assignmentOnly: false });
  };

  const openTaskAssignment = async (task) => {
    const fullTask = await loadTaskForModal(task);
    if (fullTask) setTaskModal({ open: true, mode: "assign", task: fullTask, parentTaskId: "", parentLocked: false, assignmentOnly: true });
  };

  const openSubtaskCreator = (parentTask) => {
    setExpandedTasks((prev) => new Set(prev).add(parentTask._id));
    setViewTaskId(null);
    setTaskModal({ open: true, mode: "create", task: null, parentTaskId: parentTask._id, parentLocked: true, assignmentOnly: false });
  };

  const getSubtaskAssigneeLabel = (child) => {
    const childAssignees = child.assignments || [];
    if (child.assignmentType === "all") return "All members";
    if (childAssignees.length === 0) return "Unassigned";
    return childAssignees.map((assignment) => assignment.user?.name || "Member").join(", ");
  };

  const getSubtaskActions = (child) => [
    {
      label: "View Subtask",
      icon: Eye,
      onClick: () => setViewTaskId(child._id),
    },
    ...(isAdmin
      ? [
        {
          label: "Edit Subtask",
          icon: Pencil,
          onClick: () => openTaskEditor(child),
        },
        {
          label: "Assign Subtask",
          icon: UserPlus,
          onClick: () => openTaskAssignment(child),
        },
        {
          label: "Change Status",
          icon: CircleDashed,
          onClick: () =>
            setTaskStatusModal({
              open: true,
              task: child,
              status: child.status || "todo",
              remark: "",
            }),
        },
        { divider: true },
        {
          label: "Archive Subtask",
          icon: Trash2,
          onClick: () => setTaskDelete(child),
          variant: "danger",
        },
      ]
      : [
        {
          label: "Update My Subtask Status",
          icon: ClipboardCheck,
          onClick: () => setMyStatusTask(child),
        },
      ]),
  ];

  const subtaskColumns = [
    {
      label: "Subtask",
      accessor: "title",
      render: (value, row) => (
        <button
          type="button"
          onClick={() => setViewTaskId(row._id)}
          className="min-w-[160px] text-left text-sm font-semibold text-slate-800 hover:text-blue-600"
        >
          {value}
        </button>
      ),
    },
    { label: "Status", accessor: "status", render: (value) => <StatusBadge value={value} /> },
    { label: "Priority", accessor: "priority", render: (value) => <PriorityBadge value={value} /> },
    { label: "Due", accessor: "dueDate", render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span> },
    {
      label: "Assignees",
      accessor: "assignments",
      render: (_, row) => {
        const label = getSubtaskAssigneeLabel(row);
        return <span className="block max-w-[200px] truncate text-xs text-slate-600" title={label}>{label}</span>;
      },
    },
    {
      label: "Actions",
      accessor: "_id",
      render: (_, row) => <ActionDropdown openOn="click" actions={getSubtaskActions(row)} />,
    },
  ];

  const renderSubtaskRows = (parentTask) => {
    if (!expandedTasks.has(parentTask._id)) return null;
    const children = subtasksByParent[parentTask._id] || [];

    if (subtasksLoading[parentTask._id]) {
      return <p className="ml-6 mt-2 text-xs text-slate-500">Loading subtasks...</p>;
    }

    if (children.length === 0) {
      return <p className="ml-6 mt-2 text-xs text-slate-500">No subtasks yet.</p>;
    }

    return (
      <div className="ml-6 mt-2 overflow-x-auto border-l-2 border-slate-200 pl-3">
        <CustomTable
          columns={subtaskColumns}
          data={children}
          defaultRowsPerPage={10}
          rowsPerPageOptions={[10, 20]}
        />
      </div>
    );
  };

  const renderTaskTitle = (row) => {
    const expanded = expandedTasks.has(row._id);
    const subtaskCount = Number(row.subtaskSummary?.total || 0);
    const canExpand = subtaskCount > 0 || expanded || Boolean(subtasksByParent[row._id]);

    return (
      <div className="min-w-[220px]">
        <div className="flex items-start gap-2">
          {canExpand ? (
            <button type="button" aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"} onClick={() => toggleSubtasks(row._id)} className="mt-0.5 text-slate-500 hover:text-blue-600">
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : <span className="w-[15px] shrink-0" />}
          <button type="button" onClick={() => setViewTaskId(row._id)} className="text-left text-sm font-semibold text-slate-800 hover:text-blue-600">{row.title}</button>
        </div>
        <p className="ml-6 text-xs text-slate-500">{row.section || "General"}</p>
        {subtaskCount > 0 && <p className="ml-6 mt-1 text-[11px] text-slate-500">{row.subtaskSummary?.done || 0} of {subtaskCount} subtasks</p>}
        {renderSubtaskRows(row)}
      </div>
    );
  };

  const tableColumns = isAdmin
    ? [
      { label: "Task", accessor: "title", render: (_, row) => renderTaskTitle(row) },
      { label: "Status", accessor: "status", render: (value) => <StatusBadge value={value} /> },
      { label: "Priority", accessor: "priority", render: (value) => <PriorityBadge value={value} /> },
      { label: "Start", accessor: "startDate", render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span> },
      { label: "Due", accessor: "dueDate", render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span> },
      {
        label: "Assignees", accessor: "assignments", render: (value) => {
          const assignees = Array.isArray(value) ? value : [];
          const visibleAssignees = assignees.slice(0, 3);
          if (assignees.length === 0) return <span className="text-sm text-slate-500">Unassigned</span>;

          return (
            <div className="flex items-center -space-x-2">
              {visibleAssignees.map((assignment, index) => {
                const assignee = assignment.user || assignment;
                const name = assignee.name || "User";
                const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                return assignee.profilePhoto ? (
                  <img
                    key={assignment._id || assignee._id || index}
                    src={assignee.profilePhoto}
                    alt={name}
                    title={name}
                    className="h-8 w-8 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <span
                    key={assignment._id || assignee._id || index}
                    title={name}
                    aria-label={name}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-100 text-[10px] font-semibold text-sky-700"
                  >
                    {initials || "U"}
                  </span>
                );
              })}
              {assignees.length > 3 && (
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600" title={`${assignees.length - 3} more assignees`}>
                  +{assignees.length - 3}
                </span>
              )}
            </div>
          );
        }
      },
      {
        label: "Actions",
        accessor: "_id",
        render: (_, row) => (
          <ActionDropdown
            openOn="click"
            actions={[
              {
                label: "View Task",
                icon: Eye,
                onClick: () => setViewTaskId(row._id),
              },
              {
                label: "Add Subtask",
                icon: Plus,
                onClick: () => openSubtaskCreator(row),
              },
              {
                label: "Edit Task",
                icon: Pencil,
                onClick: () => openTaskEditor(row),
              },
              {
                label: "Assign Task",
                icon: UserPlus,
                onClick: () => openTaskAssignment(row),
              },
              {
                label: "Change Status",
                icon: CircleDashed,
                onClick: () =>
                  setTaskStatusModal({
                    open: true,
                    task: row,
                    status: row.status || "todo",
                    remark: "",
                  }),
              },
              { divider: true },
              {
                label: "Delete Task",
                icon: Trash2,
                onClick: () => setTaskDelete(row),
                variant: "danger",
              },
            ]}
          />
        ),
      }
    ]
    : [
      { label: "Task", accessor: "title", render: (_, row) => renderTaskTitle(row) },
      { label: "Section", accessor: "section", render: (value) => <span className="text-sm text-slate-700">{value || "General"}</span> },
      { label: "Status", accessor: "status", render: (value) => <StatusBadge value={value} /> },
      { label: "Priority", accessor: "priority", render: (value) => <PriorityBadge value={value} /> },
      { label: "Start", accessor: "startDate", render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span> },
      { label: "Due", accessor: "dueDate", render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span> },
      { label: "Subtasks", accessor: "subtaskSummary", render: (summary) => <span className="text-sm text-slate-700">{summary?.total ? `${summary.done || 0} of ${summary.total}` : "-"}</span> },
      { label: "My status", accessor: "assignments", render: (_, row) => <StatusBadge value={getMyAssignment(row)?.status || row.myStatus || "todo"} /> },
      {
        label: "Action", accessor: "_id", render: (_, row) => (
          <div className="flex items-center gap-2">
            <button type="button" title="View task and comments" aria-label="View task and comments" onClick={() => setViewTaskId(row._id)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"><Eye size={14} /> View</button>
            <button type="button" title="Update my task status" aria-label="Update my task status" onClick={() => setMyStatusTask(row)} className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"><ClipboardCheck size={14} /> Update status</button>
          </div>
        )
      },
    ];

  const filesModals = (
    <>
      <UploadFilesModal
        open={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setLockedTaskForFiles(null); }}
        onSuccess={refreshFilesPanel}
        projectId={projectId}
        tasks={tasks}
        lockedTaskId={lockedTaskForFiles}
      />
      <AddLinkModal
        open={linkModalOpen}
        onClose={() => { setLinkModalOpen(false); setLockedTaskForFiles(null); }}
        onSuccess={refreshFilesPanel}
        projectId={projectId}
        tasks={tasks}
        lockedTaskId={lockedTaskForFiles}
      />
      <NoteFormModal
        open={noteModal.open}
        mode={noteModal.mode}
        note={noteModal.note}
        projectId={projectId}
        tasks={tasks}
        lockedTaskId={lockedTaskForNotes}
        onClose={() => { setNoteModal({ open: false, mode: "create", note: null }); setLockedTaskForNotes(null); }}
        onSuccess={refreshNotesPanel}
      />
    </>
  );

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading project details...</div>;
  if (!project) return <div className="m-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{projectError || "Project not found."}<button type="button" onClick={() => navigate("/projects")} className="ml-2 font-medium text-blue-600 hover:underline">Back to projects</button></div>;

  const projectInfo = project.project || project;
  const taskStats = project.taskStats || [];
  const taskStatTotal = taskStats.reduce((total, item) => total + Number(item.count || 0), 0);

  const tabList = ["tasks", "files", "notes"];

  if (!canManageProject) {
    return (
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate("/projects")} className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Back to projects"><ArrowLeft size={16} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project · {projectInfo.code || "-"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-800">{projectInfo.name}</h1>
              <StatusBadge value={projectInfo.status} />
              <PriorityBadge value={projectInfo.priority} />
              {projectInfo.myRole && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">{projectInfo.myRole}</span>}
            </div>
          </div>
          <button type="button" onClick={() => setDetailsOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FolderKanban size={17} />
            Project details
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex gap-5">
            {tabList.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-1 py-3 text-sm font-medium capitalize ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {tab === "files" ? "Files" : tab === "notes" ? "My Notes" : tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "tasks" ? (
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={taskFilters.search} onChange={(event) => setTaskFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search tasks" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <select value={taskFilters.status} onChange={(event) => setTaskFilters((prev) => ({ ...prev, status: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
              </select>
              <select value={taskFilters.priority} onChange={(event) => setTaskFilters((prev) => ({ ...prev, priority: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="">All priorities</option>{priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>

            <CustomTable
              columns={tableColumns}
              data={tasks}
              currentPage={taskPage}
              totalPages={taskPages}
              totalRecords={taskTotal}
              rowsPerPage={taskLimit}
              onPageChange={setTaskPage}
              onRowsPerPageChange={(limit) => { setTaskPage(1); setTaskLimit(limit); }}
              rowsPerPageOptions={[5, 10, 20, 50]}
            />
          </section>
        ) : activeTab === "files" ? (
          <ProjectFilesPanel
            key={filesPanelKey}
            projectId={projectId}
            tasks={tasks}
            currentUser={user}
            isAdmin={isAdmin}
            onOpenUpload={() => openUploadForTask(null)}
            onOpenLink={() => openLinkForTask(null)}
          />
        ) : (
          <ProjectNotesPanel
            key={notesPanelKey}
            projectId={projectId}
            tasks={tasks}
            onOpenCreate={() => openCreateNote(null)}
            onOpenEdit={openEditNote}
          />
        )}

        <UpdateMyTaskStatusModal
          open={!!myStatusTask}
          task={myStatusTask}
          initialStatus={getMyAssignment(myStatusTask || {})?.status || myStatusTask?.myStatus || "todo"}
          initialProgress={getMyAssignment(myStatusTask || {})?.progress || myStatusTask?.myProgress || 0}
          onClose={() => setMyStatusTask(null)}
          onSave={handleMyStatusUpdate}
        />

        {viewTaskId && (
          <ProjectTaskModal
            taskId={viewTaskId}
            currentUser={user}
            refreshToken={taskDetailRefreshToken}
            onTaskChanged={handleTaskDetailChanged}
            onClose={() => setViewTaskId(null)}
            onOpenUploadFiles={(taskId) => openUploadForTask(taskId)}
            onOpenAddLink={(taskId) => openLinkForTask(taskId)}
            onOpenCreateNote={(taskId) => openCreateNote(taskId)}
            onOpenEditNote={openEditNote}
          />
        )}

        {filesModals}

        <ProjectDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          projectInfo={projectInfo}
          memberCount={project.memberCount}
          members={normalizedMembers}
          canManage={canManageProject}
          showMyTasks={!canManageProject}
          taskStats={taskStats}
          taskStatTotal={taskStatTotal}
          onAddMembers={() => setMemberModal({ open: true, selectedUserIds: [] })}
          onRemoveMember={handleRemoveMember}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/projects")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /></button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-800">{projectInfo.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setDetailsOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FolderKanban size={17} />
            Project details
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{displayedMembers.length + 1}</span>
          </button>
          <button type="button" onClick={() => setEditProjectOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil size={17} />
            Edit Project
          </button>
          <button type="button" onClick={() => setTaskModal({ open: true, mode: "create", task: null })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={18} />
            Create Task
          </button>
        </div>
      </div>

      {/* Tabs for admin view: Tasks | Files | My Notes */}
      <div className="border-b border-slate-200">
        <div className="flex gap-5">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${activeTab === "tasks" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${activeTab === "files" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${activeTab === "notes" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            My Notes
          </button>
        </div>
      </div>

      {activeTab === "tasks" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-slate-600"><Clock3 className="h-4 w-4" /><span className="text-sm font-semibold">Tasks</span></div>
          <CustomTable columns={tableColumns} data={tasks} defaultRowsPerPage={10} rowsPerPageOptions={[5, 10, 20]} />
        </div>
      ) : activeTab === "files" ? (
        <ProjectFilesPanel
          key={filesPanelKey}
          projectId={projectId}
          tasks={tasks}
          currentUser={user}
          isAdmin={isAdmin}
          onOpenUpload={() => openUploadForTask(null)}
          onOpenLink={() => openLinkForTask(null)}
        />
      ) : (
        <ProjectNotesPanel
          key={notesPanelKey}
          projectId={projectId}
          tasks={tasks}
          onOpenCreate={() => openCreateNote(null)}
          onOpenEdit={openEditNote}
        />
      )}

      <ProjectFormModal
        open={editProjectOpen}
        mode="edit"
        project={projectInfo}
        managers={users}
        onClose={() => setEditProjectOpen(false)}
        onSubmit={handleUpdateProject}
      />

      <TaskFormModal
        open={taskModal.open}
        mode={taskModal.mode}
        task={taskModal.task}
        projectId={projectId}
        parentTaskId={taskModal.parentTaskId}
        parentLocked={taskModal.parentLocked}
        assignmentOnly={taskModal.assignmentOnly}
        canManageHierarchy={isAdmin}
        users={taskAssignableMembers}
        onClose={() => setTaskModal({ open: false, mode: "create", task: null, parentTaskId: "", parentLocked: false, assignmentOnly: false })}
        onSubmit={handleCreateTask}
      />

      {memberModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 pt-5 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Project members
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-800">
                  Add members
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select employees to add to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMemberModal({ open: false, selectedUserIds: [] });
                  setMemberSearch("");
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {/* Selected chips */}
              {memberModal.selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {memberModal.selectedUserIds.map((id) => {
                    const selectedUser = visibleAddableMembers.find(
                      (u) => u._id === id,
                    ) || membersNotInProject.find((u) => u._id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        <span className="max-w-[160px] truncate">
                          {selectedUser?.name || "Selected"}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${selectedUser?.name || "member"}`}
                          onClick={() =>
                            setMemberModal((prev) => ({
                              ...prev,
                              selectedUserIds: prev.selectedUserIds.filter(
                                (sid) => sid !== id,
                              ),
                            }))
                          }
                          className="font-semibold text-blue-500 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search + list */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative border-b border-slate-100 bg-slate-50">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, ID or role"
                    className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-white"
                  />
                </div>

                <div className="max-h-[45vh] overflow-y-auto p-1">
                  {visibleAddableMembers.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">
                        {memberSearch.trim()
                          ? "No employees match your search."
                          : "No available employees to add."}
                      </p>
                    </div>
                  ) : (
                    visibleAddableMembers.map((listedUser) => {
                      const checked = memberModal.selectedUserIds.includes(
                        listedUser._id,
                      );
                      return (
                        <label
                          key={listedUser._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition ${checked ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setMemberModal((prev) => ({
                                ...prev,
                                selectedUserIds: prev.selectedUserIds.includes(
                                  listedUser._id,
                                )
                                  ? prev.selectedUserIds.filter(
                                    (id) => id !== listedUser._id,
                                  )
                                  : [...prev.selectedUserIds, listedUser._id],
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {listedUser.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {[listedUser.employeeId, listedUser.role || "Employee"]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {checked && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                              Selected
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {memberModal.selectedUserIds.length}
                </span>{" "}
                selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMemberModal({ open: false, selectedUserIds: [] });
                    setMemberSearch("");
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={memberModal.selectedUserIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={15} />
                  {memberModal.selectedUserIds.length <= 1
                    ? "Add member"
                    : `Add ${memberModal.selectedUserIds.length} members`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {taskStatusModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Update task status</h3>
              <button type="button" onClick={() => setTaskStatusModal({ open: false, task: null, status: "todo", remark: "" })} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Status</span>
                <select value={taskStatusModal.status} onChange={(e) => setTaskStatusModal((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {statusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </label>
            </div>
            <div className="sticky bottom-0 mt-5 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white pt-4">
              <button type="button" onClick={() => setTaskStatusModal({ open: false, task: null, status: "todo", remark: "" })} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="button" onClick={handleStatusUpdate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!taskDelete}
        onClose={() => setTaskDelete(null)}
        onConfirm={handleDeleteTask}
        title="Archive Task"
        message={Number(taskDelete?.subtaskSummary?.total || 0) > 0
          ? `This will also archive its ${taskDelete.subtaskSummary.total} subtasks. Are you sure you want to continue?`
          : "This will archive the task. Are you sure you want to continue?"}
        confirmLabel="Archive"
      />

      {viewTaskId && (
        <ProjectTaskModal
          taskId={viewTaskId}
          currentUser={user}
          refreshToken={taskDetailRefreshToken}
          onTaskChanged={handleTaskDetailChanged}
          onAddSubtask={isAdmin ? openSubtaskCreator : undefined}
          onAdminStatusChange={isAdmin ? (task) => setTaskStatusModal({ open: true, task, status: task.status || "todo", remark: "" }) : undefined}
          onClose={() => setViewTaskId(null)}
          onOpenUploadFiles={(taskId) => openUploadForTask(taskId)}
          onOpenAddLink={(taskId) => openLinkForTask(taskId)}
          onOpenCreateNote={(taskId) => openCreateNote(taskId)}
          onOpenEditNote={openEditNote}
        />
      )}

      {filesModals}

      <ProjectDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        projectInfo={projectInfo}
        memberCount={project.memberCount}
        members={normalizedMembers}
        canManage={canManageProject}
        showMyTasks={false}
        taskStats={taskStats}
        taskStatTotal={taskStatTotal}
        onAddMembers={() => setMemberModal({ open: true, selectedUserIds: [] })}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
};

export default ProjectDetailPage;