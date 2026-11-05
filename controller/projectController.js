import Project, { PROJECT_STATUS } from "../models/Project.js";
import ProjectMember from "../models/Projectmember.js";
import Task, { TASK_STATUS } from "../models/Task.js";
import TaskAssignment from "../models/Taskassignment.js";
import TaskComment from "../models/Taskcomment.js";
import User from "../models/Users.js";
import {
    ok,
    fail,
    handle,
    isValidObjectId,
    hasFullAccess,
    uniqueIds,
    allValidIds,
    paginate,
    pushStatusHistory,
    isProjectMember,
    canManageProject,
    getEligibleUserIds,
    countEligibleUsers,
    loadProject,
    loadTask,
    syncTaskStatus,
    validateParentTask,
    getSubtaskCounts,
    syncProjectMembers,
    syncTaskAssignees,
} from "../helpers/Projecthelper.js";
import ProjectFile, { FILE_CATEGORIES } from "../models/ProjectFile.js";
import ProjectNote from "../models/ProjectNote.js";
import { uploadToS3, deleteS3File } from "../utils/s3Upload/s3.js";
/**
 * Assumes authMiddleware sets req.user = { _id, role, ... }
 * Full-access roles: admin, hr  (see helpers/Projecthelper.js)
 */

/* ------------------------------ PROJECTS ------------------------------ */

// POST /projects   (admin, hr)
export const createProject = handle(async (req, res) => {
    if (!hasFullAccess(req.user)) return fail(res, "Not authorized", 403);

    const {
        name, code, description, status, priority, startDate, endDate,
        department, assignmentType = "specific", memberIds = [], tags,
    } = req.body;
    // accept both `manager` and `managerId` from the frontend
    const manager = req.body.manager || req.body.managerId || null;

    if (!name || !code) return fail(res, "name and code are required");
    if (status && !PROJECT_STATUS.includes(status)) return fail(res, "Invalid status");
    if (!["all", "specific"].includes(assignmentType)) return fail(res, "Invalid assignmentType");
    if (manager && !isValidObjectId(manager)) return fail(res, "Invalid manager id");

    const members = uniqueIds(memberIds);
    if (!allValidIds(members)) return fail(res, "Invalid member id");

    const project = await Project.create({
        name, code, description, status, priority, startDate, endDate,
        department, manager: manager || null, assignmentType, tags,
        createdBy: req.user._id,
    });

    if (assignmentType === "specific") {
        const toAdd = new Set(members);
        if (manager) toAdd.add(String(manager));

        const validUsers = await User.find({ _id: { $in: [...toAdd] }, isActive: true }).select("_id");
        if (validUsers.length) {
            await ProjectMember.insertMany(
                validUsers.map((u) => ({
                    project: project._id,
                    user: u._id,
                    role: manager && String(u._id) === String(manager) ? "lead" : "member",
                    assignedBy: req.user._id,
                }))
            );
        }
    }

    return ok(res, project, "Project created", 201);
});

// GET /projects   (admin/hr: all, others: only accessible)
export const getProjects = handle(async (req, res) => {
    const { status, priority, department, search } = req.query;
    const { page, limit, skip } = paginate(req);

    const filter = { isArchived: false };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search) {
        filter.$or = [
            { name: new RegExp(search, "i") },
            { code: new RegExp(search, "i") },
        ];
    }

    if (!hasFullAccess(req.user)) {
        const memberships = await ProjectMember.find({
            user: req.user._id,
            status: "active",
        }).select("project");
        filter.$and = [
            {
                $or: [
                    { assignmentType: "all" },
                    { _id: { $in: memberships.map((m) => m.project) } },
                    { manager: req.user._id },
                ],
            },
        ];
    }

    const [projects, total] = await Promise.all([
        Project.find(filter)
            .populate("manager", "name employeeId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Project.countDocuments(filter),
    ]);

    return ok(res, { projects, total, page, pages: Math.ceil(total / limit) });
});

// GET /projects/my
export const getMyProjects = handle(async (req, res) => {
    const memberships = await ProjectMember.find({
        user: req.user._id,
        status: "active",
    }).select("project role");

    const projects = await Project.find({
        isArchived: false,
        $or: [
            { assignmentType: "all" },
            { _id: { $in: memberships.map((m) => m.project) } },
            { manager: req.user._id },
        ],
    })
        .populate("manager", "name employeeId")
        .sort({ createdAt: -1 });

    // per-project summary of the tasks that belong to THIS user
    const projectIds = projects.map((p) => p._id);
    const [myAssignments, projectTasks] = await Promise.all([
        TaskAssignment.find({
            user: req.user._id,
            isActive: true,
            project: { $in: projectIds },
        }).select("task project status"),
        Task.find({ project: { $in: projectIds }, isArchived: false }).select(
            "project assignmentType"
        ),
    ]);

    const assignedMap = new Map(myAssignments.map((a) => [String(a.task), a]));
    const summary = {};
    for (const t of projectTasks) {
        const mine = assignedMap.get(String(t._id));
        if (t.assignmentType !== "all" && !mine) continue; // not my task
        const key = String(t.project);
        summary[key] ||= { total: 0, done: 0 };
        summary[key].total += 1;
        if (mine?.status === "done") summary[key].done += 1;
    }

    const roleMap = Object.fromEntries(
        memberships.map((m) => [String(m.project), m.role])
    );

    const data = projects.map((p) => ({
        ...p.toObject(),
        myRole:
            p.manager && String(p.manager._id) === String(req.user._id)
                ? "manager"
                : roleMap[String(p._id)] || "member",
        myTaskSummary: summary[String(p._id)] || { total: 0, done: 0 },
    }));

    return ok(res, data);
});

// GET /projects/:projectId
export const getProjectById = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    await project.populate("manager", "name employeeId");

    // managers see stats for every task, other members only for their own tasks
    const canManage = await canManageProject(req.user, project);
    const taskMatch = { project: project._id, isArchived: false };
    if (!canManage) {
        const rows = await TaskAssignment.find({
            project: project._id,
            user: req.user._id,
            isActive: true,
        }).select("task");
        taskMatch.$or = [
            { assignmentType: "all" },
            { _id: { $in: rows.map((r) => r.task) } },
        ];
    }

    const [taskStats, memberCount] = await Promise.all([
        Task.aggregate([
            { $match: taskMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        countEligibleUsers(project),
    ]);

    return ok(res, { project, taskStats, memberCount, canManage });
});

// PUT /projects/:projectId   (admin, hr, manager, lead)
export const updateProject = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    const allowed = [
        "name", "description", "priority", "startDate", "endDate",
        "department", "manager", "tags", "assignmentType",
    ];
    for (const key of allowed) {
        if (req.body[key] !== undefined) project[key] = req.body[key];
    }
    if (req.body.manager === undefined && req.body.managerId !== undefined) {
        project.manager = req.body.managerId || null;
    }
    if (project.manager && !isValidObjectId(project.manager)) return fail(res, "Invalid manager id");
    if (!["all", "specific"].includes(project.assignmentType)) return fail(res, "Invalid assignmentType");

    project.updatedBy = req.user._id;
    await project.save();

    if (project.assignmentType === "specific") {
        if (Array.isArray(req.body.memberIds)) {
            // memberIds is the full list: add new ones, remove the ones left out
            if (!allValidIds(req.body.memberIds)) return fail(res, "Invalid member id");
            await syncProjectMembers(project, req.body.memberIds, req.user._id);
        } else if (project.manager) {
            // no member list sent: just keep the manager listed as lead
            await ProjectMember.updateOne(
                { project: project._id, user: project.manager },
                {
                    $set: { role: "lead", status: "active", removedAt: null, assignedBy: req.user._id },
                    $setOnInsert: { assignedAt: new Date() },
                },
                { upsert: true }
            );
        }
    }

    return ok(res, project, "Project updated");
});

// PATCH /projects/:projectId/status
export const updateProjectStatus = handle(async (req, res) => {
    const { status, remark } = req.body;
    if (!PROJECT_STATUS.includes(status)) return fail(res, "Invalid status");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    if (project.status !== status) {
        pushStatusHistory(project, project.status, status, req.user._id, remark);
        project.status = status;
        project.completedAt = status === "completed" ? new Date() : null;
        project.updatedBy = req.user._id;
        await project.save();
    }
    return ok(res, project, "Project status updated");
});

// DELETE /projects/:projectId   (soft delete, admin/hr)
export const deleteProject = handle(async (req, res) => {
    if (!hasFullAccess(req.user)) return fail(res, "Not authorized", 403);
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;

    project.isArchived = true;
    project.updatedBy = req.user._id;
    await project.save();
    await Task.updateMany({ project: project._id }, { isArchived: true });
    return ok(res, null, "Project archived");
});

/* ------------------------- PROJECT MEMBERS ------------------------- */

// GET /projects/:projectId/members
export const getProjectMembers = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    if (project.assignmentType === "all") {
        const users = await User.find({ isActive: true })
            .select("name employeeId department designation profilePhoto")
            .sort({ name: 1 });
        return ok(res, { assignmentType: "all", members: users });
    }

    const members = await ProjectMember.find({ project: project._id, status: "active" })
        .populate("user", "name employeeId department designation profilePhoto");
    return ok(res, { assignmentType: "specific", members });
});

// POST /projects/:projectId/members   body: { userIds: [], role }
export const addProjectMembers = handle(async (req, res) => {
    const { userIds = [], role = "member" } = req.body;
    if (!["lead", "member", "reviewer", "viewer"].includes(role)) return fail(res, "Invalid role");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);
    if (project.assignmentType === "all") {
        return fail(res, "Project is assigned to all employees; switch to 'specific' to manage members");
    }

    const ids = uniqueIds(userIds);
    if (!ids.length || !allValidIds(ids)) return fail(res, "Valid userIds are required");

    const users = await User.find({ _id: { $in: ids }, isActive: true }).select("_id");
    if (!users.length) return fail(res, "No valid active users found", 404);

    await ProjectMember.bulkWrite(
        users.map((u) => ({
            updateOne: {
                filter: { project: project._id, user: u._id },
                update: {
                    $set: { role, status: "active", removedAt: null, assignedBy: req.user._id },
                    $setOnInsert: { assignedAt: new Date() },
                },
                upsert: true,
            },
        }))
    );

    return ok(res, { added: users.length }, "Members added");
});

// DELETE /projects/:projectId/members/:userId
export const removeProjectMember = handle(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return fail(res, "Invalid user id");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    const member = await ProjectMember.findOneAndUpdate(
        { project: project._id, user: userId, status: "active" },
        { status: "removed", removedAt: new Date() },
        { new: true }
    );
    if (!member) return fail(res, "Member not found", 404);

    // deactivate this user's task assignments in this project, then resync
    const affected = await TaskAssignment.find({
        project: project._id,
        user: userId,
        isActive: true,
    }).select("task");
    await TaskAssignment.updateMany(
        { project: project._id, user: userId, isActive: true },
        { isActive: false }
    );
    const tasks = await Task.find({ _id: { $in: affected.map((a) => a.task) } });
    for (const t of tasks) await syncTaskStatus(t, project, req.user._id);

    return ok(res, null, "Member removed");
});

/* -------------------------------- TASKS -------------------------------- */

// POST /projects/:projectId/tasks
// body: { title, description, priority, startDate, dueDate, estimatedHours,
//         parentTask, tags, assignmentType: "all"|"specific", assigneeIds: [] }
export const createTask = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    const {
        title, description, priority, startDate, dueDate, estimatedHours,
        parentTask, tags, section, assignmentType = "specific", assigneeIds = [],
    } = req.body;

    if (!title) return fail(res, "title is required");
    if (!["all", "specific"].includes(assignmentType)) return fail(res, "Invalid assignmentType");
    if (parentTask) {
        const parentError = await validateParentTask(project._id, parentTask);
        if (parentError) return fail(res, parentError);
    }

    let validAssignees = [];
    if (assignmentType === "specific") {
        const ids = uniqueIds(assigneeIds);
        if (!ids.length || !allValidIds(ids)) return fail(res, "assigneeIds are required for specific assignment");
        validAssignees = await getEligibleUserIds(project, ids);
        if (validAssignees.length !== ids.length) {
            return fail(res, "Some assignees are not members of this project");
        }
    }

    const task = await Task.create({
        project: project._id, title, description, priority, startDate, dueDate,
        estimatedHours, parentTask: parentTask || null, tags, section, assignmentType,
        createdBy: req.user._id,
    });

    if (validAssignees.length) {
        await TaskAssignment.insertMany(
            validAssignees.map((uid) => ({
                task: task._id,
                project: project._id,
                user: uid,
                assignedBy: req.user._id,
            }))
        );
    }

    return ok(res, task, "Task created", 201);
});

// GET /projects/:projectId/tasks?status=&priority=&assignee=
// admin/hr/manager/lead see all tasks, others only tasks they are part of
export const getProjectTasks = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const { status, priority, assignee, search, topLevel, parentTask, section } = req.query;
    const { page, limit, skip } = paginate(req);

    const filter = { project: project._id, isArchived: false };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (section) filter.section = section;
    if (search) filter.title = new RegExp(search, "i");

    // ?topLevel=true  -> only parent tasks, ?parentTask=<id> -> subtasks of one task
    if (parentTask) {
        if (!isValidObjectId(parentTask)) return fail(res, "Invalid parentTask id");
        filter.parentTask = parentTask;
    } else if (topLevel === "true") {
        filter.parentTask = null;
    }

    const manage = await canManageProject(req.user, project);
    const userFilter = manage ? assignee : String(req.user._id);

    if (userFilter) {
        if (!isValidObjectId(userFilter)) return fail(res, "Invalid assignee id");
        const rows = await TaskAssignment.find({
            project: project._id,
            user: userFilter,
            isActive: true,
        }).select("task");
        filter.$or = [
            { assignmentType: "all" },
            { _id: { $in: rows.map((r) => r.task) } },
        ];
    }

    const [tasks, total] = await Promise.all([
        Task.find(filter).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit),
        Task.countDocuments(filter),
    ]);

    const assignments = await TaskAssignment.find({
        task: { $in: tasks.map((t) => t._id) },
        isActive: true,
    }).populate("user", "name employeeId profilePhoto");

    const byTask = {};
    for (const a of assignments) {
        (byTask[a.task] ||= []).push(a);
    }

    const subtaskCounts = await getSubtaskCounts(tasks.map((t) => t._id));

    const data = tasks.map((t) => ({
        ...t.toObject(),
        assignments: byTask[t._id] || [],
        subtaskSummary: subtaskCounts[String(t._id)] || { total: 0, done: 0 },
    }));

    return ok(res, { tasks: data, total, page, pages: Math.ceil(total / limit) });
});

// GET /tasks/my   -> every task relevant to the logged-in employee
export const getMyTasks = handle(async (req, res) => {
    const { status } = req.query;

    const memberships = await ProjectMember.find({
        user: req.user._id,
        status: "active",
    }).select("project");

    const projects = await Project.find({
        isArchived: false,
        status: { $nin: ["completed", "cancelled"] },
        $or: [
            { assignmentType: "all" },
            { _id: { $in: memberships.map((m) => m.project) } },
        ],
    }).select("_id name code");

    const myAssignments = await TaskAssignment.find({
        user: req.user._id,
        isActive: true,
    });
    const assignedTaskIds = myAssignments.map((a) => a.task);

    const tasks = await Task.find({
        isArchived: false,
        project: { $in: projects.map((p) => p._id) },
        $or: [{ assignmentType: "all" }, { _id: { $in: assignedTaskIds } }],
    }).sort({ dueDate: 1 });

    const assignMap = Object.fromEntries(myAssignments.map((a) => [String(a.task), a]));
    const projectMap = Object.fromEntries(projects.map((p) => [String(p._id), p]));

    let data = tasks.map((t) => {
        const mine = assignMap[String(t._id)];
        return {
            ...t.toObject(),
            project: projectMap[String(t.project)],
            myStatus: mine?.status || "todo",
            myProgress: mine?.progress || 0,
        };
    });

    if (status) data = data.filter((t) => t.myStatus === status);

    return ok(res, data);
});

// GET /tasks/:taskId
export const getTaskById = handle(async (req, res) => {
    const task = await loadTask(req.params.taskId, res);
    if (!task) return;

    const project = await Project.findById(task.project);
    if (!project || !(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const assignments = await TaskAssignment.find({ task: task._id, isActive: true })
        .populate("user", "name employeeId profilePhoto");

    const expected =
        task.assignmentType === "all" ? await countEligibleUsers(project) : assignments.length;
    const doneCount = assignments.filter((a) => a.status === "done").length;

    const [subtasks, parent] = await Promise.all([
        Task.find({ parentTask: task._id, isArchived: false }).sort({ createdAt: 1 }),
        task.parentTask ? Task.findById(task.parentTask).select("title status") : null,
    ]);
    const subtaskSummary = {
        total: subtasks.length,
        done: subtasks.filter((s) => s.status === "done").length,
    };
    await task.populate("project", "name code status");
    return ok(res, {
        task,
        parent,
        subtasks,
        subtaskSummary,
        assignments,
        summary: { expected, done: doneCount },
    });
});

// PUT /tasks/:taskId
export const updateTask = handle(async (req, res) => {
    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    const allowed = ["title", "description", "priority", "startDate", "dueDate", "estimatedHours", "tags", "section"];
    for (const key of allowed) {
        if (req.body[key] !== undefined) task[key] = req.body[key];
    }

    // move under another task, or pass null to turn a subtask back into a task
    if (req.body.parentTask !== undefined) {
        if (req.body.parentTask === null) {
            task.parentTask = null;
        } else {
            const parentError = await validateParentTask(project._id, req.body.parentTask, task._id);
            if (parentError) return fail(res, parentError);
            task.parentTask = req.body.parentTask;
        }
    }

    // assignment changes: assignmentType and/or the FULL assigneeIds list
    const { assignmentType, assigneeIds } = req.body;
    if (assignmentType !== undefined && !["all", "specific"].includes(assignmentType)) {
        return fail(res, "Invalid assignmentType");
    }

    let newAssignees = null;
    if (Array.isArray(assigneeIds)) {
        const ids = uniqueIds(assigneeIds);
        const willBeSpecific = assignmentType
            ? assignmentType === "specific"
            : task.assignmentType === "specific";

        if (willBeSpecific) {
            if (!ids.length || !allValidIds(ids)) return fail(res, "Select at least one valid assignee");
            const valid = await getEligibleUserIds(project, ids);
            if (valid.length !== ids.length) return fail(res, "Some assignees are not members of this project");
            newAssignees = valid;
        } else if (ids.length && assignmentType !== "all") {
            return fail(
                res,
                'Task is assigned to all members. Send assignmentType: "specific" to restrict it to chosen users'
            );
        }
    }

    if (assignmentType === "specific" && task.assignmentType === "all" && !newAssignees) {
        return fail(res, "assigneeIds are required when switching a task to specific");
    }
    if (assignmentType !== undefined) task.assignmentType = assignmentType;

    task.updatedBy = req.user._id;
    await task.save();

    if (newAssignees) await syncTaskAssignees(task, project, newAssignees, req.user._id);
    // assignees changed, so the overall status may need recalculating
    if (newAssignees || assignmentType !== undefined) {
        await syncTaskStatus(task, project, req.user._id);
    }

    return ok(res, task, "Task updated");
});

// PATCH /tasks/:taskId/status   -> manager override (e.g. cancel / force close)
export const updateTaskStatus = handle(async (req, res) => {
    const { status, remark } = req.body;
    if (!TASK_STATUS.includes(status)) return fail(res, "Invalid status");

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    if (task.status !== status) {
        pushStatusHistory(task, task.status, status, req.user._id, remark || "Manual override");
        task.status = status;
        task.completedAt = status === "done" ? new Date() : null;
        task.updatedBy = req.user._id;
        await task.save();
    }
    return ok(res, task, "Task status updated");
});

// DELETE /tasks/:taskId   (soft delete)
export const deleteTask = handle(async (req, res) => {
    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    task.isArchived = true;
    task.updatedBy = req.user._id;
    await task.save();
    // archive its subtasks as well
    await Task.updateMany({ parentTask: task._id }, { isArchived: true });
    return ok(res, null, "Task archived");
});

/* ------------------------- TASK ASSIGNMENTS ------------------------- */

// POST /tasks/:taskId/assignees   body: { userIds: [], switchToSpecific }
// If the task is currently "all", pass switchToSpecific=true to restrict it
export const assignTaskUsers = handle(async (req, res) => {
    const { userIds = [], switchToSpecific = false } = req.body;

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    if (task.assignmentType === "all") {
        if (!switchToSpecific) {
            return fail(res, "Task is assigned to everyone. Pass switchToSpecific=true to restrict it to chosen users");
        }
        task.assignmentType = "specific";
        await task.save();
    }

    const ids = uniqueIds(userIds);
    if (!ids.length || !allValidIds(ids)) return fail(res, "Valid userIds are required");

    const valid = await getEligibleUserIds(project, ids);
    if (valid.length !== ids.length) return fail(res, "Some users are not members of this project");

    await TaskAssignment.bulkWrite(
        valid.map((uid) => ({
            updateOne: {
                filter: { task: task._id, user: uid },
                update: {
                    $set: { isActive: true, assignedBy: req.user._id },
                    $setOnInsert: { project: project._id, assignedAt: new Date() },
                },
                upsert: true,
            },
        }))
    );

    // a new person has not finished yet, so a "done" task may need to reopen
    await syncTaskStatus(task, project, req.user._id);
    return ok(res, task, "Task assigned");
});

// POST /tasks/:taskId/assign-all   -> make the task visible to every project member
export const assignTaskToAll = handle(async (req, res) => {
    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);

    task.assignmentType = "all";
    task.updatedBy = req.user._id;
    await task.save();
    await syncTaskStatus(task, project, req.user._id);
    return ok(res, task, "Task assigned to all project members");
});

// DELETE /tasks/:taskId/assignees/:userId
export const unassignTaskUser = handle(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return fail(res, "Invalid user id");

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await canManageProject(req.user, project))) return fail(res, "Not authorized", 403);
    if (task.assignmentType === "all") {
        return fail(res, "Task is assigned to all; restrict it to specific users first");
    }

    const row = await TaskAssignment.findOneAndUpdate(
        { task: task._id, user: userId, isActive: true },
        { isActive: false },
        { new: true }
    );
    if (!row) return fail(res, "Assignment not found", 404);

    await syncTaskStatus(task, project, req.user._id);
    return ok(res, null, "User unassigned");
});

// PATCH /tasks/:taskId/my-status
// body: { status, progress, hoursSpent, remarks }
// Employee updates ONLY their own row; other employees are not affected.
export const updateMyTaskStatus = handle(async (req, res) => {
    const { status, progress, hoursSpent, remarks } = req.body;
    const allowedStatuses = ["todo", "in_progress", "in_review", "blocked", "done"];
    if (!allowedStatuses.includes(status)) return fail(res, "Invalid status");

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    if (task.status === "cancelled") return fail(res, "Task is cancelled");

    const project = await Project.findById(task.project);
    if (!project) return fail(res, "Project not found", 404);
    if (["completed", "cancelled"].includes(project.status)) {
        return fail(res, `Project is ${project.status}`);
    }

    const userId = req.user._id;

    // is this user allowed to work on the task?
    if (task.assignmentType === "specific") {
        const assigned = await TaskAssignment.exists({ task: task._id, user: userId, isActive: true });
        if (!assigned) return fail(res, "You are not assigned to this task", 403);
    } else {
        const [eligible] = await getEligibleUserIds(project, [userId]);
        if (!eligible) return fail(res, "You are not a member of this project", 403);
    }

    const set = { status, isActive: true };
    if (progress !== undefined) {
        const p = Number(progress);
        if (Number.isNaN(p) || p < 0 || p > 100) return fail(res, "progress must be 0-100");
        set.progress = status === "done" ? 100 : p;
    } else if (status === "done") {
        set.progress = 100;
    }
    if (hoursSpent !== undefined) set.hoursSpent = Number(hoursSpent) || 0;
    if (remarks !== undefined) set.remarks = remarks;
    set.completedAt = status === "done" ? new Date() : null;

    // upsert covers "all" tasks where the row doesn't exist yet
    const assignment = await TaskAssignment.findOneAndUpdate(
        { task: task._id, user: userId },
        {
            $set: set,
            $setOnInsert: { project: project._id, assignedAt: new Date(), assignedBy: null },
        },
        { new: true, upsert: true }
    );

    await syncTaskStatus(task, project, userId);

    return ok(res, { assignment, taskStatus: task.status }, "Your task status updated");
});

/* ------------------------------ TASK COMMENTS ------------------------------ */

// POST /tasks/:taskId/comments   body: { message }
export const addTaskComment = handle(async (req, res) => {
    const message = (req.body.message || "").trim();
    if (!message) return fail(res, "message is required");

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const comment = await TaskComment.create({
        task: task._id,
        project: project._id,
        user: req.user._id,
        message,
    });
    await comment.populate("user", "name employeeId profilePhoto");
    return ok(res, comment, "Comment added", 201);
});

// GET /tasks/:taskId/comments?page=&limit=
export const getTaskComments = handle(async (req, res) => {
    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project || !(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const { page, limit, skip } = paginate(req);
    const filter = { task: task._id, isDeleted: false };

    const [comments, total] = await Promise.all([
        TaskComment.find(filter)
            .populate("user", "name employeeId profilePhoto")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        TaskComment.countDocuments(filter),
    ]);

    return ok(res, { comments, total, page, pages: Math.ceil(total / limit) });
});

// DELETE /tasks/:taskId/comments/:commentId   (own comment, or project manager/admin)
export const deleteTaskComment = handle(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) return fail(res, "Invalid comment id");

    const task = await loadTask(req.params.taskId, res);
    if (!task) return;
    const project = await Project.findById(task.project);
    if (!project) return fail(res, "Project not found", 404);

    const comment = await TaskComment.findOne({ _id: commentId, task: task._id, isDeleted: false });
    if (!comment) return fail(res, "Comment not found", 404);

    const isOwner = String(comment.user) === String(req.user._id);
    if (!isOwner && !(await canManageProject(req.user, project))) {
        return fail(res, "Not authorized", 403);
    }

    comment.isDeleted = true;
    await comment.save();
    return ok(res, null, "Comment deleted");
});

/* ------------------------- PROJECT FILES AND LINKS ------------------------- */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES_PER_UPLOAD = 10;
const ALLOWED_FILE_TYPES = [
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "image/tiff", "image/avif", "image/heic", "image/heif", "image/svg+xml",
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

const PROVIDER_LABELS = {
    google_sheets: "Google Sheet",
    google_docs: "Google Doc",
    google_slides: "Google Slides",
    google_forms: "Google Form",
    google_drive: "Google Drive",
    microsoft: "Microsoft 365 file",
    figma: "Figma file",
    notion: "Notion page",
    github: "GitHub link",
};

const detectLinkProvider = (hostname, pathname) => {
    const host = hostname.toLowerCase();
    if (host === "docs.google.com") {
        if (pathname.startsWith("/spreadsheets")) return "google_sheets";
        if (pathname.startsWith("/document")) return "google_docs";
        if (pathname.startsWith("/presentation")) return "google_slides";
        if (pathname.startsWith("/forms")) return "google_forms";
        return "google_drive";
    }
    if (host === "drive.google.com") return "google_drive";
    if (host === "sheets.google.com") return "google_sheets";
    if (
        host.endsWith("sharepoint.com") ||
        host.endsWith("onedrive.live.com") ||
        host === "1drv.ms" ||
        host.endsWith("office.com")
    ) return "microsoft";
    if (host.endsWith("figma.com")) return "figma";
    if (host.endsWith("notion.so") || host.endsWith("notion.site")) return "notion";
    if (host === "github.com") return "github";
    return "other";
};

// multer gives req.file, req.files (array) or req.files (object from .fields)
const getUploadedFiles = (req) => {
    if (Array.isArray(req.files)) return req.files;
    if (req.files && typeof req.files === "object") return Object.values(req.files).flat();
    return req.file ? [req.file] : [];
};

// POST /projects/:projectId/files
// ONE endpoint for files AND links:
//  - multipart/form-data with `files` (1-10)  -> uploads files
//  - JSON (or form field) with `url`          -> adds a link
// Common optional fields: taskId, category, description (and name for links)
// Always responds with an array of the created items.
export const uploadProjectFiles = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const files = getUploadedFiles(req);
    const rawUrl = typeof req.body.url === "string" ? req.body.url.trim() : "";

    if (files.length && rawUrl) return fail(res, "Send either files or a link, not both");
    if (!files.length && !rawUrl) return fail(res, "Attach at least one file or provide a link url");

    const { name, taskId, category, description } = req.body;
    if (category && !FILE_CATEGORIES.includes(category)) return fail(res, "Invalid category");

    let task = null;
    if (taskId) {
        if (!isValidObjectId(taskId)) return fail(res, "Invalid task id");
        task = await Task.findOne({ _id: taskId, project: project._id, isArchived: false }).select("_id");
        if (!task) return fail(res, "Task not found in this project", 404);
    }

    /* -------------------------------- link -------------------------------- */
    if (rawUrl) {
        if (rawUrl.length > 2000) return fail(res, "url is too long");

        let parsed;
        try {
            parsed = new URL(rawUrl);
        } catch {
            return fail(res, "Invalid URL");
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return fail(res, "Only http and https links are allowed");
        }

        const duplicate = await ProjectFile.exists({
            project: project._id,
            type: "link",
            url: rawUrl,
            task: task ? task._id : null,
        });
        if (duplicate) return fail(res, "This link has already been added", 409);

        const provider = detectLinkProvider(parsed.hostname, parsed.pathname);

        const link = await ProjectFile.create({
            project: project._id,
            task: task ? task._id : null,
            type: "link",
            name: (name || "").trim() || PROVIDER_LABELS[provider] || parsed.hostname,
            url: rawUrl, // stored exactly as entered, so #gid=... is kept
            provider,
            category: category || "other",
            description: description || "",
            uploadedBy: req.user._id,
        });

        await link.populate("uploadedBy", "name employeeId profilePhoto");
        return ok(res, [link], "Link added", 201);
    }

    /* -------------------------------- files -------------------------------- */
    if (files.length > MAX_FILES_PER_UPLOAD) {
        return fail(res, `You can upload up to ${MAX_FILES_PER_UPLOAD} files at a time`);
    }
    for (const f of files) {
        if (!ALLOWED_FILE_TYPES.includes(f.mimetype)) {
            return fail(res, `File type not allowed: ${f.originalname}`);
        }
        if (f.size > MAX_FILE_SIZE) return fail(res, `${f.originalname} is larger than 10 MB`);
    }

    const uploaded = [];
    let docs;
    try {
        for (const file of files) {
            const result = await uploadToS3(file.buffer, file.originalname, file.mimetype);
            uploaded.push({ file, result });
        }

        docs = await ProjectFile.insertMany(
            uploaded.map(({ file, result }) => ({
                project: project._id,
                task: task ? task._id : null,
                type: "file",
                // images are converted to WebP, so keep the displayed extension in sync
                name:
                    result.mimeType === "image/webp" && file.mimetype !== "image/webp"
                        ? file.originalname.replace(/\.[^.]+$/, "") + ".webp"
                        : file.originalname,
                url: result.Location,
                key: result.Key,
                mimeType: result.mimeType,
                size: result.size ?? file.size,
                category: category || "other",
                description: description || "",
                uploadedBy: req.user._id,
            }))
        );
    } catch (err) {
        // do not leave orphan files in S3 if something failed midway
        await Promise.all(uploaded.map((u) => deleteS3File(u.result.Location).catch(() => { })));
        throw err;
    }

    await ProjectFile.populate(docs, { path: "uploadedBy", select: "name employeeId profilePhoto" });
    return ok(res, docs, "Files uploaded", 201);
});

// GET /projects/:projectId/files?type=file|link&task=<id|none>&category=&search=&page=&limit=
export const getProjectFiles = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const { task, category, search, type } = req.query;
    const { page, limit, skip } = paginate(req);

    const filter = { project: project._id };
    if (type === "link") filter.type = "link";
    else if (type === "file") filter.type = { $ne: "link" };

    if (task === "none") filter.task = null;
    else if (task) {
        if (!isValidObjectId(task)) return fail(res, "Invalid task id");
        filter.task = task;
    }
    if (category) filter.category = category;
    if (search) filter.name = new RegExp(search, "i");

    const [files, total] = await Promise.all([
        ProjectFile.find(filter)
            .populate("uploadedBy", "name employeeId profilePhoto")
            .populate("task", "title")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ProjectFile.countDocuments(filter),
    ]);

    return ok(res, { files, total, page, pages: Math.ceil(total / limit) });
});

// DELETE /projects/:projectId/files/:fileId   (uploader, project manager/lead or admin/hr)
export const deleteProjectFile = handle(async (req, res) => {
    const { fileId } = req.params;
    if (!isValidObjectId(fileId)) return fail(res, "Invalid file id");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;

    const file = await ProjectFile.findOne({ _id: fileId, project: project._id });
    if (!file) return fail(res, "File not found", 404);

    const isOwner = String(file.uploadedBy) === String(req.user._id);
    if (!isOwner && !(await canManageProject(req.user, project))) {
        return fail(res, "Not authorized", 403);
    }

    // links point to external sites, so there is nothing to remove from S3
    if (file.type !== "link") {
        await deleteS3File(file.url); // throws if S3 delete fails, so the record stays
    }
    await file.deleteOne();
    return ok(res, null, file.type === "link" ? "Link deleted" : "File deleted");
});


/* ------------------------- PROJECT NOTES ------------------------- */

/* ------------------------- PROJECT NOTES (private) ------------------------- */
// Notes are visible only to their owner: every query below is scoped to
// req.user._id, and a note that belongs to someone else is reported as 404.

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /projects/:projectId/notes   body: { title?, content, taskId?, isPinned? }
export const createProjectNote = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const { taskId, isPinned = false } = req.body;
    const title = String(req.body.title || "").trim();
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!content) return fail(res, "content is required");
    if (content.length > 10000) return fail(res, "content must be 10000 characters or less");
    if (title.length > 150) return fail(res, "title must be 150 characters or less");

    let task = null;
    if (taskId) {
        if (!isValidObjectId(taskId)) return fail(res, "Invalid task id");
        task = await Task.findOne({ _id: taskId, project: project._id, isArchived: false }).select("_id");
        if (!task) return fail(res, "Task not found in this project", 404);
    }

    const note = await ProjectNote.create({
        project: project._id,
        user: req.user._id,
        task: task ? task._id : null,
        title,
        content,
        isPinned: Boolean(isPinned),
    });

    await note.populate("task", "title");
    return ok(res, note, "Note added", 201);
});

// GET /projects/:projectId/notes?task=<id|none>&pinned=true&search=&page=&limit=
export const getProjectNotes = handle(async (req, res) => {
    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const { task, pinned, search } = req.query;
    const { page, limit, skip } = paginate(req);

    const filter = { project: project._id, user: req.user._id };
    if (task === "none") filter.task = null;
    else if (task) {
        if (!isValidObjectId(task)) return fail(res, "Invalid task id");
        filter.task = task;
    }
    if (pinned === "true") filter.isPinned = true;
    if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ title: rx }, { content: rx }];
    }

    const [notes, total] = await Promise.all([
        ProjectNote.find(filter)
            .populate("task", "title")
            .sort({ isPinned: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limit),
        ProjectNote.countDocuments(filter),
    ]);

    return ok(res, { notes, total, page, pages: Math.ceil(total / limit) });
});

// PUT /projects/:projectId/notes/:noteId
// body (all optional): { title, content, isPinned, taskId }  (taskId: null clears the task)
export const updateProjectNote = handle(async (req, res) => {
    const { noteId } = req.params;
    if (!isValidObjectId(noteId)) return fail(res, "Invalid note id");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const note = await ProjectNote.findOne({
        _id: noteId,
        project: project._id,
        user: req.user._id,
    });
    if (!note) return fail(res, "Note not found", 404);

    if (req.body.title !== undefined) {
        const title = String(req.body.title || "").trim();
        if (title.length > 150) return fail(res, "title must be 150 characters or less");
        note.title = title;
    }

    if (req.body.content !== undefined) {
        const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
        if (!content) return fail(res, "content cannot be empty");
        if (content.length > 10000) return fail(res, "content must be 10000 characters or less");
        note.content = content;
    }

    if (req.body.isPinned !== undefined) note.isPinned = Boolean(req.body.isPinned);

    if (req.body.taskId !== undefined) {
        if (req.body.taskId === null || req.body.taskId === "") {
            note.task = null;
        } else {
            if (!isValidObjectId(req.body.taskId)) return fail(res, "Invalid task id");
            const task = await Task.findOne({
                _id: req.body.taskId,
                project: project._id,
                isArchived: false,
            }).select("_id");
            if (!task) return fail(res, "Task not found in this project", 404);
            note.task = task._id;
        }
    }

    await note.save();
    await note.populate("task", "title");
    return ok(res, note, "Note updated");
});

// DELETE /projects/:projectId/notes/:noteId
export const deleteProjectNote = handle(async (req, res) => {
    const { noteId } = req.params;
    if (!isValidObjectId(noteId)) return fail(res, "Invalid note id");

    const project = await loadProject(req.params.projectId, res);
    if (!project) return;
    if (!(await isProjectMember(req.user, project))) return fail(res, "Not authorized", 403);

    const note = await ProjectNote.findOneAndDelete({
        _id: noteId,
        project: project._id,
        user: req.user._id,
    });
    if (!note) return fail(res, "Note not found", 404);

    return ok(res, null, "Note deleted");
});
