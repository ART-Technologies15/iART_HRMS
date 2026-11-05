import mongoose from "mongoose";

export const TASK_STATUS = [
    "todo",
    "in_progress",
    "in_review",
    "blocked",
    "done",
    "cancelled",
];

const taskSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },

        status: {
            type: String,
            enum: TASK_STATUS,
            default: "todo",
            index: true,
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },

        startDate: { type: Date, default: null },
        dueDate: { type: Date, default: null, index: true },
        completedAt: { type: Date, default: null },

        estimatedHours: { type: Number, default: 0 },

        // Optional grouping inside a project, e.g. "Phase 1", "Design", "Sprint 3"
        section: { type: String, trim: true, default: null, index: true },

        // Optional hierarchy (subtasks)
        parentTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
            index: true,
        },

        /**
         * Assignment mode:
         *  - "all":      every member of the project (or everyone, if the project
         *                itself is "all") is responsible. No rows required.
         *  - "specific": only users in TaskAssignment are responsible.
         */
        assignmentType: {
            type: String,
            enum: ["all", "specific"],
            default: "specific",
            index: true,
        },

        tags: [{ type: String, trim: true, lowercase: true }],

        attachments: [
            {
                name: String,
                url: String, // S3 URL
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                uploadedAt: { type: Date, default: Date.now },
                _id: false,
            },
        ],

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

taskSchema.index({ project: 1, status: 1, isArchived: 1 });
taskSchema.index({ project: 1, dueDate: 1 });
taskSchema.index({ project: 1, parentTask: 1, isArchived: 1 });

export default mongoose.model("Task", taskSchema);