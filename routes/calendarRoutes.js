import express from "express";
import {
  addOrUpdateCalendarMonth,
  getCalendarMonths,
  deleteCalendarMonth,
  autoGenerateWeekends,
} from "../controller/CalendarController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, addOrUpdateCalendarMonth);
router.get("/", protect, getCalendarMonths);
router.delete("/:id", protect, deleteCalendarMonth);
router.post("/generate-weekends", protect, autoGenerateWeekends);

export default router;
