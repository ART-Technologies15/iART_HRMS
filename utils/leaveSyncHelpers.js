// utils/leaveSyncHelpers.js
import moment from "moment";
import Leaves from "../models/Leaves.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Attendance from "../models/Attendance.js";
import { updateLeaveBalanceOnLogin } from "./leaveBalanceUtils.js";

const istDay = (date) =>
  moment(date).utcOffset("+05:30").startOf("day").toDate();

/** Find a leave (pending/approved) that includes EXACT date (date-only match) */
export const findLeaveForExactDate = async (userId, date) => {
  const dayStr = istDay(date).toDateString();
  return Leaves.findOne({
    userId,
    "leaveDays.date": { $in: [dayStr] },
    status: { $in: ["pending", "approved"] },
  });
};

/** Auto-create APPROVED leave for given date with units (0.5 or 1), deducting monthly -> carry -> extra. */
export const autoCreateApprovedLeaveForDate = async ({
  userId,
  date,
  units,
  reason,
}) => {
  const day = istDay(date);
  const leaveType = units === 0.5 ? "half" : "full";

  // ensure balance is current
  const balance = await updateLeaveBalanceOnLogin(userId);

  // split
  let remaining = units;
  const freeFromMonthly = Math.min(remaining, balance.monthlyLeaves);
  remaining -= freeFromMonthly;

  const freeFromCarry = Math.min(remaining, balance.carryForward);
  remaining -= freeFromCarry;

  const paidDaysUsed = remaining;
  const freeDaysUsed = freeFromMonthly + freeFromCarry;

  // deduct
  balance.monthlyLeaves = Math.max(0, balance.monthlyLeaves - freeFromMonthly);
  balance.carryForward = Math.max(0, balance.carryForward - freeFromCarry);
  balance.extraUsed = Math.max(0, balance.extraUsed + paidDaysUsed);
  await balance.save();

  // create approved leave (system)
  const leave = await Leaves.create({
    userId,
    reason,
    leaveDays: [{ date: day, type: leaveType }],
    totalDays: units,
    freeDaysUsed,
    paidDaysUsed,
    freeFromMonthly,
    freeFromCarry,
    status: "approved",
    approvedBy: null, // system
  });

  // align attendance
  await Attendance.findOneAndUpdate(
    { userId, date: day },
    {
      userId,
      date: day,
      attendanceType: units === 0.5 ? "Half Day" : "On Leave",
      status: "On Leave",
      unavailabilityReason: reason,
    },
    { upsert: true, new: true }
  );

  return leave;
};

/** Approve an existing PENDING leave (deduct using its stored split). */
export const approvePendingLeave = async (leave, adminId = null) => {
  if (!leave || leave.status !== "pending") return leave;

  const balance = await updateLeaveBalanceOnLogin(leave.userId);

  // deduct exactly as stored
  balance.monthlyLeaves = Math.max(
    0,
    balance.monthlyLeaves - leave.freeFromMonthly
  );
  balance.carryForward = Math.max(
    0,
    balance.carryForward - leave.freeFromCarry
  );
  balance.extraUsed = Math.max(0, balance.extraUsed + leave.paidDaysUsed);
  await balance.save();

  leave.status = "approved";
  leave.approvedBy = adminId || null;
  await leave.save();

  // ensure attendance
  for (const day of leave.leaveDays) {
    await Attendance.findOneAndUpdate(
      { userId: leave.userId, date: new Date(day.date) },
      {
        userId: leave.userId,
        date: new Date(day.date),
        attendanceType: day.type === "half" ? "Half Day" : "On Leave",
        status: "On Leave",
        unavailabilityReason: leave.reason,
      },
      { upsert: true, new: true }
    );
  }

  return leave;
};

/** Refund and delete a one-day leave for exact date.
 * If the leave spans multiple days, we DO NOT auto-split; we return { skipped: true }.
 */
export const refundAndDeleteOneDayLeaveForDate = async (userId, date) => {
  const day = istDay(date);
  const leave = await findLeaveForExactDate(userId, day);
  if (!leave) return { refunded: false, deleted: false, reason: "no-leave" };

  // only auto-handle single-day leaves safely
  if (!leave.leaveDays || leave.leaveDays.length !== 1) {
    return { refunded: false, deleted: false, reason: "multi-day-leave-skip" };
  }

  // if approved -> refund exactly
  if (leave.status === "approved") {
    const balance = await LeaveBalance.findOne({ userId });

    if (balance) {
      // monthly cap at 1 on refund
      balance.monthlyLeaves = Math.min(
        1,
        balance.monthlyLeaves + (leave.freeFromMonthly || 0)
      );
      balance.carryForward =
        (balance.carryForward || 0) + (leave.freeFromCarry || 0);
      balance.extraUsed = Math.max(
        0,
        (balance.extraUsed || 0) - (leave.paidDaysUsed || 0)
      );
      await balance.save();
    }
  }

  // delete leave doc
  await Leaves.deleteOne({ _id: leave._id });

  // cleanup attendance row (keep status Present if admin is setting it so in controller)
  await Attendance.findOneAndUpdate(
    { userId, date: day },
    { unavailabilityReason: "", status: "Present" } // controller may override further
  );

  return {
    refunded: leave.status === "approved",
    deleted: true,
    leaveId: leave._id,
  };
};
