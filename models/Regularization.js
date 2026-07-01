const regularizationSchema = new mongoose.Schema({
    attendanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attendance",
        default: null,
    },

    attendanceRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    attendanceDate: {
        type: Date,
        required: true,
    },

    currentPunchIn: Date,
    currentPunchOut: Date,

    requestedPunchIn: Date,
    requestedPunchOut: Date,

    reason: {
        type: String,
        required: true,
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    reviewComment: String,

    reviewedAt: Date,
},
    {
        timestamps: true
    });