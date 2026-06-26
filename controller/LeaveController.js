import LeaveBalance from "../models/LeaveBalance.js";
import Leave from "../models/Leaves.js";
import User from "../models/Users.js";
import moment from "moment/moment.js";
import Attendance from "../models/Attendance.js";
import { updateLeaveBalanceOnLogin } from "../utils/leaveBalanceUtils.js";
import MailService from "../services/mailService.js";

export const ApplyLeave = async (req, res) => {
  try {
    const { userId, reason, leaveDays } = req.body;

    if (
      !userId ||
      !reason ||
      !Array.isArray(leaveDays) ||
      leaveDays.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing fields: userId, reason, leaveDays",
      });
    }

    // ✅ Only admin or same user can apply leave
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to apply leave for this user.",
      });
    }

    // ✅ Validate each leaveDay entry
    for (const d of leaveDays) {
      if (!d.date || !d.type || !["full", "half"].includes(d.type)) {
        return res.status(400).json({
          success: false,
          message:
            "Each leaveDay must contain a valid date and type (full/half).",
        });
      }
    }

    // ✅ Normalize date only (ignore time)
    const leaveDates = leaveDays.map((d) => new Date(d.date).toDateString());

    // ✅ Check if any of the selected dates already have active leave
    const existing = await Leave.find({
      userId,
      "leaveDays.date": { $in: leaveDates },
      status: { $in: ["pending", "approved"] },
    });

    if (existing.length > 0) {
      const conflict = existing
        .flatMap((l) => l.leaveDays.map((d) => new Date(d.date).toDateString()))
        .filter((d) => leaveDates.includes(d));

      return res.status(400).json({
        success: false,
        message: `Leave already applied for: ${conflict.join(", ")}`,
      });
    }

    // ✅ Calculate total leave count (0.5 or 1 per day)
    const totalDays = leaveDays.reduce(
      (sum, d) => sum + (d.type === "half" ? 0.5 : 1),
      0
    );

    const isAutoApproved = req.user.role === "admin";

    const leave = await Leave.create({
      userId,
      reason,
      leaveDays,
      totalDays,
      status: isAutoApproved ? "approved" : "pending",
      // approvedBy: isAutoApproved ? req.user._id : null,
    });

    // attempt to send notification to admins (do not block success response)
    try {
      MailService.sendLeaveAppliedNotification(leave, totalDays).catch((e) =>
        console.error("Mailer error:", e)
      );
      MailService.sendLeaveAppliedSelfNotification(leave, totalDays).catch((e) =>
        console.error("Mailer error:", e)
      );
    } catch (e) {
      console.error("Failed to queue mail:", e);
    }

    return res.status(201).json({
      success: true,
      message: isAutoApproved
        ? "Leave applied and auto-approved."
        : "Leave applied successfully. Awaiting approval.",
      leave,
    });
  } catch (err) {
    console.error("Error in ApplyLeave:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while applying leave.",
      error: err.message,
    });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { action, userId, adminId } = req.body;

    if (!leaveId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: leaveId, action",
      });
    }

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = req.user._id.toString() === leave.userId.toString();

    /* ========================= USER ACTIONS ========================= */

    // USER: cancel (allowed only if leave is pending or approved)
    if (action === "cancel") {
      if (!isOwner)
        return res.status(403).json({
          success: false,
          message: "Only the leave owner can cancel",
        });

      if (leave.status === "rejected") {
        return res.status(400).json({
          success: false,
          message: "Rejected leave cannot be cancelled",
        });
      }

      if (leave.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Leave already cancelled",
        });
      }

      leave.status = "cancelled";
      await leave.save();
      return res.status(200).json({
        success: true,
        message: "Leave cancelled successfully",
        leave,
      });
    }

    // USER: reapply cancelled leave (cancelled → pending)
    if (action === "reapply") {
      if (!isOwner)
        return res.status(403).json({
          success: false,
          message: "Only the leave owner can reapply",
        });

      if (leave.status !== "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Only cancelled leave can be reapplied",
        });
      }

      leave.status = "pending";
      await leave.save();
      return res.status(200).json({
        success: true,
        message: "Leave moved back to pending",
        leave,
      });
    }

    /* ========================= ADMIN ACTIONS ========================= */

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admin can update leave status",
      });
    }

    if (leave.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Admin cannot modify cancelled leave",
      });
    }

    // ADMIN: change status
    const validAdminActions = ["approved", "rejected", "pending"];

    if (!validAdminActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action for admin",
      });
    }
    if (action === "rejected") {
      const { rejectionReason } = req.body;
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }
      leave.rejectionReason = rejectionReason.trim();
    }

    // Clear rejectionReason when status is NOT rejected
    if (action !== "rejected") {
      leave.rejectionReason = null; // or undefined
    }

    leave.status = action;
    await leave.save();

    return res.status(200).json({
      success: true,
      message: `Leave status updated to ${action}`,
      leave,
    });
  } catch (err) {
    console.error("Error updating leave:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating leave",
      error: err.message,
    });
  }
};


export const updatePendingLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason, leaveDays } = req.body;
    const userId = req.user._id; // from auth middleware

    // 1. Validate input
    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    if (!Array.isArray(leaveDays) || leaveDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one leave day is required",
      });
    }

    // Validate each leaveDay
    for (const day of leaveDays) {
      if (!day.date || !day.type) {
        return res.status(400).json({
          success: false,
          message: "Each leave day must have date and type",
        });
      }
      if (!["full", "half"].includes(day.type)) {
        return res.status(400).json({
          success: false,
          message: "Leave type must be 'full' or 'half'",
        });
      }
      // Normalize date to start of day in IST
      const normalizedDate = new Date(day.date);
      if (isNaN(normalizedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }
    }

    // 2. Find leave
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    // 3. Check ownership
    if (leave.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own leave requests",
      });
    }

    // 4. Check status: only pending can be edited
    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending leaves can be edited",
      });
    }

    // 5. Update fields
    leave.reason = reason.trim();

    leave.leaveDays = leaveDays.map((day) => ({
      date: new Date(day.date), // will be saved as UTC, but normalized
      type: day.type,
    }));

    await leave.save();

    // 6. Return updated leave
    return res.status(200).json({
      success: true,
      message: "Leave request updated successfully",
      leave,
    });
  } catch (err) {
    console.error("Error updating leave:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Authorization: user can view only own leaves, admin can view anyone
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view these leave records.",
      });
    }

    const query = { userId };

    // Optional date filter
    if (startDate && endDate) {
      query["leaveDays.date"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const leaves = await Leave.find(query)
      // .populate("approvedBy", "name email role")
      // .populate("rejectedBy", "name email role")
      // .populate("cancelledBy", "name email role")
      .sort({ createdAt: -1 });

    // Simple summary (no free/paid days calculation now)
    const summary = {
      totalLeaves: leaves.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    leaves.forEach((l) => {
      summary[l.status] += 1;
    });

    return res.status(200).json({
      success: true,
      message: "Leave records fetched successfully.",
      count: leaves.length,
      summary,
      leaves,
    });
  } catch (err) {
    console.error("Error fetching leaves:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leaves.",
      error: err.message,
    });
  }
};

export const getLeavesForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view all leave records.",
      });
    }

    const { date } = req.query;
    let query = {};

    if (date) {
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      query["leaveDays.date"] = { $gte: day, $lt: nextDay };
    }
    // 🚨 else: no filter (return all leaves)

    const leaves = await Leave.find(query)
      .populate("userId", "name email department designation")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (err) {
    console.error("Error fetching admin leave records:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching leave records.",
      error: err.message,
    });
  }
};

export const getLeavesByDate = async (req, res) => {
  try {
    const { date, type, status } = req.query;

    // Date is mandatory
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required to fetch leave records.",
      });
    }

    // Only admin can access this API
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Build query
    const query = { "leaveDays.date": targetDate };

    if (type) query["leaveDays.type"] = type; // "full" or "half"
    if (status) query.status = status; // "approved" | "pending" | "rejected" | "cancelled"

    // Fetch leave data
    const leaves = await Leave.find(query)
      .populate("userId", "name email department role")
      // .populate("approvedBy", "name email")
      // .populate("rejectedBy", "name email")
      // .populate("cancelledBy", "name email")
      .sort({ "userId.name": 1 });

    if (!leaves.length) {
      return res.status(200).json({
        success: true,
        message: "No leave records found for the given date and filters.",
        count: 0,
        leaves: [],
      });
    }

    // Summary for admin dashboard
    const summary = {
      total: leaves.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
      totalFreeDays: 0,
      totalPaidDays: 0,
    };

    for (const l of leaves) {
      summary[l.status] = (summary[l.status] || 0) + 1;
      summary.totalFreeDays += l.freeDaysUsed || 0;
      summary.totalPaidDays += l.paidDaysUsed || 0;
    }

    // Success Response
    res.status(200).json({
      success: true,
      message: "Leave records fetched successfully for the given date.",
      date: targetDate.toDateString(),
      count: leaves.length,
      summary,
      leaves,
    });
  } catch (err) {
    console.error("Error fetching leaves by date:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching leaves by date.",
      error: err.message,
    });
  }
};

export const getMyLeaveSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorization: user can only view their own summary (unless admin)
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this leave summary.",
      });
    }

    // Fetch all leaves (only status affecting summary)
    const leaves = await Leave.find({ userId });

    // Summary defaults
    let summary = {
      pendingLeaves: 0,
      approvedFreeDays: 0,
      approvedPaidDays: 0,
      cancelledLeaves: 0,
      rejectedLeaves: 0,
      totalLeaveRequests: leaves.length,
    };

    leaves.forEach((leave) => {
      if (leave.status === "pending") summary.pendingLeaves++;
      if (leave.status === "approved") {
        summary.approvedFreeDays += leave.freeDaysUsed || 0;
        summary.approvedPaidDays += leave.paidDaysUsed || 0;
      }
      if (leave.status === "cancelled") summary.cancelledLeaves++;
      if (leave.status === "rejected") summary.rejectedLeaves++;
    });

    // Also fetch remaining free leave balance
    const balance = await LeaveBalance.findOne({ userId });

    summary.availableFreeLeaves =
      (balance?.totalFreeEarned || 0) - (balance?.totalFreeUsed || 0);

    return res.status(200).json({
      success: true,
      message: "Leave summary fetched successfully.",
      summary,
    });
  } catch (err) {
    console.error("Error fetching leave summary:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leave summary.",
      error: err.message,
    });
  }
};

export const getLeaveBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admin or same user allowed
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this leave balance.",
      });
    }

    // Auto-create + auto-credit logic
    const balance = await updateLeaveBalanceOnLogin(userId);

    const availableFree = balance.carryForward + balance.monthlyLeaves;

    return res.status(200).json({
      success: true,
      message: "Leave balance fetched successfully.",
      balance: {
        carryForward: balance.carryForward,
        monthlyLeaves: balance.monthlyLeaves,
        extraUsed: balance.extraUsed,
        availableFree,
      },
    });
  } catch (err) {
    console.error("Error fetching leave balance:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching leave balance.",
      error: err.message,
    });
  }
};
