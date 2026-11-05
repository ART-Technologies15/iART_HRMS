import React, { useEffect, useMemo, useState } from "react";
import { X, MessageSquare, Trash2, Send, User, CalendarDays, ArrowLeft, ClipboardCheck, CircleDashed, Plus, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import UpdateMyTaskStatusModal from "./UpdateMyTaskStatusModal";
import {
  getTaskById,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateMyTaskStatus,
} from "../api/projectApi";

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
  critical: "bg-rose-100 text-rose-700",
};

const StatusPill = ({ value }) => (
  <span
    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[value] || "bg-slate-100 text-slate-700"}`}
  >
    {value?.replace(/_/g, " ") || "-"}
  </span>
);

const PriorityPill = ({ value }) => (
  <span
    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${PRIORITY_STYLES[value] || "bg-slate-100 text-slate-700"}`}
  >
    {value || "-"}
  </span>
);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ProjectTaskModal = ({ taskId, onClose, currentUser, onAddSubtask, onTaskChanged, onAdminStatusChange, refreshToken = 0 }) => {
  const [activeTaskId, setActiveTaskId] = useState(taskId);
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [myStatusOpen, setMyStatusOpen] = useState(false);
  const canManageTasks = currentUser?.role === "admin";

  useEffect(() => {
    setActiveTaskId(taskId);
  }, [taskId]);

  const loadTask = async (taskIdToLoad = activeTaskId) => {
    try {
      setLoading(true);
      const res = await getTaskById(taskIdToLoad);
      if (res?.success) {
        const { task: t, parent, subtasks, subtaskSummary, assignments, summary } = res.data || {};
        const fullTask = t ? { ...t, parent, subtasks: subtasks || [], subtaskSummary, assignments: assignments || t.assignments || [], summary } : null;
        setTask(fullTask);
        return fullTask;
      } else {
        setTask(null);
        toast.error(res?.message || "Unable to load task details");
      }
    } catch (err) {
      setTask(null);
      toast.error(err?.response?.data?.message || "Unable to load task details");
    } finally {
      setLoading(false);
    }
    return null;
  };

  const loadComments = async (taskIdToLoad = activeTaskId, page = 1) => {
    try {
      setCommentsLoading(true);
      const res = await getTaskComments(taskIdToLoad, { page, limit: 20 });
      if (res?.success) {
        const nextComments = res.data?.comments || [];
        setComments((prev) => (page === 1 ? nextComments : [...prev, ...nextComments]));
        setCommentTotalPages(res.data?.pages || 1);
        setCommentPage(page);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTaskId) return;
    setComments([]);
    setCommentPage(1);
    setCommentInput("");
    loadTask(activeTaskId);
    loadComments(activeTaskId, 1);
  }, [activeTaskId, refreshToken]);

  const navigateToTask = (nextTaskId) => {
    if (nextTaskId) setActiveTaskId(nextTaskId);
  };

  const canDeleteComment = (commentUser) => {
    if (!commentUser || !currentUser) return false;
    return currentUser?.role === "admin" 
    // || commentUser?._id === currentUser?._id;
  };

  const handleAddComment = async () => {
    const message = commentInput.trim();
    if (!message) {
      toast.error("Comment cannot be empty.");
      return;
    }
    if (message.length > 2000) {
      toast.error("Comment should be under 2000 characters.");
      return;
    }

    try {
      const res = await addTaskComment(activeTaskId, { message });
      if (res?.success) {
        setCommentInput("");
        loadComments(activeTaskId, 1);
        toast.success("Comment added");
      } else {
        toast.error(res?.message || "Failed to add comment");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await deleteTaskComment(activeTaskId, commentId);
      if (res?.success) {
        setComments((prev) => prev.filter((comment) => comment._id !== commentId));
        toast.success("Comment deleted");
      } else {
        toast.error(res?.message || "Failed to delete comment");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete comment");
    }
  };

  const assigneeRows = useMemo(() => task?.assignments || [], [task]);

  const handleMyStatusSave = async (payload) => {
    try {
      const res = await updateMyTaskStatus(activeTaskId, payload);
      if (res?.success) {
        toast.success("Your task status was updated");
        setMyStatusOpen(false);
        const updatedTask = await loadTask(activeTaskId);
        onTaskChanged?.(updatedTask);
      } else {
        toast.error(res?.message || "Status update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  if (!activeTaskId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Task Details</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">{task?.title || "Loading..."}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close task modal"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Loading task...</div>
        ) : !task ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Task not found.</div>
        ) : (
          <div className="grid gap-6 p-6 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusPill value={task.status} />
                  <PriorityPill value={task.priority} />
                  {task.section && (
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                      {task.section}
                    </span>
                  )}
                </div>

                {task.parent && (
                  <button type="button" onClick={() => navigateToTask(task.parent._id)} className="mb-3 flex items-center gap-2 text-left text-sm text-blue-700 hover:underline">
                    <ArrowLeft size={14} />
                    <span>Subtask of: <strong>{task.parent.title}</strong></span>
                    <StatusPill value={task.parent.status} />
                  </button>
                )}

                <p className="text-sm leading-6 text-slate-600">{task.description || "No description provided."}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Start date</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(task.startDate)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Due date</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(task.dueDate)}</p>
                  </div>
                  {/* <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Estimated hours</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{task.estimatedHours ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Parent task</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{task.parent?.title || (task.parentTask ? "Subtask" : "Top level")}</p>
                  </div> */}
                </div>
              </div>

              {(task.subtasks?.length > 0 || Number(task.subtaskSummary?.total || 0) > 0 || (canManageTasks && !task.parent && onAddSubtask)) && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Subtasks</h3>
                    </div>
                    {canManageTasks && !task.parent && onAddSubtask && (
                      <button type="button" onClick={() => onAddSubtask(task)} className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        <Plus size={14} /> Add Subtask
                      </button>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{task.subtaskSummary?.done || 0} of {task.subtaskSummary?.total || task.subtasks?.length || 0} subtasks complete</span>
                      <span>{task.subtaskSummary?.total ? Math.round(((task.subtaskSummary.done || 0) / task.subtaskSummary.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${task.subtaskSummary?.total ? Math.min(100, ((task.subtaskSummary.done || 0) / task.subtaskSummary.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {task.subtasks?.length ? task.subtasks.map((subtask) => (
                      <button
                        key={subtask._id}
                        type="button"
                        onClick={() => navigateToTask(subtask._id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">{subtask.title}</p>
                          <p className="text-xs text-slate-500">{subtask.section || "General"}</p>
                          <p className="mt-1 text-xs text-slate-500">Due {formatDate(subtask.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill value={subtask.status} />
                          <ChevronRight size={15} className="text-slate-400" />
                        </div>
                      </button>
                    )) : <p className="text-sm text-slate-500">No subtasks yet.</p>}
                  </div>
                </div>
              )}

              {task.parent && (
                <button type="button" onClick={() => navigateToTask(task.parent._id)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                  <ArrowLeft size={14} /> Back to parent task
                </button>
              )}

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Comments</h3>
                </div>

                <div className="mb-3 flex gap-2">
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Write a comment..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    title="Add comment"
                  >
                    <Send size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {comment.user?.profilePhoto ? (
                              <img src={comment.user.profilePhoto} alt={comment.user.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                <User size={14} />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{comment.user?.name || "User"}</p>
                              <p className="text-[11px] text-slate-500">{formatTime(comment.createdAt)}</p>
                            </div>
                          </div>

                          {canDeleteComment(comment.user) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment._id)}
                              className="text-slate-400 hover:text-red-600"
                              title="Delete comment"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {commentPage < commentTotalPages && (
                  <button
                    type="button"
                    onClick={() => loadComments(activeTaskId, commentPage + 1)}
                    className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {commentsLoading ? "Loading..." : "Load more comments"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Task info</h3>

              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-500">Project:</span>{" "}
                  {task.project?.name
                    ? `${task.project.name}${task.project.code ? ` (${task.project.code})` : ""}`
                    : "-"}
                </p>
                <p><span className="font-medium text-slate-500">Assignees:</span> {assigneeRows.length ? assigneeRows.map((a) => a.user?.name || "User").join(", ") : "Unassigned"}</p>
                <p><span className="font-medium text-slate-500">Members:</span> {task.assignmentType || "specific"}</p>
              </div>

              {canManageTasks ? (
                <>
                  <button type="button" onClick={() => onAdminStatusChange?.(task)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    <CircleDashed size={15} /> Change Task Status
                  </button>
                  {!task.parent && onAddSubtask && (
                    <button type="button" onClick={() => onAddSubtask(task)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <Plus size={15} /> Add Subtask
                    </button>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => setMyStatusOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  <ClipboardCheck size={15} /> Update my status
                </button>
              )}

              {task.subtaskSummary && (task.subtaskSummary.total || 0) > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  {task.subtaskSummary.done || 0} of {task.subtaskSummary.total || 0} subtasks complete
                </div>
              )}

              {task.summary && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <p>{task.summary.done} of {task.summary.expected} assignees done</p>
                  {task.assignmentType === "all" &&
                    task.summary.expected - (task.assignments?.length || 0) > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {task.summary.expected - task.assignments.length} members haven't started yet
                      </p>
                    )}
                </div>
              )}

              {task.assignments?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assignments</h4>
                  {task.assignments.map((assignment) => (
                    <div key={assignment._id || assignment.user?._id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        {assignment.user?.profilePhoto ? (
                          <img src={assignment.user.profilePhoto} alt={assignment.user.name} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                            <User size={12} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-700">{assignment.user?.name || "User"}</p>
                          <p className="text-[11px] text-slate-500">{assignment.user?.employeeId}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <StatusPill value={assignment.status} />
                        {/* <span className="text-slate-500">{assignment.progress ?? 0}% · {assignment.hoursSpent ?? 0}h</span> */}
                      </div>

                      {assignment.remarks && (
                        <p className="mt-2 text-xs text-slate-500">{assignment.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <UpdateMyTaskStatusModal
        open={myStatusOpen}
        task={task}
        initialStatus={assigneeRows.find((assignment) => String(assignment.user?._id || assignment.user) === String(currentUser?._id))?.status || "todo"}
        initialProgress={assigneeRows.find((assignment) => String(assignment.user?._id || assignment.user) === String(currentUser?._id))?.progress || 0}
        onClose={() => setMyStatusOpen(false)}
        onSave={handleMyStatusSave}
      />
    </div>
  );
};

export default ProjectTaskModal;
