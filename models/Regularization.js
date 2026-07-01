import mongoose from "mongoose";

const regularizationSchema = new mongoose.Schema(
    {
        attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            default: null,
        },

        attendanceRecordId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            comment: "Attendance.records._id",
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        attendanceDate: {
            type: Date,
            required: true,
        },

        currentPunchIn: {
            type: Date,
            default: null,
        },

        currentPunchOut: {
            type: Date,
            default: null,
        },

        requestedPunchIn: {
            type: Date,
            required: true,
        },

        requestedPunchOut: {
            type: Date,
            required: true,
        },

        requestType: {
            type: String,
            enum: [
                "punch_correction",
                "missed_punch",
                "manual_attendance",
                "work_from_home",
            ],
            default: "punch_correction",
        },

        reason: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewComment: {
            type: String,
            trim: true,
            default: "",
        },

        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

regularizationSchema.index({
    userId: 1,
    attendanceDate: -1,
});

regularizationSchema.index(
    {
        userId: 1,
        attendanceDate: 1,
        status: 1,
    },
    {
        partialFilterExpression: {
            status: "Pending",
        },
    }
);

export default mongoose.model("Regularization", regularizationSchema);
