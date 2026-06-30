import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    createNotification,
    updateNotification,
    getAllNotifications,
    getActiveNotifications,
    inactiveNotification,
    deleteNotification,
} from "../controller/notificationController.js";

const router = express.Router();

router.post("/", protect, createNotification);
router.put("/:id", protect, updateNotification);
router.get("/", protect, getAllNotifications);
router.get("/active", protect, getActiveNotifications);
router.patch("/:id/status", protect, inactiveNotification);
router.delete("/:id", protect, deleteNotification);

export default router;
