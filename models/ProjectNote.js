import mongoose from "mongoose";

/**
 * Private notes a user keeps for a project (optionally about one task).
 * Notes are visible ONLY to their owner: every query must filter by `user`,
 * and no one else (not even admin) is given access through the API.
 */
const projectNoteSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },

        // owner of the note, the only person who can read or change it
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // null = about the whole project, set = about that task
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },

        title: { type: String, trim: true, maxlength: 150, default: "" },

        content: { type: String, required: true, trim: true, maxlength: 10000 },

        isPinned: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// "my notes in this project", pinned first, newest edits first
projectNoteSchema.index({ project: 1, user: 1, isPinned: -1, updatedAt: -1 });
// "my notes on this task"
projectNoteSchema.index({ task: 1, user: 1 });

export default mongoose.model("ProjectNote", projectNoteSchema);