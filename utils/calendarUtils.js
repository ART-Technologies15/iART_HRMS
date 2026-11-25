
import Calendar from "../models/Calendar.js";
import moment from "moment-timezone";

export const isNonWorkingDay = async (date) => {
  const m = moment(date).tz("Asia/Kolkata");

  const year = m.year();
  const month = m.month() + 1;
  const day = m.date();

  const calendar = await Calendar.findOne({ month, year, }).lean();

  if (!calendar || !Array.isArray(calendar.nonWorkingDays)) { return false; }

  const isHoliday = calendar.nonWorkingDays.some(
    (d) => Number(d.day) === day
  );

  return isHoliday;
};
