import mongoose from "mongoose";

const cronLogSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lastRun: { type: Date, required: true },
});

export default mongoose.model("CronLog", cronLogSchema);
