import moment from "moment";
import CalendarDay from "../models/Calendar.js";

export const addOrUpdateCalendarMonth = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const { month, year, nonWorkingDays } = req.body;

    if (!month || !year || !Array.isArray(nonWorkingDays)) {
      return res.status(400).json({
        success: false,
        message: "month, year and nonWorkingDays[] are required",
      });
    }

    // ✅ Ensure data format is correct [{day, reason}]
    const cleanedDays = nonWorkingDays
      .filter((d) => d && typeof d.day === "number") // keep valid ones
      .map((d) => ({
        day: d.day,
        reason: d.reason?.trim() || null,
      }));

    const entry = await CalendarDay.findOneAndUpdate(
      { month, year },
      { month, year, nonWorkingDays: cleanedDays },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Calendar month saved successfully",
      data: entry,
    });
  } catch (err) {
    console.error("Error saving calendar month:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Get calendar records
 * Query examples:
 * /api/calendar?year=2025
 * /api/calendar?year=2025&month=1
 */
export const getCalendarMonths = async (req, res) => {
  try {
    const { year, month } = req.query;

    const query = {};
    if (year) query.year = year;
    if (month) query.month = month;

    const entries = await CalendarDay.find(query).sort({ year: 1, month: 1 });

    res.status(200).json({
      success: true,
      message: "Calendar months fetched successfully",
      data: entries,
    });
  } catch (err) {
    console.error("Error fetching calendar months:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Delete month record
 */
export const deleteCalendarMonth = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const { id } = req.params;
    const deleted = await CalendarDay.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Month not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Calendar month deleted",
    });
  } catch (err) {
    console.error("Error deleting calendar month:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Auto-generate weekends for full year
 * Creates 12 records, one per month
 */
export const autoGenerateWeekends = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const { year, reason = "Weekend" } = req.body;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    const result = [];

    for (let month = 1; month <= 12; month++) {
      const start = moment(`${year}-${month}-01`);
      const end = moment(start).endOf("month");

      const nonWorkingDays = [];
      while (start.isSameOrBefore(end)) {
        const dayOfWeek = start.day(); // 0 = Sun, 6 = Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          nonWorkingDays.push({
            day: start.date(),
            reason: `${reason} (${dayOfWeek === 0 ? "Sunday" : "Saturday"})`,
          });
        }
        start.add(1, "day");
      }

      result.push({ month, year, nonWorkingDays });
    }

    // Cleanup old data
    await CalendarDay.deleteMany({ year });

    // Insert new weekend configs
    await CalendarDay.insertMany(result);

    res.status(201).json({
      success: true,
      message: `Weekends generated for year ${year}`,
      monthsCreated: result.length,
    });
  } catch (err) {
    console.error("Error generating weekends:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
