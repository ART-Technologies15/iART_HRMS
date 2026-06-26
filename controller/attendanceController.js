import Attendance from "../models/Attendance.js";
import moment from "moment-timezone";
import { isNonWorkingDay } from "../utils/calendarUtils.js";
import { updateMonthlySummary } from "../utils/updateMonthlySummary.js";
import Calendar from "../models/Calendar.js";
import User from "../models/Users.js";
import Leave from "../models/Leaves.js"; // import Leave model

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
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update attendance records.",
      });
    }

    const { userId, date, punchIn, punchOut } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "userId and date are required.",
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

const ONTIME_THRESHOLD_MINUTES = 10 * 60; // 10:00 AM / 600 mins

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

    // auth: admin or self
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this record.",
      });
    }

    const nowIST = moment().utcOffset("+05:30");
    const hasRange = startDate || endDate;

    let rangeStart, rangeEnd;

    if (hasRange) {
      rangeStart = startDate
        ? moment(startDate).utcOffset("+05:30").startOf("day")
        : moment().utcOffset("+05:30").startOf("month");

      rangeEnd = endDate
        ? moment(endDate).utcOffset("+05:30").endOf("day")
        : nowIST.clone().endOf("day");
    } else {
      month = month ? parseInt(month, 10) : nowIST.month() + 1;
      year = year ? parseInt(year, 10) : nowIST.year();

      const reqStart = moment({ year, month: month - 1 })
        .utcOffset("+05:30")
        .startOf("month");

      const reqEndFull = reqStart.clone().endOf("month");
      const todayIST = nowIST.clone().startOf("day");

      if (reqStart.isAfter(todayIST, "day")) return res.status(200).json([]);

      rangeStart = reqStart;
      rangeEnd = reqEndFull.isAfter(todayIST) ? todayIST : reqEndFull;
    }

    const days = listDays(rangeStart.toDate(), rangeEnd.toDate());

    // FETCH APPROVED LEAVES
    const approvedLeaves = await Leave.find({
      userId,
      status: "approved",
      "leaveDays.date": { $gte: rangeStart.toDate(), $lte: rangeEnd.toDate() },
    }).lean();

    const leaveSet = new Set();
    approvedLeaves.forEach((l) => {
      l.leaveDays.forEach((d) => {
        leaveSet.add(moment(d.date).utcOffset("+05:30").format("YYYY-MM-DD"));
      });
    });

    // FETCH HOLIDAYS
    const calendarDocs = await Calendar.find({
      year: { $in: [rangeStart.year(), rangeEnd.year()] },
      month: { $in: [rangeStart.month() + 1, rangeEnd.month() + 1] },
    }).lean();

    // Build map: "YYYY-MM-DD" → "Reason"
    const holidayMap = new Map();
    calendarDocs.forEach((cal) => {
      cal.nonWorkingDays.forEach((d) => {
        const dateKey = moment({
          year: cal.year,
          month: cal.month - 1,
          day: d.day,
        })
          .utcOffset("+05:30")
          .format("YYYY-MM-DD");
        holidayMap.set(dateKey, d.reason);
      });
    });

    //FETCH ATTENDANCE
    const attDoc = await Attendance.findOne({ userId }).lean();
    const recMap = new Map();
    if (attDoc?.records?.length) {
      attDoc.records.forEach((r) => {
        const key = moment(r.date).utcOffset("+05:30").format("YYYY-MM-DD");
        recMap.set(key, r);
      });
    }

    const todayKey = nowIST.format("YYYY-MM-DD");

    const data = days
      .map((d) => {
        const dayKey = moment(d).utcOffset("+05:30").format("YYYY-MM-DD");
        const dayNum = parseInt(moment(d).utcOffset("+05:30").format("D"), 10);

        const rec = recMap.get(dayKey);
        const hasAttendance = !!rec;

        // 1. HOLIDAY CHECK
        if (holidayMap.has(dayKey)) {
          return {
            date: dayKey,
            punchIn: "",
            punchOut: "",
            totalHours: 0,
            status: `Holiday (${holidayMap.get(dayKey)})`,
            onTime: null,
          };
        }

        // Determine total work time if attendance exists
        let totalSeconds = 0;
        let punchIn, punchOut;

        if (hasAttendance) {
          punchIn = rec.punchIn ? new Date(rec.punchIn) : null;
          punchOut = rec.punchOut ? new Date(rec.punchOut) : null;

          if (punchIn && punchOut) {
            totalSeconds =
              rec.totalHours || Math.floor((punchOut - punchIn) / 1000);
          } else if (punchIn && dayKey === todayKey) {
            totalSeconds = Math.max(
              0,
              moment().diff(moment(punchIn), "seconds")
            );
          }
        }

        const WORK_SECONDS = 8 * 3600;

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

        // 2. LEAVE CHECK
        if (leaveSet.has(dayKey)) {
          if (!hasAttendance) {
            return {
              date: dayKey,
              punchIn: "",
              punchOut: "",
              totalHours: 0,
              status: "On Leave",
              onTime: null,
            };
          }
          // Leave + Attendance = treat as Present
          return {
            date: dayKey,
            punchIn: rec.punchIn,
            punchOut: rec.punchOut,
            totalHours: totalSeconds,
            status: attendanceStatus,
            onTime: getOnTimeStatus(rec.punchIn),
          };
        }

        // 3. ATTENDANCE (NO LEAVE)
        if (hasAttendance) {
          return {
            date: dayKey,
            punchIn: rec.punchIn,
            punchOut: rec.punchOut,
            totalHours: totalSeconds,
            status: attendanceStatus,
            onTime: getOnTimeStatus(rec.punchIn),
          };
        }

        // 4. DEFAULT → ABSENT
        return {
          date: dayKey,
          punchIn: "",
          punchOut: "",
          totalHours: 0,
          status: "Absent",
          onTime: null,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(data);
  } catch (err) {
    console.error("Error in getAttendanceRecord:", err);
    res.status(500).json({
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

    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this data.",
      });
    }

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

    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this data.",
      });
    }

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

    const users = await User.find({ isActive: true }, "_id name email").lean();
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
        const punchOut = record.punchOut ? new Date(record.punchOut) : null;

        const totalSeconds = record.totalHours || 0;
        let status = "Absent";

        if (totalSeconds > 0) {
          const percent = (totalSeconds / WORK_SECONDS) * 100;

          if (percent < 40) status = "Absent";
          else if (percent < 81.25) status = "Half Day";
          else status = "Present";
        }

        const punchInIST = moment(punchIn).utcOffset("+05:30");
        const mins = punchInIST.hours() * 60 + punchInIST.minutes();
        const onTime = mins <= 600; // 10:00 AM IST cutoff

        return {
          userId: u._id,
          name: u.name,
          punchIn,
          punchOut,
          totalHours: totalSeconds,
          status,
          onTime,
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

    month = Number(month) - 1;
    year = Number(year);

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

        if (isHoliday) {
          row.users.push({
            userId: u._id,
            name: u.name,
            lop: u.leaveInfo?.extraLOP,
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
            lop: u.leaveInfo?.extraLOP,
            leaveBalance: u.leaveInfo?.balance,
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
            lop: u.leaveInfo?.extraLOP,
            leaveBalance: u.leaveInfo?.balance,
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
          // Only change status value, nothing else
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


