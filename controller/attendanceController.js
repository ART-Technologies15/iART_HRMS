import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import moment from "moment-timezone";
import { isNonWorkingDay } from "../utils/calendarUtils.js";
import { updateMonthlySummary } from "../utils/updateMonthlySummary.js";
import Calendar from "../models/Calendar.js";
import User from "../models/Users.js";
import Leave from "../models/Leaves.js"; // import Leave model
import Regularization from "../models/Regularization.js";
import MailService from "../services/mailService.js";
import LeaveBalanceHistory from "../models/LeaveBalanceHistory.js";
import AttendanceAudit from "../models/AttendanceAudit.js";

const ONTIME_THRESHOLD_MINUTES = 10 * 60; // 10:00 AM / 600 mins

const escapeRegex = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const punchIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const nowIST = moment().utcOffset("+05:30");

    const today = nowIST.clone().startOf("day").toDate();

    let autoActions = {
      autoClosedDays: []
    };

    // 1. Block punch on non-working day
    if (await isNonWorkingDay(today)) {
      return res.status(400).json({
        success: false,
        message: "Punch-in is disabled on non-working days.",
      });
    }

    // 2. Find or create attendance doc for user
    let attendanceDoc = await Attendance.findOne({ userId });
    if (!attendanceDoc) {
      attendanceDoc = await Attendance.create({
        userId,
        records: [],
        monthlySummary: [],
      });
    }

    // Helper: find record by date
    const findRecord = (date) =>
      attendanceDoc.records.find((r) => moment(r.date).isSame(date, "day"));

    // ================================================
    // AUTO-CLOSE **ALL** PREVIOUS OPEN DAYS
    // ================================================
    const openRecords = attendanceDoc.records.filter(
      (r) =>
        moment(r.date).isBefore(today, "day") &&
        r.punchIn &&
        !r.punchOut
    );

    for (const record of openRecords) {
      const defaultOut = moment(record.date)
        .utcOffset("+05:30")
        .hour(19)
        .minute(0)
        .second(0);

      const totalSeconds = Math.floor(
        moment.duration(defaultOut.diff(moment(record.punchIn))).asSeconds()
      );

      record.punchOut = defaultOut.toDate();
      record.totalHours = Math.max(totalSeconds, 0);

      autoActions.autoClosedDays.push({
        date: record.date,
        punchOut: record.punchOut,
        totalSeconds: record.totalHours,
      });
    }

    // ================================================
    // PREVENT DUPLICATE PUNCH-IN FOR TODAY
    // ================================================
    const todayRecord = findRecord(today);
    if (todayRecord && todayRecord.punchIn) {
      return res.status(400).json({
        success: false,
        message: "You have already punched in today.",
      });
    }

    // ================================================
    // CREATE OR UPDATE TODAY RECORD
    // ================================================
    if (!todayRecord) {
      attendanceDoc.records.push({
        date: today,
        punchIn: nowIST.toDate(),
        totalHours: 0,
      });
    } else {
      todayRecord.punchIn = nowIST.toDate();
    }

    // Save all updates
    await attendanceDoc.save();

    return res.status(201).json({
      success: true,
      message: "Punch-in successful.",
      punchInTime: nowIST.toDate(),
      autoActions,
    });

  } catch (err) {
    console.error("Error in punchIn:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while punching in.",
      error: err.message,
    });
  }
};


export const punchOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const nowIST = moment().utcOffset("+05:30");
    const today = nowIST.clone().startOf("day").toDate();

    const attendanceDoc = await Attendance.findOne({ userId });
    if (!attendanceDoc) {
      return res.status(400).json({
        success: false,
        message: "No attendance record found. Please punch in first.",
      });
    }

    const record = attendanceDoc.records.find((r) =>
      moment(r.date).isSame(today, "day")
    );

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No punch-in found for today.",
      });
    }

    if (!record.punchIn) {
      return res.status(400).json({
        success: false,
        message: "Cannot punch out without punch in.",
      });
    }

    if (record.punchOut) {
      return res.status(400).json({
        success: false,
        message: "Punch-out already recorded for today.",
      });
    }

    record.punchOut = nowIST.toDate();
    record.totalHours = Math.floor((record.punchOut - record.punchIn) / 1000);

    // update monthly summary
    updateMonthlySummary(attendanceDoc, record.date);

    await attendanceDoc.save();

    return res.status(200).json({
      success: true,
      message: "Punch-out successful.",
      totalSeconds: record.totalHours,
    });
  } catch (err) {
    console.error("Error in punchOut:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while punching out.",
      error: err.message,
    });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and HR can update attendance records.",
      });
    }

    const { userId, date, punchIn, punchOut } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "userId and date are required.",
      });
    }

    // HR cannot edit their own attendance
    if (
      ["admin", "hr"].includes(req.user.role) &&
      req.user._id.toString() === userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot modify your own attendance.",
      });
    }

    const isClearRequest = punchIn === null && punchOut === null;

    if (!isClearRequest && !punchIn && !punchOut) {
      return res.status(400).json({
        success: false,
        message:
          "At least punchIn or punchOut must be provided unless clearing the record.",
      });
    }

    // Disallow punchOut without punchIn (unless clearing)
    if (!isClearRequest && !punchIn && punchOut) {
      return res.status(400).json({
        success: false,
        message: "Cannot set punchOut without punchIn.",
      });
    }

    const targetDate = moment(date).utcOffset("+05:30").startOf("day").toDate();
    const targetDateStr = moment(targetDate)
      .utcOffset("+05:30")
      .format("YYYY-MM-DD");

    // Validate punchIn belongs to same date
    if (punchIn) {
      const pinDateStr = moment(punchIn)
        .utcOffset("+05:30")
        .format("YYYY-MM-DD");
      if (pinDateStr !== targetDateStr) {
        return res.status(400).json({
          success: false,
          message: "Punch-in time does not match the attendance date.",
        });
      }
    }

    // Validate punchOut belongs to same date
    if (punchOut) {
      const poutDateStr = moment(punchOut)
        .utcOffset("+05:30")
        .format("YYYY-MM-DD");
      if (poutDateStr !== targetDateStr) {
        return res.status(400).json({
          success: false,
          message: "Punch-out time does not match the attendance date.",
        });
      }
    }

    // Find or create user doc
    let attendanceDoc = await Attendance.findOne({ userId });
    if (!attendanceDoc) {
      attendanceDoc = await Attendance.create({
        userId,
        records: [],
        monthlySummary: [],
      });
    }

    // Find or create the record for the date
    let record = attendanceDoc.records.find((r) =>
      moment(r.date).isSame(targetDate, "day")
    );

    const recordExists = !!record;

    // Store previous values BEFORE making any changes
    const previousPunchIn = record?.punchIn ?? null;
    const previousPunchOut = record?.punchOut ?? null;

    // New values coming from request
    const newPunchInDate = punchIn ? new Date(punchIn) : null;
    const newPunchOutDate = punchOut ? new Date(punchOut) : null;

    // Check if anything actually changed
    const attendanceChanged =
      previousPunchIn?.getTime() !== newPunchInDate?.getTime() ||
      previousPunchOut?.getTime() !== newPunchOutDate?.getTime();

    if (!attendanceChanged) {
      return res.status(400).json({
        success: false,
        message: "No changes detected.",
      });
    }

    if (!record) {
      const punchInDate = punchIn ? new Date(punchIn) : null;
      const punchOutDate = punchOut ? new Date(punchOut) : null;
      const totalHours =
        punchInDate && punchOutDate
          ? Math.floor((punchOutDate - punchInDate) / 1000)
          : 0;

      record = {
        date: targetDate,
        punchIn: isClearRequest ? null : punchInDate,
        punchOut: isClearRequest ? null : punchOutDate,
        totalHours: isClearRequest ? 0 : totalHours,
      };

      attendanceDoc.records.push(record);
    }

    // If clearing record
    if (isClearRequest) {
      record.punchIn = null;
      record.punchOut = null;
      record.totalHours = 0;
    } else {
      if (punchIn) record.punchIn = new Date(punchIn);
      if (punchOut) record.punchOut = new Date(punchOut);
      record.totalHours =
        record.punchIn && record.punchOut
          ? Math.floor((record.punchOut - record.punchIn) / 1000)
          : 0;
    }

    //Update monthly summary
    updateMonthlySummary(attendanceDoc, targetDate);

    await attendanceDoc.save();

    await AttendanceAudit.create({
      attendanceId: attendanceDoc._id,
      attendanceRecordId: record._id,
      employeeId: userId,

      updatedBy: req.user._id,
      updaterRole: req.user.role,

      action: isClearRequest
        ? "Cleared"
        : recordExists ? "Updated" : "Created",

      previousPunchIn,
      previousPunchOut,

      newPunchIn: record.punchIn,
      newPunchOut: record.punchOut,

      remarks: req.body.remarks || "",

      ipAddress:
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      record,
    });
  } catch (err) {
    console.error("Error updating attendance:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating attendance.",
      error: err.message,
    });
  }
};

const getOnTimeStatus = (punchInDate) => {
  if (!punchInDate) return null;

  const ist = moment(punchInDate).utcOffset("+05:30");
  const mins = ist.hours() * 60 + ist.minutes();

  return mins <= ONTIME_THRESHOLD_MINUTES;
};

function listDays(start, end) {
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export const getAttendanceRecord = async (req, res) => {
  try {
    const { userId } = req.params;
    let { month, year, startDate, endDate } = req.query;

    // Authorization
  //  if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
  //     return res.status(403).json({
  //       success: false,
  //       message: "You are not authorized to view this record.",
  //     });
  //   }


    const nowIST = moment().utcOffset("+05:30");
    const hasRange = startDate || endDate;

    let rangeStart, rangeEnd;

    if (hasRange) {
      rangeStart = startDate
        ? moment(startDate).utcOffset("+05:30").startOf("day")
        : nowIST.clone().startOf("month");

      rangeEnd = endDate
        ? moment(endDate).utcOffset("+05:30").endOf("day")
        : nowIST.clone().endOf("day");
    } else {
      month = month ? parseInt(month, 10) : nowIST.month() + 1;
      year = year ? parseInt(year, 10) : nowIST.year();

      const reqStart = moment({ year, month: month - 1 })
        .utcOffset("+05:30")
        .startOf("month");

      const reqEnd = reqStart.clone().endOf("month");
      const today = nowIST.clone().startOf("day");

      if (reqStart.isAfter(today, "day")) {
        return res.status(200).json([]);
      }

      rangeStart = reqStart;
      rangeEnd = reqEnd.isAfter(today) ? today : reqEnd;
    }

    const days = listDays(rangeStart.toDate(), rangeEnd.toDate());

    // -------------------------
    // Approved Leaves
    // -------------------------
    const approvedLeaves = await Leave.find({
      userId,
      status: "approved",
      "leaveDays.date": {
        $gte: rangeStart.toDate(),
        $lte: rangeEnd.toDate(),
      },
    }).lean();

    const leaveSet = new Set();

    approvedLeaves.forEach((leave) => {
      leave.leaveDays.forEach((d) => {
        leaveSet.add(
          moment(d.date).utcOffset("+05:30").format("YYYY-MM-DD")
        );
      });
    });

    // -------------------------
    // Holidays
    // -------------------------
    const calendarDocs = await Calendar.find({
      year: { $in: [rangeStart.year(), rangeEnd.year()] },
      month: { $in: [rangeStart.month() + 1, rangeEnd.month() + 1] },
    }).lean();

    const holidayMap = new Map();

    calendarDocs.forEach((cal) => {
      cal.nonWorkingDays.forEach((d) => {
        const key = moment({
          year: cal.year,
          month: cal.month - 1,
          day: d.day,
        })
          .utcOffset("+05:30")
          .format("YYYY-MM-DD");

        holidayMap.set(key, d.reason);
      });
    });

    // -------------------------
    // Attendance
    // -------------------------
    const attDoc = await Attendance.findOne({ userId }).lean();

    const attendanceId = attDoc?._id || null;

    const recMap = new Map();

    if (attDoc?.records?.length) {
      attDoc.records.forEach((r) => {
        const key = moment(r.date)
          .utcOffset("+05:30")
          .format("YYYY-MM-DD");

        recMap.set(key, r);
      });
    }

    // -------------------------
    // Regularizations (for this user, within the same range)
    // -------------------------
    const regularizations = await Regularization.find({
      userId,
      attendanceDate: {
        $gte: rangeStart.toDate(),
        $lte: rangeEnd.toDate(),
      },
    })
      .sort({ createdAt: -1 }) // most recent first
      .lean();

    // Keep only the latest regularization per date — if an employee
    // resubmits after a rejection, the newest request is the one
    // that should drive the UI (Edit / status badge).
    const regularizationMap = new Map();

    regularizations.forEach((r) => {
      const key = moment(r.attendanceDate)
        .utcOffset("+05:30")
        .format("YYYY-MM-DD");

      if (!regularizationMap.has(key)) {
        regularizationMap.set(key, r);
      }
    });

    const todayKey = nowIST.format("YYYY-MM-DD");
    const WORK_SECONDS = 8 * 3600;

    const data = days
      .map((d) => {
        const dayKey = moment(d)
          .utcOffset("+05:30")
          .format("YYYY-MM-DD");

        const rec = recMap.get(dayKey);
        const hasAttendance = !!rec;

        const existingRegularization = regularizationMap.get(dayKey) || null;
        const hasRegularization = !!existingRegularization;

        let totalSeconds = 0;

        if (hasAttendance) {
          const punchIn = rec.punchIn ? new Date(rec.punchIn) : null;
          const punchOut = rec.punchOut ? new Date(rec.punchOut) : null;

          if (punchIn && punchOut) {
            totalSeconds =
              rec.totalHours ||
              Math.floor((punchOut - punchIn) / 1000);
          } else if (punchIn && dayKey === todayKey) {
            totalSeconds = Math.max(
              0,
              moment().diff(moment(punchIn), "seconds")
            );
          }
        }

        let attendanceStatus = "Absent";

        if (totalSeconds > 0) {
          const percent = (totalSeconds / WORK_SECONDS) * 100;

          if (percent < 40) {
            attendanceStatus = "Absent";
          } else if (percent < 81.25) {
            attendanceStatus = "Present (Half Day)";
          } else {
            attendanceStatus = "Present (Full Day)";
          }
        }

        // ===================================
        // 1. Attendance always has priority
        // ===================================
        if (hasAttendance) {
          return {
            attendanceId,
            recordId: rec._id,
            date: dayKey,
            punchIn: rec.punchIn,
            punchOut: rec.punchOut,
            totalHours: totalSeconds,
            status: attendanceStatus,
            onTime: getOnTimeStatus(rec.punchIn),
            holiday: holidayMap.get(dayKey) || null,
            onLeave: leaveSet.has(dayKey),
            hasRegularization,
            ...(hasRegularization && { regularization: existingRegularization }),
          };
        }

        // ===================================
        // 2. Leave
        // ===================================
        if (leaveSet.has(dayKey)) {
          return {
            attendanceId,
            recordId: null,
            date: dayKey,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: "On Leave",
            onTime: null,
            hasRegularization,
            ...(hasRegularization && { regularization: existingRegularization }),
          };
        }

        // ===================================
        // 3. Holiday / Weekend
        // ===================================
        if (holidayMap.has(dayKey)) {
          return {
            attendanceId,
            recordId: null,
            date: dayKey,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: `Holiday (${holidayMap.get(dayKey)})`,
            onTime: null,
            hasRegularization,
            ...(hasRegularization && { regularization: existingRegularization }),
          };
        }

        // ===================================
        // 4. Absent
        // ===================================
        return {
          attendanceId,
          recordId: null,
          date: dayKey,
          punchIn: "",
          punchOut: "",
          totalHours: 0,
          status: "Absent",
          onTime: null,
          hasRegularization,
          ...(hasRegularization && { regularization: existingRegularization }),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error in getAttendanceRecord:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching attendance records.",
      error: err.message,
    });
  }
};

export const getMonthlyWorkingHours = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only Admin and HR can update attendance records.",
    //   });
    // }

    const nowIST = moment().utcOffset("+05:30");
    const targetMonth = month ? parseInt(month, 10) : nowIST.month() + 1; // 1..12
    const targetYear = year ? parseInt(year, 10) : nowIST.year();

    const attendanceDoc = await Attendance.findOne({ userId }).lean();

    if (!attendanceDoc || !attendanceDoc.monthlySummary?.length) {
      return res.status(200).json({
        success: true,
        message: "No working hours found for this month.",
        data: {
          userId,
          month: targetMonth,
          year: targetYear,
          totalWorkingSeconds: 0,
        },
      });
    }

    const summaryEntry = attendanceDoc.monthlySummary.find(
      (m) => m.month === targetMonth && m.year === targetYear
    );

    return res.status(200).json({
      success: true,
      message: "Monthly working hours fetched.",
      data: {
        userId,
        month: targetMonth,
        year: targetYear,
        totalWorkingSeconds: summaryEntry?.totalHours || 0,
      },
    });
  } catch (err) {
    console.error("Error in getMonthlyWorkingHours:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching monthly working hours.",
      error: err.message,
    });
  }
};

export const getOntimeandOnLatePercentage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only Admin and HR can update attendance records.",
    //   });
    // }

    const nowIST = moment().utcOffset("+05:30");
    const targetMonth = month ? parseInt(month, 10) : nowIST.month() + 1;
    const targetYear = year ? parseInt(year, 10) : nowIST.year();

    const attendanceDoc = await Attendance.findOne({ userId }).lean();

    const monthName = moment({
      year: targetYear,
      month: targetMonth - 1,
    }).format("MMMM");

    if (!attendanceDoc?.records?.length) {
      return res.status(200).json({
        success: true,
        data: {
          month: monthName,
          year: targetYear,
          onTime: { percentage: "0%", change: "0%" },
          late: { percentage: "0%", change: "0%" },
          recordsAnalyzed: 0,
        },
      });
    }

    const filtered = attendanceDoc.records.filter((r) => {
      const d = moment(r.date).utcOffset("+05:30");
      return (
        d.month() + 1 === targetMonth && d.year() === targetYear && r.punchIn
      );
    });

    if (filtered.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          month: monthName,
          year: targetYear,
          onTime: { percentage: "0%", change: "0%" },
          late: { percentage: "0%", change: "0%" },
          recordsAnalyzed: 0,
        },
      });
    }

    const ONTIME_LIMIT_MINUTES = 620; // 10:20 AM
    const onTimeCount = filtered.filter((r) => {
      const t = new Date(r.punchIn);
      const mins = t.getHours() * 60 + t.getMinutes();
      return mins <= ONTIME_LIMIT_MINUTES;
    }).length;

    const total = filtered.length;
    const onTimePct = ((onTimeCount / total) * 100).toFixed(2) + "%";
    const latePct = (100 - parseFloat(onTimePct)).toFixed(2) + "%";

    res.status(200).json({
      success: true,
      data: {
        month: monthName,
        year: targetYear,
        onTime: { percentage: onTimePct, change: "0%" },
        late: { percentage: latePct, change: "0%" },
        recordsAnalyzed: total,
      },
    });
  } catch (err) {
    console.error("Error in getOntimeandOnLatePercentage:", err);
    res.status(500).json({
      success: false,
      message: "Server error while calculating punctuality.",
      error: err.message,
    });
  }
};

export const getAttendanceByDateForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view attendance by date.",
      });
    }

    let { date } = req.params;
    const nowIST = moment().utcOffset("+05:30");

    const targetDate = date ? moment(date).utcOffset("+05:30") : nowIST.clone();

    const dayStart = targetDate.clone().startOf("day").toDate();
    const dayEnd = targetDate.clone().endOf("day").toDate();

    const isHoliday = await isNonWorkingDay(dayStart);

    const users = await User.find(
      {
        isActive: true,
        role: { $ne: "admin" }, // Exclude admins
      },
      "_id name email role"
    ).lean();

    const userIds = users.map((u) => u._id);

    const attendanceDocs = await Attendance.find({
      userId: { $in: userIds },
    }).lean();

    const attMap = new Map();
    attendanceDocs.forEach((doc) => {
      doc.records?.forEach((r) => {
        if (moment(r.date).isSame(dayStart, "day")) {
          attMap.set(String(doc.userId), r);
        }
      });
    });

    const WORK_SECONDS = 8 * 3600; // 8 hours = full day

    const data = users.map((u) => {
      const record = attMap.get(String(u._id));

      // ----- HOLIDAY -----
      if (isHoliday) {
        return {
          userId: u._id,
          name: u.name,
          punchIn: "",
          punchOut: "",
          totalHours: 0,
          status: "Holiday",
          onTime: null,
        };
      }

      // ----- HAS ATTENDANCE -----
      if (record?.punchIn) {
        const punchIn = new Date(record.punchIn);

        // If user hasn't punched out yet, calculate till current time
        const punchOut = record.punchOut
          ? new Date(record.punchOut)
          : new Date();

        let totalSeconds;

        if (record.punchOut) {
          // Use stored value after punch out
          totalSeconds = record.totalHours || 0;
        } else {
          // Live calculation
          totalSeconds = Math.max(
            0,
            Math.floor((punchOut.getTime() - punchIn.getTime()) / 1000)
          );
        }

        const percent = Number(
          ((totalSeconds / WORK_SECONDS) * 100).toFixed(2)
        );

        let status;

        if (percent < 40) {
          status = "Absent";
        } else if (percent < 81.25) {
          status = "Half Day";
        } else {
          status = "Present";
        }

        const punchInIST = moment(punchIn).utcOffset("+05:30");
        const mins = punchInIST.hours() * 60 + punchInIST.minutes();

        return {
          userId: u._id,
          name: u.name,
          punchIn,
          punchOut: record.punchOut ? new Date(record.punchOut) : "",
          totalHours: totalSeconds,
          status,
          onTime: mins <= 600,
          percent,
        };
      }

      // ----- NO ATTENDANCE -----
      return {
        userId: u._id,
        name: u.name,
        punchIn: "",
        punchOut: "",
        totalHours: 0,
        status: "Absent",
        onTime: null,
      };
    });

    return res.status(200).json({
      success: true,
      date: targetDate.format("YYYY-MM-DD"),
      isHoliday,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Error in getAttendanceByDateForAdmin:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching attendance by date.",
      error: err.message,
    });
  }
};

export const getTodayAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const nowIST = moment().utcOffset("+05:30");
    const today = nowIST.clone().startOf("day").toDate();

    // 1️⃣ Holiday check
    if (await isNonWorkingDay(today)) {
      return res.status(200).json({
        success: true,
        isHoliday: true,
        punchedIn: false,
        punchedOut: false,
        totalSeconds: 0,
      });
    }

    // 2️⃣ Find user's attendance doc
    const attendanceDoc = await Attendance.findOne({ userId }).lean();
    if (!attendanceDoc) {
      return res.status(200).json({
        success: true,
        punchedIn: false,
        punchedOut: false,
        totalSeconds: 0,
      });
    }

    // 3️⃣ Find today's record
    const todayRecord = attendanceDoc.records.find((r) =>
      moment(r.date).isSame(today, "day")
    );

    if (!todayRecord) {
      return res.status(200).json({
        success: true,
        punchedIn: false,
        punchedOut: false,
        totalSeconds: 0,
      });
    }

    const punchIn = todayRecord.punchIn;
    const punchOut = todayRecord.punchOut;

    // 4️⃣ No punchIn → treat as no record
    if (!punchIn) {
      return res.status(200).json({
        success: true,
        punchedIn: false,
        punchedOut: false,
        totalSeconds: 0,
      });
    }

    // 5️⃣ Punch in but no punch out → live timer
    if (punchIn && !punchOut) {
      const liveSeconds = Math.floor(
        (Date.now() - new Date(punchIn).getTime()) / 1000
      );

      return res.status(200).json({
        success: true,
        punchedIn: true,
        punchedOut: false,
        punchInTime: punchIn,
        totalSeconds: liveSeconds,
      });
    }

    // 6️⃣ Punch in + punch out → use saved totalHours
    return res.status(200).json({
      success: true,
      punchedIn: true,
      punchedOut: true,
      punchInTime: punchIn,
      punchOutTime: punchOut,
      totalSeconds: todayRecord.totalHours || 0,
    });
  } catch (err) {
    console.error("Error in getTodayAttendanceStatus:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching today's attendance",
      error: err.message,
    });
  }
};

// export const getMonthlyAttendanceForAdmin = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({
//         success: false,
//         message: "Only admins can view monthly attendance.",
//       });
//     }

//     let { month, year } = req.query;

//     if (!month || !year) {
//       return res.status(400).json({
//         success: false,
//         message: "Month and year are required. Example: ?month=9&year=2024",
//       });
//     }

//     month = Number(month) - 1;
//     year = Number(year);

//     const startOfMonth = moment.tz({ year, month, day: 1 }, "Asia/Kolkata");
//     const endOfMonth = startOfMonth.clone().endOf("month");
//     const totalDays = endOfMonth.date();

//     const users = await User.find({
//       isActive: true,
//       role: { $ne: "admin" },
//     }).lean();

//     const attendanceDocs = await Attendance.find({
//       userId: { $in: users.map(u => u._id) },
//     }).lean();

//     const attendanceMap = new Map();
//     attendanceDocs.forEach(doc => {
//       attendanceMap.set(String(doc.userId), doc.records || []);
//     });

//     const holidayCache = new Map();
//     for (let d = 1; d <= totalDays; d++) {
//       const date = moment.tz({ year, month, day: d }, "Asia/Kolkata");
//       holidayCache.set(
//         date.format("YYYY-MM-DD"),
//         await isNonWorkingDay(date.toDate())
//       );
//     }

//     const WORK_SECONDS = 8 * 3600;
//     const result = [];

//     // ---------- PASS 1: build normal response ----------
//     for (let d = 1; d <= totalDays; d++) {
//       const date = moment.tz({ year, month, day: d }, "Asia/Kolkata");
//       const dateKey = date.format("YYYY-MM-DD");
//       const isHoliday = holidayCache.get(dateKey);

//       const row = {
//         date: dateKey,
//         day: date.format("dddd"),
//         isHoliday,
//         users: [],
//       };

//       for (const u of users) {
//         const records = attendanceMap.get(String(u._id)) || [];
//         const record = records.find(r =>
//           moment(r.date).isSame(date, "day")
//         );

//         if (isHoliday) {
//           row.users.push({
//             userId: u._id,
//             name: u.name,
//             lop: u.leaveInfo?.extraLOP,
//             punchIn: "",
//             punchOut: "",
//             totalHours: 0,
//             status: "Holiday",
//             onTime: null,
//           });
//           continue;
//         }

//         if (record?.punchIn) {
//           const punchIn = moment(record.punchIn).tz("Asia/Kolkata");
//           const punchOut = record.punchOut
//             ? moment(record.punchOut).tz("Asia/Kolkata")
//             : "";

//           const totalSec = record.totalHours || 0;

//           let status = "Absent";
//           if (totalSec > 0) {
//             const percent = (totalSec / WORK_SECONDS) * 100;
//             if (percent < 40) status = "Absent";
//             else if (percent < 81.25) status = "Half Day";
//             else status = "Present";
//           }

//           const mins = punchIn.hours() * 60 + punchIn.minutes();

//           row.users.push({
//             userId: u._id,
//             name: u.name,
//             lop: u.leaveInfo?.extraLOP,
//             leaveBalance: u.leaveInfo?.balance,
//             punchIn: punchIn.toDate(),
//             punchOut: punchOut ? punchOut.toDate() : "",
//             totalHours: totalSec,
//             status,
//             onTime: mins <= 600,
//           });
//         } else {
//           row.users.push({
//             userId: u._id,
//             name: u.name,
//             lop: u.leaveInfo?.extraLOP,
//             leaveBalance: u.leaveInfo?.balance,
//             punchIn: "",
//             punchOut: "",
//             totalHours: 0,
//             status: "Absent",
//             onTime: null,
//           });
//         }
//       }

//       result.push(row);
//     }

//     // ---------- PASS 2: sandwich rule (NO RESPONSE CHANGE) ----------
//     for (let d = 0; d < result.length; d++) {
//       if (!result[d].isHoliday) continue;

//       let prev = d - 1;
//       while (prev >= 0 && result[prev].isHoliday) prev--;

//       let next = d + 1;
//       while (next < result.length && result[next].isHoliday) next++;

//       if (prev < 0 || next >= result.length) continue;

//       for (let u = 0; u < result[d].users.length; u++) {
//         if (
//           result[prev].users[u].status === "Absent" &&
//           result[next].users[u].status === "Absent"
//         ) {
//           // Only change status value, nothing else
//           result[d].users[u].status = "Absent";
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       month: month + 1,
//       year,
//       totalDays,
//       data: result,
//     });

//   } catch (err) {
//     console.error("Error in getMonthlyAttendanceForAdmin:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching monthly attendance.",
//       error: err.message,
//     });
//   }
// };

export const getMonthlyAttendanceForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view monthly attendance.",
      });
    }

    let { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required. Example: ?month=9&year=2024",
      });
    }

    const requestedMonth = Number(month); // 1-based — keep for history lookup & "is current month" check
    year = Number(year);
    month = requestedMonth - 1; // 0-based — used for date math below (unchanged)

    const startOfMonth = moment.tz({ year, month, day: 1 }, "Asia/Kolkata");
    const endOfMonth = startOfMonth.clone().endOf("month");
    const totalDays = endOfMonth.date();

    const users = await User.find({
      isActive: true,
      role: { $ne: "admin" },
    }).lean();

    const attendanceDocs = await Attendance.find({
      userId: { $in: users.map(u => u._id) },
    }).lean();

    const attendanceMap = new Map();
    attendanceDocs.forEach(doc => {
      attendanceMap.set(String(doc.userId), doc.records || []);
    });

    // ---------- LEAVE BALANCE HISTORY LOOKUP FOR REQUESTED MONTH ----------
    const leaveHistoryDocs = await LeaveBalanceHistory.find({
      userId: { $in: users.map(u => u._id) },
      month: requestedMonth,
      year,
    }).lean();

    const leaveHistoryMap = new Map();
    leaveHistoryDocs.forEach(h => {
      leaveHistoryMap.set(String(h.userId), h);
    });

    // Is the requested month/year the current real-world month/year?
    const nowIST = moment.tz("Asia/Kolkata");
    const isCurrentMonth =
      requestedMonth === nowIST.month() + 1 && year === nowIST.year();

    const currentMonth = nowIST.month() + 1;
    const currentYear = nowIST.year();

    const previousMonth =
      currentMonth === 1 ? 12 : currentMonth - 1;

    const previousMonthYear =
      currentMonth === 1 ? currentYear - 1 : currentYear;

    const getLeaveFigures = (u) => {
      const history = leaveHistoryMap.get(String(u._id));

      // ---------------- CURRENT MONTH ----------------
      if (
        requestedMonth === currentMonth &&
        year === currentYear
      ) {
        return {
          balance: u.leaveInfo?.balance ?? "-",
          extraLOP: "-", // Current month's LOP isn't finalized yet
        };
      }

      // ---------------- PREVIOUS MONTH ----------------
      if (
        requestedMonth === previousMonth &&
        year === previousMonthYear
      ) {
        return {
          balance: history
            ? history.closingBalance
            : "-",
          extraLOP: history
            ? history.extraLOP
            : (u.leaveInfo?.extraLOP ?? "-"),
        };
      }

      // ---------------- OLDER MONTHS ----------------
      if (history) {
        return {
          balance: history.closingBalance,
          extraLOP: history.extraLOP,
        };
      }

      return {
        balance: "-",
        extraLOP: "-",
      };
    };

    // Normalize each user's joining date to start-of-day in IST, once.
    const joiningDateMap = new Map();
    users.forEach(u => {
      joiningDateMap.set(
        String(u._id),
        u.joiningDate
          ? moment.tz(u.joiningDate, "Asia/Kolkata").startOf("day")
          : null
      );
    });

    const holidayCache = new Map();
    for (let d = 1; d <= totalDays; d++) {
      const date = moment.tz({ year, month, day: d }, "Asia/Kolkata");
      holidayCache.set(
        date.format("YYYY-MM-DD"),
        await isNonWorkingDay(date.toDate())
      );
    }

    const WORK_SECONDS = 8 * 3600;
    const result = [];

    // ---------- PASS 1: build normal response ----------
    for (let d = 1; d <= totalDays; d++) {
      const date = moment.tz({ year, month, day: d }, "Asia/Kolkata");
      const dateKey = date.format("YYYY-MM-DD");
      const isHoliday = holidayCache.get(dateKey);

      const row = {
        date: dateKey,
        day: date.format("dddd"),
        isHoliday,
        users: [],
      };

      for (const u of users) {
        const records = attendanceMap.get(String(u._id)) || [];
        const record = records.find(r =>
          moment(r.date).isSame(date, "day")
        );

        const { balance, extraLOP } = getLeaveFigures(u);

        // ── Not joined yet — takes priority over holiday/attendance ──
        const joiningDate = joiningDateMap.get(String(u._id));
        if (joiningDate && date.isBefore(joiningDate, "day")) {
          row.users.push({
            userId: u._id,
            name: u.name,
            lop: extraLOP,
            leaveBalance: balance,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: "Not Joined",
            onTime: null,
          });
          continue;
        }

        if (isHoliday) {
          row.users.push({
            userId: u._id,
            name: u.name,
            lop: extraLOP,
            leaveBalance: balance,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: "Holiday",
            onTime: null,
          });
          continue;
        }

        if (record?.punchIn) {
          const punchIn = moment(record.punchIn).tz("Asia/Kolkata");
          const punchOut = record.punchOut
            ? moment(record.punchOut).tz("Asia/Kolkata")
            : "";

          const totalSec = record.totalHours || 0;

          let status = "Absent";
          if (totalSec > 0) {
            const percent = (totalSec / WORK_SECONDS) * 100;
            if (percent < 40) status = "Absent";
            else if (percent < 81.25) status = "Half Day";
            else status = "Present";
          }

          const mins = punchIn.hours() * 60 + punchIn.minutes();

          row.users.push({
            userId: u._id,
            name: u.name,
            lop: extraLOP,
            leaveBalance: balance,
            punchIn: punchIn.toDate(),
            punchOut: punchOut ? punchOut.toDate() : "",
            totalHours: totalSec,
            status,
            onTime: mins <= 600,
          });
        } else {
          row.users.push({
            userId: u._id,
            name: u.name,
            lop: extraLOP,
            leaveBalance: balance,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: "Absent",
            onTime: null,
          });
        }
      }

      result.push(row);
    }

    // ---------- PASS 2: sandwich rule (NO RESPONSE CHANGE) ----------
    for (let d = 0; d < result.length; d++) {
      if (!result[d].isHoliday) continue;

      let prev = d - 1;
      while (prev >= 0 && result[prev].isHoliday) prev--;

      let next = d + 1;
      while (next < result.length && result[next].isHoliday) next++;

      if (prev < 0 || next >= result.length) continue;

      for (let u = 0; u < result[d].users.length; u++) {
        if (
          result[prev].users[u].status === "Absent" &&
          result[next].users[u].status === "Absent"
        ) {
          result[d].users[u].status = "Absent";
        }
      }
    }

    return res.status(200).json({
      success: true,
      month: month + 1,
      year,
      totalDays,
      data: result,
    });

  } catch (err) {
    console.error("Error in getMonthlyAttendanceForAdmin:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly attendance.",
      error: err.message,
    });
  }
};

// ----------------------------------Regularization API's-------------------------------------
export const createRegularization = async (req, res) => {
  try {
    const {
      attendanceDate,
      requestedPunchIn,
      requestedPunchOut,
      requestType,
      reason,
      userId,
    } = req.body;

    const employeeId =
      req.user.role === "admin"
        ? userId
        : req.user._id;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "User is required.",
      });
    }

    if (
      !attendanceDate ||
      !requestedPunchIn ||
      !requestedPunchOut ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    const attendanceMoment = moment(attendanceDate)
      .utcOffset("+05:30")
      .startOf("day");

    if (attendanceMoment.isAfter(moment().utcOffset("+05:30"), "day")) {
      return res.status(400).json({
        success: false,
        message: "Future attendance cannot be regularized.",
      });
    }

    const punchIn = moment(requestedPunchIn);
    const punchOut = moment(requestedPunchOut);

    if (!punchIn.isValid() || !punchOut.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid punch timings.",
      });
    }

    if (punchOut.isSameOrBefore(punchIn)) {
      return res.status(400).json({
        success: false,
        message: "Punch-out must be after punch-in.",
      });
    }

    const attendanceDateString = attendanceMoment.format("YYYY-MM-DD");

    if (
      punchIn.utcOffset("+05:30").format("YYYY-MM-DD") !== attendanceDateString
    ) {
      return res.status(400).json({
        success: false,
        message: "Punch-in date must match attendance date.",
      });
    }

    if (
      punchOut.utcOffset("+05:30").format("YYYY-MM-DD") !== attendanceDateString
    ) {
      return res.status(400).json({
        success: false,
        message: "Punch-out date must match attendance date.",
      });
    }

    const pendingRequest = await Regularization.findOne({
      userId: employeeId,
      attendanceDate: attendanceMoment.toDate(),
      status: "Pending",
    });

    if (pendingRequest) {
      return res.status(409).json({
        success: false,
        message:
          "A regularization request is already pending for this date.",
      });
    }

    let attendanceId = null;
    let attendanceRecordId = null;
    let currentPunchIn = null;
    let currentPunchOut = null;

    const attendance = await Attendance.findOne({
      userId: employeeId,
    });

    if (attendance) {
      attendanceId = attendance._id;

      const record = attendance.records.find((r) =>
        moment(r.date)
          .utcOffset("+05:30")
          .isSame(attendanceMoment, "day")
      );

      if (record) {
        attendanceRecordId = record._id;
        currentPunchIn = record.punchIn;
        currentPunchOut = record.punchOut;
      }
    }

    const regularization = await Regularization.create({
      attendanceId,
      attendanceRecordId,
      userId: employeeId,
      attendanceDate: attendanceMoment.toDate(),
      currentPunchIn,
      currentPunchOut,
      requestedPunchIn,
      requestedPunchOut,
      requestType,
      reason,
    });

    // attempt to send notification to admins (do not block success response)
    try {
      MailService.sendRegularizationNotification(regularization).catch((e) =>
        console.error("Mailer error:", e)
      );
      MailService.sendRegularizationSelfNotification(regularization).catch((e) =>
        console.error("Mailer error:", e)
      );
    } catch (e) {
      console.error("Failed to queue mail:", e);
    }

    return res.status(201).json({
      success: true,
      message: "Regularization request submitted successfully.",
      data: regularization,
    });
  } catch (err) {
    console.error("Create Regularization Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while creating regularization.",
      error: err.message,
    });
  }
};

export const updateRegularization = async (req, res) => {
  try {
    const { regularizationId } = req.params;

    const {
      attendanceDate,
      requestedPunchIn,
      requestedPunchOut,
      requestType,
      reason,
    } = req.body;

    const regularization = await Regularization.findById(regularizationId);

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: "Regularization request not found.",
      });
    }

    // Only owner or admin can update
    if (
      req.user.role !== "admin" &&
      regularization.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this request.",
      });
    }

    // Cannot update once processed
    if (regularization.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${regularization.status.toLowerCase()}.`,
      });
    }

    if (
      !attendanceDate ||
      !requestedPunchIn ||
      !requestedPunchOut ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory.",
      });
    }

    const attendanceMoment = moment(attendanceDate)
      .utcOffset("+05:30")
      .startOf("day");

    if (attendanceMoment.isAfter(moment().utcOffset("+05:30"), "day")) {
      return res.status(400).json({
        success: false,
        message: "Future attendance cannot be regularized.",
      });
    }

    const punchIn = moment(requestedPunchIn);
    const punchOut = moment(requestedPunchOut);

    if (!punchIn.isValid() || !punchOut.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid punch timings.",
      });
    }

    if (!punchOut.isAfter(punchIn)) {
      return res.status(400).json({
        success: false,
        message: "Punch-out must be greater than punch-in.",
      });
    }

    const attendanceDateString = attendanceMoment.format("YYYY-MM-DD");

    if (
      punchIn.utcOffset("+05:30").format("YYYY-MM-DD") !==
      attendanceDateString
    ) {
      return res.status(400).json({
        success: false,
        message: "Punch-in date must match attendance date.",
      });
    }

    if (
      punchOut.utcOffset("+05:30").format("YYYY-MM-DD") !==
      attendanceDateString
    ) {
      return res.status(400).json({
        success: false,
        message: "Punch-out date must match attendance date.",
      });
    }

    // Prevent duplicate pending request on another date
    const duplicate = await Regularization.findOne({
      _id: { $ne: regularizationId },
      userId: regularization.userId,
      attendanceDate: attendanceMoment.toDate(),
      status: "Pending",
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A pending regularization request already exists for this date.",
      });
    }

    // Refresh attendance snapshot
    let attendanceId = null;
    let attendanceRecordId = null;
    let currentPunchIn = null;
    let currentPunchOut = null;

    const attendance = await Attendance.findOne({
      userId: regularization.userId,
    });

    if (attendance) {
      attendanceId = attendance._id;

      const record = attendance.records.find((r) =>
        moment(r.date)
          .utcOffset("+05:30")
          .isSame(attendanceMoment, "day")
      );

      if (record) {
        attendanceRecordId = record._id;
        currentPunchIn = record.punchIn;
        currentPunchOut = record.punchOut;
      }
    }

    regularization.attendanceId = attendanceId;
    regularization.attendanceRecordId = attendanceRecordId;

    regularization.attendanceDate = attendanceMoment.toDate();

    regularization.currentPunchIn = currentPunchIn;
    regularization.currentPunchOut = currentPunchOut;

    regularization.requestedPunchIn = requestedPunchIn;
    regularization.requestedPunchOut = requestedPunchOut;

    regularization.requestType = requestType;
    regularization.reason = reason;

    await regularization.save();

    return res.status(200).json({
      success: true,
      message: "Regularization updated successfully.",
      data: regularization,
    });
  } catch (err) {
    console.error("Update Regularization Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while updating regularization.",
      error: err.message,
    });
  }
};

export const updateRegularizationByAdmin = async (req, res) => {

  const isAdminOrHr = ["admin", "hr"].includes(req.user.role);

  if (!isAdminOrHr) {
    return res.status(403).json({
      success: false,
      message: "Only Admins and HR can review regularization requests.",
    });
  }

  const { regularizationId } = req.params;
  const { status, reviewComment } = req.body;

  if (!mongoose.isValidObjectId(regularizationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid regularization ID.",
    });
  }

  const allowedStatuses = ["Approved", "Rejected"];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status is required and must be one of: ${allowedStatuses.join(
        ", "
      )}`,
    });
  }

  try {
    const regularization = await Regularization.findById(regularizationId);

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: "Regularization request not found.",
      });
    }

    if (regularization.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${regularization.status.toLowerCase()}.`,
      });
    }

    // ==========================================================
    // REJECTED — no attendance changes, simple status update
    // ==========================================================
    if (status === "Rejected") {
      regularization.status = "Rejected";
      regularization.reviewedBy = req.user._id;
      regularization.reviewedAt = new Date();
      if (reviewComment !== undefined) {
        regularization.reviewComment = reviewComment;
      }

      await regularization.save();

      return res.status(200).json({
        success: true,
        message: "Regularization request rejected successfully.",
        data: regularization,
      });
    }

    // ==========================================================
    // APPROVED — apply requested punch times to Attendance,
    // then close out the regularization.
    //
    // No transaction (standalone MongoDB, not a replica set), so
    // writes are ordered deliberately: Attendance first, then
    // Regularization. If the Attendance write fails, nothing has
    // changed. If it succeeds but the Regularization save fails,
    // attendance is already correct — only the status label is
    // stale, which is safe and recoverable by retrying.
    // ==========================================================

    const targetDate = moment(regularization.attendanceDate)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();

    const targetDateStr = moment(targetDate)
      .utcOffset("+05:30")
      .format("YYYY-MM-DD");

    // Same safety check updateAttendance performs — guards against
    // stale/bad data ever reaching this point, even though
    // createRegularization/updateRegularization already enforce this
    // at submission time.
    const pinDateStr = moment(regularization.requestedPunchIn)
      .utcOffset("+05:30")
      .format("YYYY-MM-DD");
    const poutDateStr = moment(regularization.requestedPunchOut)
      .utcOffset("+05:30")
      .format("YYYY-MM-DD");

    if (pinDateStr !== targetDateStr || poutDateStr !== targetDateStr) {
      return res.status(400).json({
        success: false,
        message:
          "Requested punch times do not match the attendance date on this request. Please contact support.",
      });
    }

    if (
      new Date(regularization.requestedPunchOut) <=
      new Date(regularization.requestedPunchIn)
    ) {
      return res.status(400).json({
        success: false,
        message: "Requested punch-out must be after punch-in.",
      });
    }

    let attendanceDoc = await Attendance.findOne({
      userId: regularization.userId,
    });

    if (!attendanceDoc) {
      attendanceDoc = new Attendance({
        userId: regularization.userId,
        records: [],
        monthlySummary: [],
      });
    }

    let record = attendanceDoc.records.find((r) =>
      moment(r.date).isSame(targetDate, "day")
    );

    const newPunchIn = new Date(regularization.requestedPunchIn);
    const newPunchOut = new Date(regularization.requestedPunchOut);
    const newTotalHours = Math.floor((newPunchOut - newPunchIn) / 1000);

    if (!record) {
      record = {
        date: targetDate,
        punchIn: newPunchIn,
        punchOut: newPunchOut,
        totalHours: newTotalHours,
      };
      attendanceDoc.records.push(record);
    } else {
      record.punchIn = newPunchIn;
      record.punchOut = newPunchOut;
      record.totalHours = newTotalHours;
    }

    updateMonthlySummary(attendanceDoc, targetDate);

    await attendanceDoc.save();

    // Attendance write succeeded — now close out the regularization.
    regularization.status = "Approved";
    regularization.reviewedBy = req.user._id;
    regularization.reviewedAt = new Date();
    regularization.attendanceId = attendanceDoc._id;
    if (reviewComment !== undefined) {
      regularization.reviewComment = reviewComment;
    }

    try {
      await regularization.save();
    } catch (saveErr) {
      // Attendance is already correct at this point — only the status
      // label failed to persist. Surface this distinctly so the
      // frontend/admin knows attendance is fine but status is stale
      // and a retry of this same request is safe.
      console.error(
        `Attendance updated for regularization ${regularizationId}, but marking it Approved failed:`,
        saveErr
      );
      return res.status(207).json({
        success: false,
        partial: true,
        message:
          "Attendance was updated successfully, but the request status could not be updated. Please retry.",
        error: saveErr.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Regularization request approved successfully.",
      data: regularization,
    });
  } catch (err) {
    console.error("Update Regularization By Admin Error:", err);

    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while reviewing regularization request.",
      error: err.message,
    });
  }
};

export const getAllRegularization = async (req, res) => {
  try {
    const {
      status,
      requestType,
      userId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const role = req.user.role;
    const isAdminOrHR = role === "admin" || role === "hr";

    // This endpoint is for reviewers only — employees viewing their own
    // requests should hit a separate "my regularizations" route instead.
    if (!isAdminOrHR) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view regularization requests.",
      });
    }

    const ownId = new mongoose.Types.ObjectId(req.user._id);
    const match = {};

    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId.",
        });
      }
      // Combine the requested filter with the self-exclusion rule —
      // if a reviewer explicitly asks for their own userId, $eq and $ne
      // cancel each other out and correctly return nothing.
      match.userId = { $eq: new mongoose.Types.ObjectId(userId), $ne: ownId };
    } else {
      // Never surface a reviewer's own regularization requests to them here
      match.userId = { $ne: ownId };
    }

    if (status) {
      const allowedStatuses = ["Pending", "Approved", "Rejected"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${allowedStatuses.join(", ")}`,
        });
      }
      match.status = status;
    }

    if (requestType) {
      match.requestType = requestType;
    }

    if (startDate || endDate) {
      match.attendanceDate = {};
      if (startDate) {
        const s = moment(startDate).utcOffset("+05:30").startOf("day");
        if (!s.isValid()) {
          return res.status(400).json({
            success: false,
            message: "Invalid startDate.",
          });
        }
        match.attendanceDate.$gte = s.toDate();
      }
      if (endDate) {
        const e = moment(endDate).utcOffset("+05:30").endOf("day");
        if (!e.isValid()) {
          return res.status(400).json({
            success: false,
            message: "Invalid endDate.",
          });
        }
        match.attendanceDate.$lte = e.toDate();
      }
      if (
        match.attendanceDate.$gte &&
        match.attendanceDate.$lte &&
        match.attendanceDate.$gte > match.attendanceDate.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate.",
        });
      }
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100); // cap page size
    const skip = (pageNum - 1) * limitNum;

    // Base pipeline: filters that don't need the joined user doc
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users", // adjust if your User collection name differs
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
    ];

    // Free-text search across employee name/email, request type, and reason.
    // Done after $lookup so we can search the joined employee fields too —
    // this is why we can't just use find().populate() here.
    if (search && String(search).trim()) {
      const re = new RegExp(escapeRegex(String(search).trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { requestType: re },
            { reason: re },
            { "userId.name": re },
            { "userId.email": re },
          ],
        },
      });
    }

    pipeline.push({
      $project: {
        attendanceId: 1,
        attendanceRecordId: 1,
        userId: {
          _id: "$userId._id",
          name: "$userId.name",
          email: "$userId.email",
          employeeId: "$userId.employeeId",
        },
        attendanceDate: 1,
        currentPunchIn: 1,
        currentPunchOut: 1,
        requestedPunchIn: 1,
        requestedPunchOut: 1,
        requestType: 1,
        reason: 1,
        status: 1,
        reviewedBy: 1,
        reviewComment: 1,
        reviewedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const [result] = await Regularization.aggregate(pipeline);

    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(Math.ceil(total / limitNum), 1),
      },
    });
  } catch (err) {
    console.error("Get All Regularization Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching regularization requests.",
      error: err.message,
    });
  }
};

export const getRegularizationById = async (req, res) => {
  try {
    const { regularizationId } = req.params;

    if (!mongoose.isValidObjectId(regularizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid regularization ID.",
      });
    }

    const regularization = await Regularization.findById(regularizationId)
      .populate("userId", "name email employeeId")
      .lean();

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: "Regularization request not found.",
      });
    }

    const isOwner =
      regularization.userId?._id?.toString() === req.user._id.toString() ||
      regularization.userId?.toString() === req.user._id.toString();

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this request.",
      });
    }

    return res.status(200).json({
      success: true,
      data: regularization,
    });
  } catch (err) {
    console.error("Get Regularization By Id Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching regularization request.",
      error: err.message,
    });
  }
};
