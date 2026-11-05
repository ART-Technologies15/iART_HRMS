import axiosInstance from "./axiosInstance";

/* ------------------------------------------
   PROJECTS
------------------------------------------ */

/** POST /projects — create project (admin/hr) */
export const createProject = async (data) => {
    const res = await axiosInstance.post("/project/projects", data);
    return res.data;
};

/** GET /projects — list projects (paginated + filters) */
export const getProjects = async ({
    page = 1,
    limit = 10,
    status = "",
    priority = "",
    department = "",
    search = "",
} = {}) => {
    const res = await axiosInstance.get("/project/projects", {
        params: {
            page,
            limit,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(department && { department }),
            ...(search && { search }),
        },
    });
    return res.data;
};

/** GET /projects/my — projects for the logged-in user */
export const getMyProjects = async () => {
    const res = await axiosInstance.get("/project/projects/my");
    return res.data;
};

/** GET /projects/:projectId */
export const getProjectById = async (projectId) => {
    const res = await axiosInstance.get(`/project/projects/${projectId}`);
    return res.data;
};

/** PUT /projects/:projectId */
export const updateProject = async (projectId, data) => {
    const res = await axiosInstance.put(`/project/projects/${projectId}`, data);
    return res.data;
};

/** PATCH /projects/:projectId/status — body: { status, remark? } */
export const updateProjectStatus = async (projectId, data) => {
    const res = await axiosInstance.patch(
        `/project/projects/${projectId}/status`,
        data
    );
    return res.data;
};

/** DELETE /projects/:projectId — soft delete / archive */
export const deleteProject = async (projectId) => {
    const res = await axiosInstance.delete(`/project/projects/${projectId}`);
    return res.data;
};

/* ------------------------------------------
   PROJECT MEMBERS
------------------------------------------ */

/** GET /projects/:projectId/members */
export const getProjectMembers = async (projectId) => {
    const res = await axiosInstance.get(`/project/projects/${projectId}/members`);
    return res.data;
};

/** POST /projects/:projectId/members — body: { userIds: [], role? } */
export const addProjectMembers = async (projectId, data) => {
    const res = await axiosInstance.post(
        `/project/projects/${projectId}/members`,
        data
    );
    return res.data;
};

/** DELETE /projects/:projectId/members/:userId */
export const removeProjectMember = async (projectId, userId) => {
    const res = await axiosInstance.delete(
        `/project/projects/${projectId}/members/${userId}`
    );
    return res.data;
};

/* ------------------------------------------
   TASKS (under a project)
------------------------------------------ */

/** POST /projects/:projectId/tasks */
export const createTask = async (projectId, data) => {
    const res = await axiosInstance.post(
        `/project/projects/${projectId}/tasks`,
        data
    );
    return res.data;
};

/** GET /projects/:projectId/tasks — filters: status, priority, assignee, search, section, topLevel, parentTask, page, limit */
export const getProjectTasks = async (
    projectId,
    {
        page = 1,
        limit = 10,
        status = "",
        priority = "",
        assignee = "",
        search = "",
        section = "",
        topLevel = false,
        parentTask = "",
    } = {}
) => {
    const res = await axiosInstance.get(`/project/projects/${projectId}/tasks`, {
        params: {
            page,
            limit,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(assignee && { assignee }),
            ...(search && { search }),
            ...(section && { section }),
            ...(topLevel && { topLevel: "true" }),
            ...(parentTask && { parentTask }),
        },
    });
    return res.data;
};

/* ------------------------------------------
   TASKS (standalone)
------------------------------------------ */

/** GET /tasks/my — optional ?status= */
export const getMyTasks = async ({ status = "" } = {}) => {
    const res = await axiosInstance.get("/project/tasks/my", {
        params: {
            ...(status && { status }),
        },
    });
    return res.data;
};

/** GET /tasks/:taskId */
export const getTaskById = async (taskId) => {
    const res = await axiosInstance.get(`/project/tasks/${taskId}`);
    return res.data;
};

/** PUT /tasks/:taskId */
export const updateTask = async (taskId, data) => {
    const res = await axiosInstance.put(`/project/tasks/${taskId}`, data);
    return res.data;
};

/** PATCH /tasks/:taskId/status — manager override — body: { status, remark? } */
export const updateTaskStatus = async (taskId, data) => {
    const res = await axiosInstance.patch(`/project/tasks/${taskId}/status`, data);
    return res.data;
};

/** DELETE /tasks/:taskId — soft delete / archive */
export const deleteTask = async (taskId) => {
    const res = await axiosInstance.delete(`/project/tasks/${taskId}`);
    return res.data;
};

/* ------------------------------------------
   TASK ASSIGNMENTS
------------------------------------------ */

/** POST /tasks/:taskId/assignees — body: { userIds: [], switchToSpecific? } */
export const assignTaskUsers = async (taskId, data) => {
    const res = await axiosInstance.post(`/project/tasks/${taskId}/assignees`, data);
    return res.data;
};

/** POST /tasks/:taskId/assign-all */
export const assignTaskToAll = async (taskId) => {
    const res = await axiosInstance.post(`/project/tasks/${taskId}/assign-all`);
    return res.data;
};

/** DELETE /tasks/:taskId/assignees/:userId */
export const unassignTaskUser = async (taskId, userId) => {
    const res = await axiosInstance.delete(
        `/project/tasks/${taskId}/assignees/${userId}`
    );
    return res.data;
};

/** PATCH /tasks/:taskId/my-status — body: { status, progress?, hoursSpent?, remarks? } */
export const updateMyTaskStatus = async (taskId, data) => {
    const res = await axiosInstance.patch(
        `/project/tasks/${taskId}/my-status`,
        data
    );
    return res.data;
};

/* ------------------------------------------
   TASK COMMENTS
------------------------------------------ */

/** GET /tasks/:taskId/comments — paginated, newest first */
export const getTaskComments = async (taskId, { page = 1, limit = 20 } = {}) => {
    const res = await axiosInstance.get(`/project/tasks/${taskId}/comments`, {
        params: { page, limit },
    });
    return res.data;
};

/** POST /tasks/:taskId/comments — body: { message } */
export const addTaskComment = async (taskId, data) => {
    const res = await axiosInstance.post(`/project/tasks/${taskId}/comments`, data);
    return res.data;
};

/** DELETE /tasks/:taskId/comments/:commentId */
export const deleteTaskComment = async (taskId, commentId) => {
    const res = await axiosInstance.delete(
        `/project/tasks/${taskId}/comments/${commentId}`
    );
    return res.data;
};

/* ------------------------------------------
   PROJECT FILES & LINKS
------------------------------------------ */

/** POST /projects/:projectId/files — multipart: files[], optional taskId, category, description */
export const uploadProjectFiles = async (projectId, files, extra = {}) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    Object.entries(extra).forEach(([k, v]) => v && formData.append(k, v));
    const res = await axiosInstance.post(`/project/projects/${projectId}/files`, formData);
    return res.data;
};

/** POST /projects/:projectId/files — JSON: { url, name?, taskId?, category?, description? } */
export const addProjectLink = async (projectId, data) => {
    const res = await axiosInstance.post(`/project/projects/${projectId}/files`, data);
    return res.data;
};

/** GET /projects/:projectId/files — type: "file" | "link" */
export const getProjectFiles = async (projectId, { page = 1, limit = 20, task = "", category = "", search = "", type = "" } = {}) => {
    const res = await axiosInstance.get(`/project/projects/${projectId}/files`, {
        params: { page, limit, ...(task && { task }), ...(category && { category }), ...(search && { search }), ...(type && { type }) },
    });
    return res.data;
};

/** DELETE /projects/:projectId/files/:fileId — works for files and links */
export const deleteProjectFile = async (projectId, fileId) => {
    const res = await axiosInstance.delete(`/project/projects/${projectId}/files/${fileId}`);
    return res.data;
};

/* ------------------------------------------
   PROJECT NOTES (private to the logged-in user)
------------------------------------------ */

/** POST /project/projects/:projectId/notes — body: { title?, content, taskId?, isPinned? } */
export const createProjectNote = async (projectId, data) => {
    const res = await axiosInstance.post(`/project/projects/${projectId}/notes`, data);
    return res.data;
};

/** GET /project/projects/:projectId/notes — task: id | "none", pinned: true */
export const getProjectNotes = async (projectId, { page = 1, limit = 20, task = "", pinned = false, search = "" } = {}) => {
    const res = await axiosInstance.get(`/project/projects/${projectId}/notes`, {
        params: { page, limit, ...(task && { task }), ...(pinned && { pinned: "true" }), ...(search && { search }) },
    });
    return res.data;
};

/** PUT /project/projects/:projectId/notes/:noteId — body: { title?, content?, isPinned?, taskId? (null clears) } */
export const updateProjectNote = async (projectId, noteId, data) => {
    const res = await axiosInstance.put(`/project/projects/${projectId}/notes/${noteId}`, data);
    return res.data;
};

/** DELETE /project/projects/:projectId/notes/:noteId */
export const deleteProjectNote = async (projectId, noteId) => {
    const res = await axiosInstance.delete(`/project/projects/${projectId}/notes/${noteId}`);
    return res.data;
};