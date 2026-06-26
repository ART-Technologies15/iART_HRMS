// models/Leave.js
import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Array of leave days with full/half
    leaveDays: [
      {
        date: { type: Date, required: true }, // normalized 00:00 IST
        type: { type: String, enum: ["full", "half"], required: true }, // full = 1, half = 0.5
      },
    ],

    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

// helpful indexes
leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ "leaveDays.date": 1 });

export default mongoose.model("Leave", leaveSchema);

