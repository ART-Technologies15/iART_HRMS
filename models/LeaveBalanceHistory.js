import mongoose from "mongoose";

const leaveBalanceHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        month: {
            type: Number,
            required: true,
        },

        year: {
            type: Number,
            required: true,
        },

        openingBalance: {
            type: Number,
            default: 0,
        },

        leaveUsed: {
            type: Number,
            default: 0,
        },

        extraLOP: {
            type: Number,
            default: 0,
        },

        closingBalance: {
            type: Number,
            default: 0,
        },

    },
    {
        timestamps: true,
    }
);

leaveBalanceHistorySchema.index(
    {
        userId: 1,
        month: 1,
        year: 1,
    },
    {
        unique: true,
    }
);

export default mongoose.model(
    "LeaveBalanceHistory",
    leaveBalanceHistorySchema
);