import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, FolderKanban, CheckCircle2, Clock3, ClipboardList } from "lucide-react";
import { toast } from "react-toastify";
import CustomTable from "../components/CustomTable";
import ProjectTaskModal from "../components/ProjectTaskModal";
import UpdateMyTaskStatusModal from "../components/UpdateMyTaskStatusModal";
import { getMyProjects, getMyTasks, updateMyTaskStatus } from "../api/projectApi";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-violet-100 text-violet-700",
  blocked: "bg-rose-100 text-rose-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-200 text-gray-700",
};

const PRIORITY_STYLES = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const StatusBadge = ({ value }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[value] || "bg-slate-100 text-slate-700"}`}>
    {value?.replace(/_/g, " ") || "-"}
  </span>
);

const PriorityBadge = ({ value }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${PRIORITY_STYLES[value] || "bg-slate-100 text-slate-700"}`}>
    {value || "-"}
  </span>
);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, task: null });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getMyTasks({ status });
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list.filter((task) => {
          const q = search.toLowerCase();
          return !q || `${task.title || ""} ${task.project?.name || ""} ${task.project?.code || ""}`.toLowerCase().includes(q);
        });
        setTasks(filtered);
      } else {
        toast.error(res?.message || "Unable to load tasks");
        setTasks([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const res = await getMyProjects();
      if (res?.success) {
        setProjects(Array.isArray(res.data) ? res.data : []);
      } else {
        toast.error(res?.message || "Unable to load projects");
        setProjects([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load projects");
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [status, search, user]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const handleUpdateMyTaskStatus = async (payload) => {
    if (!statusModal.task) return;
    try {
      const res = await updateMyTaskStatus(statusModal.task._id, payload);
      if (res?.success) {
        toast.success("Task status updated");
        setStatusModal({ open: false, task: null });
        fetchTasks();
      } else {
        toast.error(res?.message || "Status update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const columns = [
    {
      label: "Task",
      accessor: "title",
      render: (_, row) => (
        <div className="min-w-[220px]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">{row.title}</p>
            {row.parentTask && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Subtask</span>}
          </div>
          <Link to={`/projects/${row.project?._id || row.projectId}`} className="text-xs text-blue-600 hover:underline" onClick={(event) => event.stopPropagation()}>
            View project: {row.project?.name || "-"}
          </Link>
        </div>
      ),
    },
    {
      label: "Project",
      accessor: "project",
      render: (value) => <span className="text-sm text-slate-700">{value?.code || "-"}</span>,
    },
    {
      label: "Due Date",
      accessor: "dueDate",
      render: (value) => <span className="text-sm text-slate-700">{formatDate(value)}</span>,
    },
    {
      label: "Priority",
      accessor: "priority",
      render: (value) => <PriorityBadge value={value} />,
    },
    {
      label: "Task Status",
      accessor: "status",
      render: (value) => <StatusBadge value={value} />,
    },
    {
      label: "My Status",
      accessor: "myStatus",
      render: (value, row) => {
        const assignment = row.assignments?.find((item) => (item.user?._id || item.user) === user?._id);
        return <StatusBadge value={value || assignment?.status || "todo"} />;
      },
    },
    {
      label: "Progress",
      accessor: "myProgress",
      render: (value) => <span className="text-sm text-slate-700">{value ?? 0}%</span>,
    },
    {
      label: "Action",
      accessor: "_id",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedTaskId(row._id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">View</button>
          <button type="button" onClick={() => setStatusModal({ open: true, task: row })} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">Update</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My Work</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-800">My Tasks</h1>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search task or project" className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
            <option value="">All status</option>
            {Object.keys(STATUS_STYLES).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No tasks assigned to you.</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(tasks.reduce((groups, task) => {
            const projectId = task.project?._id || task.projectId || "unassigned";
            const group = groups[projectId] || { project: task.project, tasks: [] };
            group.tasks.push(task);
            groups[projectId] = group;
            return groups;
          }, {})).map(([projectId, group]) => (
            <section key={projectId} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{group.project?.name || "Project"}</h2>
                  <p className="text-xs text-slate-500">{group.project?.code || "-"}</p>
                </div>
                {projectId !== "unassigned" && (
                  <Link to={`/projects/${projectId}`} className="text-sm font-medium text-blue-600 hover:underline">View project</Link>
                )}
              </div>
              <CustomTable columns={columns} data={group.tasks} defaultRowsPerPage={10} rowsPerPageOptions={[5, 10, 20]} />
            </section>
          ))}
        </div>
      )}

      <UpdateMyTaskStatusModal
        open={statusModal.open}
        task={statusModal.task}
        initialStatus={statusModal.task?.myStatus || statusModal.task?.status || "todo"}
        initialProgress={statusModal.task?.myProgress || 0}
        onClose={() => setStatusModal({ open: false, task: null })}
        onSave={handleUpdateMyTaskStatus}
      />

      {selectedTaskId && (
        <ProjectTaskModal taskId={selectedTaskId} currentUser={user} onTaskChanged={fetchTasks} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
};

export default MyTasksPage;
