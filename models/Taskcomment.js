import mongoose from "mongoose";

/**
 * Comments / discussion on a task.
 * Separate collection (not an array inside Task) so a busy task
 * never grows its document, and comments can be paginated.
 */
const taskCommentSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
        },

        // Denormalized for project-level activity queries
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

        message: { type: String, required: true, trim: true, maxlength: 2000 },

        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

taskCommentSchema.index({ task: 1, isDeleted: 1, createdAt: -1 });
taskCommentSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model("TaskComment", taskCommentSchema);