import axios from "axios";
import mongoose from "mongoose";
import moment from "moment";
import User from "./models/Users.js";

const API_URL = "http://localhost:5000/api/attendance/update-attendance";
const MONGO_URI = "mongodb://localhost:27017/attendacePortal";
const TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDg1ZjcwNDQxOWU2ZTdhYzFkMzQxYSIsImlhdCI6MTc2NDY2NzQ4NSwiZXhwIjoxNzY0NzUzODg1fQ.x-Y3IIannoVOIbieCjgVM3drAsHxlHLJtDYaAokRxS4";

// Punch times in IST
const PUNCH_IN_IST = { hour: 10, minute: 0 };
const PUNCH_OUT_IST = { hour: 19, minute: 30 };

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected DB:", mongoose.connection.name);

    // Fetch all active users (exclude admin)
    const users = await User.find(
      { isActive: true, role: { $ne: "admin" } },
      "_id name"
    ).lean();

    console.log("Users:", users.length);

    // Loop through dates 3 Nov → 7 Nov
    for (let day = 3; day <= 7; day++) {
      const dateIST = moment(`2025-11-${String(day).padStart(2, "0")}`).utcOffset("+05:30");

      const dateStr = dateIST.format("YYYY-MM-DD");

      // Create punchIn/punchOut timestamps in IST
      const punchInIST = dateIST.clone().hour(PUNCH_IN_IST.hour).minute(PUNCH_IN_IST.minute);
      const punchOutIST = dateIST.clone().hour(PUNCH_OUT_IST.hour).minute(PUNCH_OUT_IST.minute);

      // Convert to UTC for API
      const punchInUTC = punchInIST.toDate().toISOString();
      const punchOutUTC = punchOutIST.toDate().toISOString();

      // Hit API for each user
      for (const u of users) {
        const payload = {
          userId: u._id,
          date: dateStr,
          punchIn: punchInUTC,
          punchOut: punchOutUTC,
        };

        try {
          const response = await axios.put(API_URL, payload, {
            headers: {
              Authorization: TOKEN,
            },
          });
          console.log(`✔ ${u.name} ${dateStr} → Updated`);
        } catch (err) {
          console.log(err);
          console.error(`❌ ${u.name} ${dateStr} → Failed`, err.response?.data || err.message);
        }
      }
    }

    console.log("🎉 DONE: All attendance updated via API.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
