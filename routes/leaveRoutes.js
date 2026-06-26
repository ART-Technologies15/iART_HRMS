import express from "express";
import {
  ApplyLeave,
  updateLeaveStatus,
  getMyLeaves,
  getLeavesForAdmin,
  updatePendingLeave
} from "../controller/LeaveController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/apply-leave", protect, ApplyLeave);
router.get("/my-leaves/:userId", protect, getMyLeaves);
router.get("/admin", protect, getLeavesForAdmin);
router.patch("/update/:leaveId", protect, updateLeaveStatus);
router.patch("/update-leave/:leaveId", protect, updatePendingLeave);

export default router;
