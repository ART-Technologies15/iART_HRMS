// utils/autoLeaveFromAttendance.js
import moment from "moment";
import LeaveBalance from "../models/LeaveBalance.js";
import Leaves from "../models/Leaves.js";
import Attendance from "../models/Attendance.js";
import { updateLeaveBalanceOnLogin } from "./leaveBalanceUtils.js";

// Normalize date to start-of-day IST
const normalizeIST = (date) =>
  moment(date).utcOffset("+05:30").startOf("day").toDate();

export const autoDeductLeaveForDate = async ({
  userId,
  date, 
  units, 
  reason,
}) => {
  const day = normalizeIST(date);
  const dayStr = day.toDateString();

  const existing = await Leaves.findOne({
    userId,
    "leaveDays.date": { $in: [dayStr] },
    status: { $in: ["pending", "approved"] },
  });

  if (existing) {
    return { created: false, reason: "existing leave found for date" };
  }

  // 1) Update balance (monthly credit / April reset)
  const balance = await updateLeaveBalanceOnLogin(userId);

  // 2) Split deduction: monthly -> carry -> extra
  let remaining = units;
  const freeFromMonthly = Math.min(remaining, balance.monthlyLeaves);
  remaining -= freeFromMonthly;

  const freeFromCarry = Math.min(remaining, balance.carryForward);
  remaining -= freeFromCarry;

  const paidDaysUsed = remaining; // whatever remains → extra

  // 3) Deduct immediately (approved)
  balance.monthlyLeaves -= freeFromMonthly;
  balance.carryForward -= freeFromCarry;
  balance.extraUsed += paidDaysUsed;

  // floors & caps
  balance.monthlyLeaves = Math.max(0, balance.monthlyLeaves);
  balance.carryForward = Math.max(0, balance.carryForward);
  balance.extraUsed = Math.max(0, balance.extraUsed);

  await balance.save();

  // 4) Create APPROVED Leaves (auto-created)
  const totalDays = units;
  const leave = await Leaves.create({
    userId,
    reason,
    leaveDays: [{ date: day, type: units === 0.5 ? "half" : "full" }],
    totalDays,
    freeDaysUsed: freeFromMonthly + freeFromCarry,
    paidDaysUsed,
    freeFromMonthly,
    freeFromCarry,
    status: "approved",
    approvedBy: null, // system approval
  });

  // 5) Ensure Attendance is aligned (status & type already set by caller; this is a safety net)
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

  return {
    created: true,
    leave,
    split: { freeFromMonthly, freeFromCarry, paidDaysUsed },
  };
};
