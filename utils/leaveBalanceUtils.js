// utils/leaveBalanceUtils.js
import LeaveBalance from "../models/LeaveBalance.js";
import moment from "moment";

export const updateLeaveBalanceOnLogin = async (userId) => {
  const now = moment().utcOffset("+05:30");
  const currentMonth = now.month() + 1; // 1-12
  const currentYear = now.year();

  let balance = await LeaveBalance.findOne({ userId });

  // First login ever → create default balance
  if (!balance) {
    balance = await LeaveBalance.create({
      userId,
      carryForward: 0,
      monthlyLeaves: 1,
      extraUsed: 0,
      lastCreditedMonth: currentMonth,
      lastCreditedYear: currentYear,
      lastResetYear: currentYear,
    });
    return balance;
  }

  // ✅ 1. Yearly Reset (1 April Collapse)
  const isAfterAprilThisYear =
    currentYear > (balance.lastResetYear || 0) &&
    currentMonth >= 4;

  if (isAfterAprilThisYear) {
    balance.carryForward = 0;
    balance.monthlyLeaves = 1;
    balance.extraUsed = 0;
    balance.lastResetYear = currentYear;
    balance.lastCreditedMonth = currentMonth;
    balance.lastCreditedYear = currentYear;
    await balance.save();
    return balance;
  }

  // ✅ 2. Monthly Credit
  const newMonth = currentMonth !== balance.lastCreditedMonth;
  const newYear = currentYear !== balance.lastCreditedYear;

  if (newMonth || newYear) {
    // Move previous month's leftover into carryForward
    balance.carryForward += balance.monthlyLeaves;
    // Reset monthly leave to 1
    balance.monthlyLeaves = 1;
    balance.lastCreditedMonth = currentMonth;
    balance.lastCreditedYear = currentYear;
    await balance.save();
  }

  return balance;
};
