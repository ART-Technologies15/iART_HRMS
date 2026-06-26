import mongoose from "mongoose";

const nonWorkingDaySchema = new mongoose.Schema(
  {
    day: {
      type: Number, // 1 - 31
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const calendarSchema = new mongoose.Schema(
  {
    month: {
      type: Number, // 1 - 12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },

    nonWorkingDays: {
      type: [nonWorkingDaySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// prevent duplicate month/year
calendarSchema.index({ month: 1, year: 1 }, { unique: true });

export default mongoose.model("Calendar", calendarSchema);
