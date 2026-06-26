import moment from "moment";
import User from "../models/Users.js";
import Attendance from "../models/Attendance.js";
import {
  autoCreateApprovedLeaveForDate,
  findLeaveForExactDate,
} from "../utils/leaveSyncHelpers.js";

export const autoMarkAbsentees = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can run auto-absent processing.",
      });
    }

    const targetDate = req.body.date
      ? moment(req.body.date).utcOffset("+05:30").startOf("day").toDate()
      : moment().utcOffset("+05:30").startOf("day").toDate();

    const allUsers = await User.find({}, "_id name email");
    const log = [];

    for (const user of allUsers) {
      const userId = user._id;

      // 1️⃣ Check attendance row for that date
      const attendance = await Attendance.findOne({
        userId,
        date: targetDate,
      });

      // If attendance exists & already has punchIn or punchOut → skip
      if (attendance && (attendance.punchIn || attendance.punchOut)) {
        log.push({ user: user.name, status: "present - skipped" });
        continue;
      }

      // 2️⃣ If already has applied leave, skip
      const leave = await findLeaveForExactDate(userId, targetDate);
      if (leave) {
        log.push({ user: user.name, status: "already on leave - skipped" });
        continue;
      }

      // 3️⃣ Auto create FULL day leave
      const auto = await autoCreateApprovedLeaveForDate({
        userId,
        date: targetDate,
        units: 1,
        reason: "Auto Absent → Converted to full-day leave",
      });

      log.push({
        user: user.name,
        status: "auto leave created",
        leaveId: auto._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Auto-absence processing completed for ${moment(targetDate).format("YYYY-MM-DD")}`,
      processed: log.length,
      log,
    });
  } catch (err) {
    console.error("Error in autoMarkAbsentees:", err);
    res.status(500).json({
      success: false,
      message: "Server error while processing auto absentees.",
      error: err.message,
    });
  }
};
