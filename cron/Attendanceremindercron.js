import cron from "node-cron";
import moment from "moment";
import User from "../models/Users.js";
import Notification from "../models/Notification.js";

/* ------------------------------------------------------------------ */
/*  ATTENDANCE CHECK REMINDER                                         */
/*  Creates ONE broadcast-style notification per month, on the 26th,  */
/*  visible from the 26th through the 29th (via dateFrom/dateTo),     */
/*  reminding employees to review their own attendance before close.  */
/*                                                                      */
/*  userId is set to the ADMIN's id (the issuer/owner of the           */
/*  notification), per your schema — there's no per-employee field,    */
/*  so this is a single broadcast doc rather than one row per employee.*/
/* ------------------------------------------------------------------ */

async function createAttendanceCheckNotification(triggerSource = "scheduled") {
    const now = moment().utcOffset("+05:30");
    console.log(
        `\nAttendance reminder cron started (${triggerSource}) at ${now.format(
            "DD MMM YYYY HH:mm"
        )}`
    );

    const admin = await User.findOne({
        role: { $regex: /^admin$/i },
    }).lean();
    if (!admin) {
        console.error("No admin user found — skipping attendance reminder notification");
        return;
    }

    const dateFrom = now.clone().startOf("day").toDate(); // 26th 00:00
    const dateTo = now.clone().date(29).endOf("day").toDate(); // 29th 23:59, same month

    // avoid creating a duplicate for the same month if the server restarts
    // during the 26th-29th window
    const existing = await Notification.findOne({
        active: true,
        dateFrom: {
            $gte: now.clone().startOf("month").toDate(),
            $lte: now.clone().endOf("month").toDate(),
        },
    }).lean();

    if (existing) {
        console.log("Attendance reminder notification already exists for this month");
        return;
    }

    await Notification.create({
        userId: admin._id,
        title: "Attendance Check Reminder",
        body: "Please review your attendance for this month before payroll processing. If you notice any missing punches or discrepancies, contact HR before the 29th.",
        color: "#FF0000",
        dateFrom,
        dateTo,
        active: true,
    });

    console.log("Attendance reminder notification created");
}


console.log("📅 Attendance Reminder Cron Registered");
console.log("⏰ Schedule : 09:00 AM IST on the 26th of every month");

/* ---------- SCHEDULE: 9:00 AM IST on the 26th of each month ---------- */
cron.schedule(
    "0 9 26 * *",
    async () => {
        await createAttendanceCheckNotification("scheduled");
    },
    { timezone: "Asia/Kolkata" }
);

/* ---------- AUTO-RECOVERY: catch up if server was down on the 26th ---------- */
(async () => {
    const now = moment().utcOffset("+05:30");
    const day = now.date();

    if (day < 26 || day > 29) return;

    const admin = await User.findOne({
        role: { $regex: /^admin$/i },
    }).lean();
    if (!admin) return;

    const existing = await Notification.findOne({
        active: true,
        dateFrom: {
            $gte: now.clone().startOf("month").toDate(),
            $lte: now.clone().endOf("month").toDate(),
        },
    }).lean();

    if (!existing) {
        await createAttendanceCheckNotification("catch-up");
    } else {
        console.log("Attendance reminder already created this month");
    }
})();

export default createAttendanceCheckNotification;