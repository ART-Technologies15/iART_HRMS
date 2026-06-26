// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Daily attendance records
    records: [
      {
        date: { type: Date, required: true }, 
        punchIn: { type: Date, default: null },
        punchOut: { type: Date, default: null },
        totalHours: { type: Number, default: 0 }, 
      },
    ],

    monthlySummary: [
      {
        month: { type: Number, required: true },
        year: { type: Number, required: true }, 
        totalHours: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
