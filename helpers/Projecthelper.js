import mongoose from "mongoose";
import Project from "../models/Project.js";
import ProjectMember from "../models/Projectmember.js";
import Task from "../models/Task.js";
import TaskAssignment from "../models/Taskassignment.js";
import User from "../models/Users.js";

/**
 * Helpers for the project / task module.
 *
 * Task completion rule:
 *  - assignmentType "specific": DONE when every active assignment is done
 *  - assignmentType "all":      DONE when every eligible user (project members,
 *                               or all active users if the project is "all")
 *                               has marked it done
 */

export const isValidObjectId = mongoose.isValidObjectId;

export const FULL_ACCESS_ROLES = ["admin", "hr"];

/* ---------------------------- response helpers ---------------------------- */

export const ok = (res, data, message = "Success", code = 200) =>
    res.status(code).json({ success: true, message, data });

export const fail = (res, message, code = 400) =>
    res.status(code).json({ success: false, message });

// wraps an async controller with try/catch
export const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err.code === 11000) return fail(res, "Duplicate entry", 409);
        console.error(err);
        return fail(res, err.message || "Server error", 500);
    }
};

/* ----------------------------- generic helpers ----------------------------- */

export const uniqueIds = (ids = []) => [...new Set(ids.map(String))];

export const allValidIds = (ids) => ids.every((id) => isValidObjectId(id));

export const paginate = (req) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

export const pushStatusHistory = (doc, from, to, userId, remark) => {
    doc.statusHistory.push({ from, to, changedBy: userId, remark });
};

/* ------------------------------ access helpers ------------------------------ */

export const hasFullAccess = (user) => FULL_ACCESS_ROLES.includes(user.role);

// can the user see / work inside this project
export const isProjectMember = async (user, project) => {
    if (hasFullAccess(user)) return true;
    if (project.assignmentType === "all") return true;
    if (project.manager && String(project.manager) === String(user._id)) return true;
    return !!(await ProjectMember.exists({
        project: project._id,
        user: user._id,
        status: "active",
    }));
};

// admin / hr / project manager / project lead
export const canManageProject = async (user, project) => {
    if (hasFullAccess(user)) return true;
    if (project.manager && String(project.manager) === String(user._id)) return true;
    return !!(await ProjectMember.exists({
        project: project._id,
        user: user._id,
        role: "lead",
        status: "active",
    }));
};

/* ------------------------------ member helpers ------------------------------ */

// subset of candidateIds that may be assigned inside this project
export const getEligibleUserIds = async (project, candidateIds) => {
    if (project.assignmentType === "all") {
        const users = await User.find({
            _id: { $in: candidateIds },
            isActive: true,
        }).select("_id");
        return users.map((u) => String(u._id));
    }
    const members = await ProjectMember.find({
        project: project._id,
        user: { $in: candidateIds },
        status: "active",
    }).select("user");
    return members.map((m) => String(m.user));
};

export const countEligibleUsers = async (project) => {
    if (project.assignmentType === "all") {
        return User.countDocuments({ isActive: true });
    }
    return ProjectMember.countDocuments({ project: project._id, status: "active" });
};

/* ------------------------------- loaders ------------------------------- */

// these send the error response themselves and return null when not found
export const loadProject = async (id, res) => {
    if (!isValidObjectId(id)) {
        fail(res, "Invalid project id");
        return null;
    }
    const project = await Project.findOne({ _id: id, isArchived: false });
    if (!project) fail(res, "Project not found", 404);
    return project;
};

export const loadTask = async (id, res) => {
    if (!isValidObjectId(id)) {
        fail(res, "Invalid task id");
        return null;
    }
    const task = await Task.findOne({ _id: id, isArchived: false });
    if (!task) fail(res, "Task not found", 404);
    return task;
};

/* ----------------------------- member syncing ----------------------------- */

// Makes the project's active members exactly match `memberIds` (+ the manager,
// who is always kept as a lead). Missing users are added or reactivated, users
// not in the list are removed and their task assignments are deactivated.
export const syncProjectMembers = async (project, memberIds, actorId) => {
    const wanted = new Set(uniqueIds(memberIds));
    const managerId = project.manager ? String(project.manager) : null;
    if (managerId) wanted.add(managerId);

    const validUsers = await User.find({
        _id: { $in: [...wanted] },
        isActive: true,
    }).select("_id");
    const validIds = new Set(validUsers.map((u) => String(u._id)));

    // add / reactivate
    if (validUsers.length) {
        await ProjectMember.bulkWrite(
            validUsers.map((u) => {
                const isManager = managerId && String(u._id) === managerId;
                return {
                    updateOne: {
                        filter: { project: project._id, user: u._id },
                        update: {
                            $set: {
                                status: "active",
                                removedAt: null,
                                assignedBy: actorId,
                                ...(isManager ? { role: "lead" } : {}),
                            },
                            $setOnInsert: {
                                assignedAt: new Date(),
                                ...(isManager ? {} : { role: "member" }),
                            },
                        },
                        upsert: true,
                    },
                };
            })
        );
    }

    // remove everyone who is no longer in the list
    const current = await ProjectMember.find({
        project: project._id,
        status: "active",
    }).select("user");
    const toRemove = current
        .map((m) => String(m.user))
        .filter((id) => !validIds.has(id));

    if (toRemove.length) {
        await ProjectMember.updateMany(
            { project: project._id, user: { $in: toRemove }, status: "active" },
            { status: "removed", removedAt: new Date() }
        );

        const assignmentFilter = {
            project: project._id,
            user: { $in: toRemove },
            isActive: true,
        };
        const affected = await TaskAssignment.find(assignmentFilter).select("task");
        await TaskAssignment.updateMany(assignmentFilter, { isActive: false });

        const tasks = await Task.find({ _id: { $in: affected.map((a) => a.task) } });
        for (const t of tasks) await syncTaskStatus(t, project, actorId);
    }

    return { total: validIds.size, removed: toRemove.length };
};

/* ---------------------------- assignee syncing ---------------------------- */

// Makes the task's active assignments exactly match `userIds`.
// New users get a row (or are reactivated with their old progress kept),
// users not in the list are deactivated. Ids must already be validated.
export const syncTaskAssignees = async (task, project, userIds, actorId) => {
    if (userIds.length) {
        await TaskAssignment.bulkWrite(
            userIds.map((uid) => ({
                updateOne: {
                    filter: { task: task._id, user: uid },
                    update: {
                        $set: { isActive: true, assignedBy: actorId },
                        $setOnInsert: { project: project._id, assignedAt: new Date() },
                    },
                    upsert: true,
                },
            }))
        );
    }

    const result = await TaskAssignment.updateMany(
        { task: task._id, isActive: true, user: { $nin: userIds } },
        { isActive: false }
    );

    return { total: userIds.length, removed: result.modifiedCount || 0 };
};

/* ------------------------------ subtask helpers ------------------------------ */

// Only ONE level of nesting is allowed (task -> subtask).
// Returns an error message string, or null when the parent is valid.
export const validateParentTask = async (projectId, parentId, taskId = null) => {
    if (!isValidObjectId(parentId)) return "Invalid parentTask id";
    if (taskId && String(taskId) === String(parentId)) {
        return "A task cannot be its own parent";
    }

    const parent = await Task.findOne({
        _id: parentId,
        project: projectId,
        isArchived: false,
    }).select("parentTask");
    if (!parent) return "Parent task not found in this project";
    if (parent.parentTask) {
        return "Subtasks cannot have their own subtasks (only one level allowed)";
    }

    if (taskId && (await Task.exists({ parentTask: taskId, isArchived: false }))) {
        return "This task has subtasks, so it cannot become a subtask";
    }
    return null;
};

// { [taskId]: { total, done } } for the given parent task ids
export const getSubtaskCounts = async (taskIds) => {
    if (!taskIds.length) return {};
    const rows = await Task.aggregate([
        { $match: { parentTask: { $in: taskIds }, isArchived: false } },
        {
            $group: {
                _id: "$parentTask",
                total: { $sum: 1 },
                done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
            },
        },
    ]);
    return Object.fromEntries(
        rows.map((r) => [String(r._id), { total: r.total, done: r.done }])
    );
};

/* ----------------------------- status syncing ----------------------------- */

// Recalculates Task.status from the per-employee assignments
export const syncTaskStatus = async (task, project, changedBy) => {
    if (task.status === "cancelled") return task;

    const assignments = await TaskAssignment.find({
        task: task._id,
        isActive: true,
    }).select("status");

    const doneCount = assignments.filter((a) => a.status === "done").length;
    const expected =
        task.assignmentType === "all"
            ? await countEligibleUsers(project)
            : assignments.length;

    if (expected === 0) return task;

    let newStatus;
    if (doneCount >= expected) newStatus = "done";
    else if (assignments.some((a) => a.status === "blocked")) newStatus = "blocked";
    else if (assignments.some((a) => a.status !== "todo")) newStatus = "in_progress";
    else newStatus = "todo";

    if (newStatus !== task.status) {
        pushStatusHistory(task, task.status, newStatus, changedBy, "Auto-synced from assignments");
        task.status = newStatus;
        task.completedAt = newStatus === "done" ? new Date() : null;
        await task.save();
    }
    return task;
};