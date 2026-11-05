import express from "express";
import multer from "multer";
import {
    createProject,
    getProjects,
    getMyProjects,
    getProjectById,
    updateProject,
    updateProjectStatus,
    deleteProject,
    getProjectMembers,
    addProjectMembers,
    removeProjectMember,
    createTask,
    getProjectTasks,
    getMyTasks,
    getTaskById,
    updateTask,
    updateTaskStatus,
    deleteTask,
    assignTaskUsers,
    assignTaskToAll,
    unassignTaskUser,
    updateMyTaskStatus,
    addTaskComment,
    getTaskComments,
    deleteTaskComment,
    uploadProjectFiles,
    getProjectFiles,
    deleteProjectFile,
    createProjectNote,
    getProjectNotes,
    updateProjectNote,
    deleteProjectNote,
} from "../controller/projectController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(protect);

router.post("/projects", createProject);
router.get("/projects", getProjects);
router.get("/projects/my", getMyProjects);          // keep above :projectId
router.get("/projects/:projectId", getProjectById);
router.put("/projects/:projectId", updateProject);
router.patch("/projects/:projectId/status", updateProjectStatus);
router.delete("/projects/:projectId", deleteProject);

router.get("/projects/:projectId/members", getProjectMembers);
router.post("/projects/:projectId/members", addProjectMembers);
router.delete("/projects/:projectId/members/:userId", removeProjectMember);

router.post("/projects/:projectId/tasks", createTask);
router.get("/projects/:projectId/tasks", getProjectTasks);

router.get("/tasks/my", getMyTasks);                // keep above :taskId
router.get("/tasks/:taskId", getTaskById);
router.put("/tasks/:taskId", updateTask);
router.patch("/tasks/:taskId/status", updateTaskStatus);
router.delete("/tasks/:taskId", deleteTask);
router.post("/tasks/:taskId/assignees", assignTaskUsers);
router.post("/tasks/:taskId/assign-all", assignTaskToAll);
router.delete("/tasks/:taskId/assignees/:userId", unassignTaskUser);
router.patch("/tasks/:taskId/my-status", updateMyTaskStatus);

router.post("/tasks/:taskId/comments", addTaskComment);
router.get("/tasks/:taskId/comments", getTaskComments);
router.delete("/tasks/:taskId/comments/:commentId", deleteTaskComment);

router.post("/projects/:projectId/files", upload.array("files", 10), uploadProjectFiles);
router.get("/projects/:projectId/files", getProjectFiles);
router.delete("/projects/:projectId/files/:fileId", deleteProjectFile);

router.post("/projects/:projectId/notes", createProjectNote);
router.get("/projects/:projectId/notes", getProjectNotes);
router.put("/projects/:projectId/notes/:noteId", updateProjectNote);
router.delete("/projects/:projectId/notes/:noteId", deleteProjectNote);

export default router;