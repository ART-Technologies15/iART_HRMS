import moment from "moment";
export const updateMonthlySummary = (attendanceDoc, date) => {
    const m = moment(date).utcOffset("+05:30");
    const month = m.month() + 1; // 1-12
    const year = m.year();
  
    // Sum all totalHours from records matching same month & year
    const totalSeconds = attendanceDoc.records
      .filter(r =>
        moment(r.date).utcOffset("+05:30").month() + 1 === month &&
        moment(r.date).utcOffset("+05:30").year() === year
      )
      .reduce((sum, r) => sum + (r.totalHours || 0), 0);
  
    // Find existing summary entry
    const summary = attendanceDoc.monthlySummary.find(
      s => s.month === month && s.year === year
    );
  
    if (summary) {
      summary.totalHours = totalSeconds;
    } else {
      attendanceDoc.monthlySummary.push({
        month,
        year,
        totalHours: totalSeconds,
      });
    }
  };
  