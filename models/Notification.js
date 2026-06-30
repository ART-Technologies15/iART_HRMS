import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        body: {
            type: String,
            required: true,
            trim: true,
        },

        color: {
            type: String,
            required: true,
        },

        dateFrom: {
            type: Date,
            required: true,
        },

        dateTo: {
            type: Date,
            required: true,
        },

        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ active: 1 });
notificationSchema.index({ dateFrom: 1, dateTo: 1 });

export default mongoose.model("Notification", notificationSchema);