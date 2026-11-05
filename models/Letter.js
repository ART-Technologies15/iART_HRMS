import mongoose from "mongoose";

const letterSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        type: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        title: {
            type: String,
            trim: true,
            default: null,
        },

        file: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "revoked"],
            default: "active",
        },

        assignedAt: {
            type: Date,
            default: Date.now,
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

letterSchema.index({
    employee: 1,
    type: 1,
    status: 1,
});

export default mongoose.model("Letter", letterSchema);