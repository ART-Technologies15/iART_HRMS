import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/dbConnect.js";
import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import mailRoutes from "./routes/mailRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import assestsRoutes from "./routes/assestsRoutes.js";
import cors from "cors";
import morgan from "morgan";

dotenv.config();
connectDB();

const app = express();
app.use(morgan("common"));
app.use(cors());
app.use(express.json());

import "./cron/leaveCalculator.js";
import "./cron/Attendanceremindercron.js";
// routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/assests", assestsRoutes);
app.get("/", (req, res) => res.send("Attendance Portal API is running"));

const PORT = process.env.PORT_KEY || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// export default app;
