// models/LeaveBalance.js
import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },


    carryForward: { type: Number, default: 0 }, // e.g. 2.5

    extraUsed: { type: Number, default: 0 }, // can be fractional (0.5)
  },
  { timestamps: true }
);

export default mongoose.model("LeaveBalance", leaveBalanceSchema);
