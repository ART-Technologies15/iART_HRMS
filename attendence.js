import mongoose from "mongoose";
import moment from "moment-timezone";
import User from "./models/Users.js";
import Attendance from "./models/Attendance.js";

// ===== UPDATE MONGO URI =====
const MONGO_URI = "mongodb://localhost:27017/attendacePortal";

const run = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected!");
    console.log("Connected DB:", mongoose.connection.name);


    const start = moment("2024-11-03").utcOffset("+05:30");
    const end   = moment("2024-11-07").utcOffset("+05:30");

    // Fetch all active, non-admin users
    const users = await User.find({
      isActive: true,
      role: { $ne: "admin" },
    }).lean();

    console.log(`Updating attendance for ${users.length} users...`);

    for (const u of users) {
      let attendance = await Attendance.findOne({ userId: u._id });

      // Create doc if missing
      if (!attendance) {
        attendance = await Attendance.create({
          userId: u._id,
          records: [],
          monthlySummary: [],
        });
      }

      const current = start.clone();

      while (current.isSameOrBefore(end, "day")) {
        const dateOnly = current.clone().startOf("day");

        const punchIn = dateOnly.clone().hour(10).minute(0).second(0);
        const punchOut = dateOnly.clone().hour(19).minute(30).second(0);

        const totalSeconds = Math.floor(
          moment.duration(punchOut.diff(punchIn)).asSeconds()
        );

        // Check if record exists
        const record = attendance.records.find((r) =>
          moment(r.date).isSame(dateOnly, "day")
        );

        if (!record) {
          attendance.records.push({
            date: dateOnly.toDate(),
            punchIn: punchIn.toDate(),
            punchOut: punchOut.toDate(),
            totalHours: totalSeconds,
          });
        } else {
          record.punchIn = punchIn.toDate();
          record.punchOut = punchOut.toDate();
          record.totalHours = totalSeconds;
        }

        current.add(1, "day");
      }

      await attendance.save();
      console.log(`Updated: ${u.name || u.email}`);
    }

    console.log("🎉 DONE: Attendance updated for all users (3 Nov - 7 Nov).");
    process.exit(0);

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
