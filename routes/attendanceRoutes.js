import express from "express";
import {
  punchIn,
  punchOut,
  updateAttendance,
  getAttendanceRecord,
  getMonthlyWorkingHours,
  getOntimeandOnLatePercentage,
  getTodayAttendanceStatus,
  getAttendanceByDateForAdmin,
  getMonthlyAttendanceForAdmin
} from "../controller/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { autoMarkAbsentees } from "../controller/autoAbsentController.js";

const router = express.Router();

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);
router.get("/records/:userId", protect, getAttendanceRecord);
router.put("/update-attendance/", protect, updateAttendance);
router.get("/monthly-hours/:userId", protect, getMonthlyWorkingHours);
router.get("/today", protect, getTodayAttendanceStatus);
router.get("/punctuality/:userId", protect, getOntimeandOnLatePercentage);
router.post("/auto-absent-leave", protect, autoMarkAbsentees);
router.get("/admin/date/:date", protect, getAttendanceByDateForAdmin);
router.get("/admin/monthly", protect, getMonthlyAttendanceForAdmin);

export default router;
