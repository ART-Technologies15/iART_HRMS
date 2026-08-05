import cron from "node-cron";
import moment from "moment";
import User from "../models/Users.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leaves.js";
import Calendar from "../models/Calendar.js";
import CronLog from "../models/cronLogs.js";
import LeaveBalanceHistory from "../models/LeaveBalanceHistory.js";

/* ------------------ HELPERS ------------------ */
function listDays(start, end) {
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function ensureLeaveInfoForUsers() {
  await User.updateMany(
    {
      $or: [
        { leaveInfo: { $exists: false } },
        { "leaveInfo.balance": { $exists: false } },
      ],
    },
    {
      $set: {
        "leaveInfo.balance": 0,
        "leaveInfo.extraLOP": 0,
        "leaveInfo.updatedOn": new Date(),
      },
    }
  );
}

/* ---------- PROVISION PERIOD (3 MONTHS FROM EFFECTIVE JOINING MONTH) ---------- */
// Joined on/before 15th -> that month counts as provision month 1.
// Joined after 15th -> provision starts the following month.
function getProvisionMonths(joiningDate) {
  const joining = moment(joiningDate).utcOffset("+05:30");
  const joiningDay = joining.date();

  let startMonth = joining.month() + 1; // 1-based
  let startYear = joining.year();

  if (joiningDay > 15) {
    startMonth += 1;
    if (startMonth > 12) {
      startMonth = 1;
      startYear += 1;
    }
  }

  const months = [];
  let m = startMonth;
  let y = startYear;
  for (let i = 0; i < 3; i++) {
    months.push({ month: m, year: y });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function isInProvisionPeriod(joiningDate, month, year) {
  if (!joiningDate) return false;
  return getProvisionMonths(joiningDate).some(
    (p) => p.month === month && p.year === year
  );
}

async function autoCloseOpenAttendance(userId, userName, rangeStart, rangeEnd) {
  const attendanceDoc = await Attendance.findOne({ userId });

  if (!attendanceDoc) return;

  let updated = false;

  for (const record of attendanceDoc.records) {
    const recordDate = moment(record.date).utcOffset("+05:30");

    // Only previous month's records
    if (
      recordDate.isBefore(rangeStart, "day") ||
      recordDate.isAfter(rangeEnd, "day")
    ) {
      continue;
    }

    // Skip if employee never punched in
    if (!record.punchIn) continue;

    // Already punched out
    if (record.punchOut) continue;

    // Auto logout at 7 PM
    const autoPunchOut = recordDate
      .clone()
      .hour(19)
      .minute(0)
      .second(0)
      .millisecond(0);

    const totalSeconds = Math.max(
      Math.floor(
        moment.duration(
          autoPunchOut.diff(moment(record.punchIn))
        ).asSeconds()
      ),
      0
    );

    record.punchOut = autoPunchOut.toDate();
    record.totalHours = totalSeconds;

    updated = true;

    console.log(
      `Auto punch-out: ${userName} | ${recordDate.format(
        "DD-MM-YYYY"
      )} | ${autoPunchOut.format("HH:mm")}`
    );
  }

  if (updated) {
    await attendanceDoc.save();
  }
}

/* ------------------ MAIN LOGIC ------------------ */
async function processMonthlyLeaveUpdate(triggerSource = "scheduled") {
  const now = moment().utcOffset("+05:30");

  console.log(
    `\nLeave cron started (${triggerSource}) at ${now.format(
      "DD MMM YYYY HH:mm"
    )}`
  );

  await ensureLeaveInfoForUsers();

  /* ---------- FINANCIAL YEAR RESET (APRIL) ---------- */
  // if (now.month() === 3) {
  //   await User.updateMany(
  //     {},
  //     {
  //       $set: {
  //         "leaveInfo.balance": 1,
  //         "leaveInfo.extraLOP": 0,
  //         "leaveInfo.updatedOn": new Date(),
  //       },
  //     }
  //   );
  //   console.log("Financial year reset completed");
  //   return;
  // }

  /* ---------- PREVIOUS MONTH ---------- */
  const prevMonth = now.clone().subtract(1, "month");
  const month = prevMonth.month() + 1;
  const year = prevMonth.year();

  const rangeStart = prevMonth.clone().startOf("month");
  const rangeEnd = prevMonth.clone().endOf("month");
  const daysOfMonth = listDays(rangeStart.toDate(), rangeEnd.toDate());

  /* ---------- NON-WORKING DAYS (CALENDAR) ---------- */
  const calendar = await Calendar.findOne({ month, year }).lean();
  const nonWorking = new Set(
    (calendar?.nonWorkingDays || []).map((d) => d.day)
  );

  /* ---------- ACTIVE USERS ---------- */
  const users = await User.find({
    isActive: true,
    // role: "employee",
    role: { $ne: "admin" },
  }).lean();

  /* ================= PER USER ================= */
  for (const user of users) {
    try {

      /* ---------- AUTO LOGOUT EMPLOYEES WHO FORGOT TO PUNCH OUT ---------- */
      await autoCloseOpenAttendance(
        user._id,
        user.name,
        rangeStart,
        rangeEnd
      );

      /* ---------- DETERMINE EFFECTIVE DAYS (JOINING DATE) ---------- */
      let userDays = daysOfMonth; // default: full month

      if (user.joiningDate) {
        const joining = moment(user.joiningDate).utcOffset("+05:30").startOf("day");

        // Joined after this month entirely — nothing to process yet
        if (joining.isAfter(rangeEnd, "day")) {
          console.log(`${user.name} | joined after this month, skipping`);
          continue;
        }

        // Joined during this same month — only count from joining date onward
        if (joining.month() + 1 === month && joining.year() === year) {
          const effectiveStart = joining.clone();
          userDays = listDays(effectiveStart.toDate(), rangeEnd.toDate());
        }
        // else: joined in an earlier month — full month (daysOfMonth) stands as-is
      }

      /* ---------- ATTENDANCE MAP ---------- */
      const attDoc = await Attendance.findOne({ userId: user._id }).lean();
      const recMap = new Map();

      attDoc?.records?.forEach((r) => {
        if (!r.punchIn) return;
        const local = moment(r.date).utcOffset("+05:30");
        if (local.month() + 1 !== month || local.year() !== year) return;
        recMap.set(local.format("YYYY-MM-DD"), r);
      });

      /* ---------- APPROVED LEAVES MAP ---------- */
      const approvedLeaves = await Leave.find({
        userId: user._id,
        status: "approved",
        "leaveDays.date": {
          $gte: rangeStart.toDate(),
          $lte: rangeEnd.toDate(),
        },
      }).lean();

      const leaveMap = new Map();
      approvedLeaves.forEach((l) =>
        l.leaveDays.forEach((d) => {
          const key = moment(d.date)
            .utcOffset("+05:30")
            .format("YYYY-MM-DD");
          leaveMap.set(key, d.type === "half" ? 0.5 : 1);
        })
      );

      /* ---------- BUILD DAILY STATUS (NO SKIPPING) ---------- */
      const dayStatus = new Map(); // YYYY-MM-DD -> status

      // for (const d of daysOfMonth) {
      for (const d of userDays) {
        const m = moment(d).utcOffset("+05:30");
        const dateKey = m.format("YYYY-MM-DD");
        const dayNum = m.date();
        const weekday = m.day();
        const isWeekend = weekday === 0 || weekday === 6;

        if (isWeekend || nonWorking.has(dayNum)) {
          dayStatus.set(dateKey, "Holiday");
          continue;
        }

        // if (leaveMap.has(dateKey)) {
        //   dayStatus.set(
        //     dateKey,
        //     leaveMap.get(dateKey) === 0.5 ? "HalfLeave" : "Leave"
        //   );
        //   continue;
        // }

        if (leaveMap.has(dateKey)) {
          const rec = recMap.get(dateKey);
          const totalHours = rec?.totalHours || 0;

          if (totalHours >= 6 * 3600) {
            // Employee actually worked a full day despite approved leave
            dayStatus.set(dateKey, "Present"); // or a new "LeaveOverridden" status
            continue;
          }
          if (totalHours >= 4 * 3600) {
            dayStatus.set(dateKey, "Half"); // partial work, could half-cancel leave, business-rule dependent
            continue;
          }

          dayStatus.set(dateKey, leaveMap.get(dateKey) === 0.5 ? "HalfLeave" : "Leave");
          continue;
        }

        const rec = recMap.get(dateKey);
        if (!rec) {
          dayStatus.set(dateKey, "Absent");
          continue;
        }

        const totalHours = rec.totalHours || 0;
        if (totalHours < 4 * 3600) {
          dayStatus.set(dateKey, "Absent");
        } else if (totalHours < 6 * 3600) {
          dayStatus.set(dateKey, "Half");
        } else {
          dayStatus.set(dateKey, "Present");
        }
      }

      /* ---------- APPLY SANDWICH RULE ---------- */
      const keys = Array.from(dayStatus.keys());

      const isAbsentLike = (s) =>
        s === "Absent" ||
        s === "Half" ||
        s === "Leave" ||
        s === "HalfLeave";

      for (let i = 0; i < keys.length; i++) {
        if (dayStatus.get(keys[i]) !== "Holiday") continue;

        let prev = i - 1;
        while (prev >= 0 && dayStatus.get(keys[prev]) === "Holiday") prev--;

        let next = i + 1;
        while (next < keys.length && dayStatus.get(keys[next]) === "Holiday") next++;

        if (
          prev >= 0 &&
          next < keys.length &&
          isAbsentLike(dayStatus.get(keys[prev])) &&
          isAbsentLike(dayStatus.get(keys[next]))
        ) {
          dayStatus.set(keys[i], "Absent");
        }
      }

      /* ---------- CALCULATE LEAVE USED ---------- */
      let leaveUsed = 0;
      for (const status of dayStatus.values()) {
        if (status === "Absent") leaveUsed += 1;
        else if (status === "Half") leaveUsed += 0.5;
        else if (status === "Leave") leaveUsed += 1;
        else if (status === "HalfLeave") leaveUsed += 0.5;
      }

      /* ---------- PROVISION PERIOD CHECK ---------- */
      const inProvision = isInProvisionPeriod(user.joiningDate, month, year);

      /* ---------- FINAL BALANCE & LOP ---------- */
      const currentBalance = user.leaveInfo?.balance ?? 0;

      let extraLOP;
      let finalBalance;

      if (inProvision) {
        // Provision period: no LOP, balance pinned to 1 regardless of leaveUsed
        extraLOP = 0;
        finalBalance = 1;
      } else {
        extraLOP = Math.max(leaveUsed - currentBalance, 0);
        // const finalBalance = Math.max(currentBalance - leaveUsed, 0) + 1;
        finalBalance = Math.min(
          Math.max(currentBalance - leaveUsed, 0) + 1,
          10
        );
      }

      await LeaveBalanceHistory.updateOne(
        {
          userId: user._id,
          month,
          year,
        },
        {
          $set: {
            openingBalance: currentBalance,
            leaveUsed,
            extraLOP,
            closingBalance: finalBalance,
          },
        },
        {
          upsert: true,
        }
      );

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            "leaveInfo.balance": finalBalance,
            "leaveInfo.extraLOP": extraLOP,
            "leaveInfo.updatedOn": new Date(),
          },
        }
      );

      console.log(
        `${user.name} | used=${leaveUsed} | LOP=${extraLOP} | balance=${finalBalance}`
      );
    } catch (err) {
      console.error(`${user.name} error:`, err.message);
    }
  }

  await CronLog.updateOne(
    { name: "monthly-leave-cron" },
    { $set: { lastRun: new Date() } },
    { upsert: true }
  );

  console.log("Monthly leave cron completed");
}

/* ---------- SCHEDULE ---------- */
cron.schedule("5 0 1 * *", async () => {
  await processMonthlyLeaveUpdate("scheduled");
});

/* ---------- AUTO-RECOVERY ---------- */
(async () => {
  const now = moment().utcOffset("+05:30");
  const log = await CronLog.findOne({ name: "monthly-leave-cron" }).lean();

  if (!log) return await processMonthlyLeaveUpdate("first-run");

  const lastRun = moment(log.lastRun).utcOffset("+05:30");
  if (lastRun.month() !== now.month() || lastRun.year() !== now.year()) {
    return await processMonthlyLeaveUpdate("catch-up");
  }

  console.log("Cron already executed this month");
})();

export default {};
