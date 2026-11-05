import mongoose from "mongoose";

export const PROJECT_STATUS = [
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled",
];

const projectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },

        // Human-friendly unique key, e.g. PRJ-001
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },

        description: { type: String, trim: true, default: "" },

        status: {
            type: String,
            enum: PROJECT_STATUS,
            default: "planning",
            index: true,
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },

        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        completedAt: { type: Date, default: null },

        // Optional department scoping (matches User.department)
        department: { type: String, default: null, index: true },

        // Project-level owner / manager
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        /**
         * Assignment mode:
         *  - "all":      every active employee is implicitly a member
         *                (no ProjectMember rows needed -> no fan-out)
         *  - "specific": only users listed in ProjectMember are members
         */
        assignmentType: {
            type: String,
            enum: ["all", "specific"],
            default: "specific",
            index: true,
        },

        tags: [{ type: String, trim: true, lowercase: true }],

        // Small, bounded audit trail of status changes
        statusHistory: [
            {
                from: String,
                to: String,
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                changedAt: { type: Date, default: Date.now },
                remark: String,
                _id: false,
            },
        ],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        isArchived: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

projectSchema.index({ status: 1, isArchived: 1, createdAt: -1 });

export default mongoose.model("Project", projectSchema);