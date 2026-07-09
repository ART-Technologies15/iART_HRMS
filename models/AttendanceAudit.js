import mongoose from "mongoose";

const attendanceAuditSchema = new mongoose.Schema(
    {
        attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            required: true,
            index: true,
        },

        attendanceRecordId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            comment: "Attendance.records._id",
        },

        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        updaterRole: {
            type: String,
            enum: ["admin", "hr"],
            required: true,
        },

        action: {
            type: String,
            enum: ["Created", "Updated", "Cleared"],
            required: true,
        },

        previousPunchIn: {
            type: Date,
            default: null,
        },

        previousPunchOut: {
            type: Date,
            default: null,
        },

        newPunchIn: {
            type: Date,
            default: null,
        },

        newPunchOut: {
            type: Date,
            default: null,
        },

        remarks: {
            type: String,
            trim: true,
            default: "",
        },

        ipAddress: {
            type: String,
            default: "",
        },

        userAgent: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Employee history
attendanceAuditSchema.index({
    employeeId: 1,
    createdAt: -1,
});

// Particular attendance record history
attendanceAuditSchema.index({
    attendanceRecordId: 1,
    createdAt: -1,
});

// Who made changes
attendanceAuditSchema.index({
    updatedBy: 1,
    createdAt: -1,
});

export default mongoose.model("AttendanceAudit", attendanceAuditSchema);