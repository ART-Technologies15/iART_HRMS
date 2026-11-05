import mongoose from "mongoose";

/**
 * Join collection: Task <-> User.
 * - Created for Task.assignmentType === "specific".
 * - For Task.assignmentType === "all", rows are created lazily the first time
 *   an employee updates their own progress (so "all" never fans out).
 * Each row carries the employee's OWN status, so one task can be
 * "done" for Alice and "in_progress" for Bob.
 */
const taskAssignmentSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
        },

        // Denormalized for fast "my tasks in project X" queries
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["todo", "in_progress", "in_review", "blocked", "done"],
            default: "todo",
        },

        progress: { type: Number, min: 0, max: 100, default: 0 },
        hoursSpent: { type: Number, default: 0 },
        remarks: { type: String, trim: true, default: "" },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedAt: { type: Date, default: Date.now },
        completedAt: { type: Date, default: null },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

taskAssignmentSchema.index({ task: 1, user: 1 }, { unique: true });
taskAssignmentSchema.index({ user: 1, status: 1, isActive: 1 });
taskAssignmentSchema.index({ project: 1, user: 1 });

export default mongoose.model("TaskAssignment", taskAssignmentSchema);