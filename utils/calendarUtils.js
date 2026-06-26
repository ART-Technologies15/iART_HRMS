import Calendar from "../models/Calendar.js";
import moment from "moment-timezone";

export const isNonWorkingDay = async (date) => {
  const m = moment(date).tz("Asia/Kolkata");
  const year = m.year();
  const month = m.month() + 1;
  const day = m.date();

  const calendar = await Calendar.findOne({ month, year });


  if (calendar && Array.isArray(calendar.nonWorkingDays)) {
    const isHoliday = calendar.nonWorkingDays.some(
      d => Number(d.day) === day
    );
    if (isHoliday) return true;
  }

  // Weekend fallback
  const weekday = m.day(); // 0 = Sunday, 6 = Saturday
  if (weekday === 0 || weekday === 6) return true;

  return false;
};
