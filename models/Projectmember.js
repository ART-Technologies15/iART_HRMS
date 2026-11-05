import mongoose from "mongoose";

/**
 * Join collection: Project <-> User (many-to-many).
 * Used when Project.assignmentType === "specific".
 * Kept separate from Project so a project can have thousands of members
 * without hitting the 16MB doc limit, and so we can index/query both ways.
 */
const projectMemberSchema = new mongoose.Schema(
    {
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

        // Role inside this project (not the system role on User)
        role: {
            type: String,
            enum: ["lead", "member", "reviewer", "viewer"],
            default: "member",
        },

        status: {
            type: String,
            enum: ["active", "removed"],
            default: "active",
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedAt: { type: Date, default: Date.now },
        removedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// A user can only be a member of a project once
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
// "All projects of this employee"
projectMemberSchema.index({ user: 1, status: 1 });
// "All members of this project"
projectMemberSchema.index({ project: 1, status: 1 });

export default mongoose.model("ProjectMember", projectMemberSchema);