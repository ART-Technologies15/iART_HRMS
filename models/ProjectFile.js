import mongoose from "mongoose";

export const FILE_CATEGORIES = ["document", "design", "report", "other"];

export const LINK_PROVIDERS = [
    "google_sheets",
    "google_docs",
    "google_slides",
    "google_forms",
    "google_drive",
    "microsoft",
    "figma",
    "notion",
    "github",
    "other",
];

/**
 * Files AND links added to a project (optionally tied to one task).
 *  - type "file": uploaded to S3 (url + key are the S3 location)
 *  - type "link": external link such as a Google Sheet (url is the link, no key)
 * Kept in its own collection so projects stay small, and items can be
 * paginated, filtered and searched.
 */
const projectFileSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },

        // null = belongs to the whole project, set = attached to that task
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },

        type: {
            type: String,
            enum: ["file", "link"],
            default: "file",
        },

        name: { type: String, required: true, trim: true }, // display name
        url: { type: String, required: true }, // S3 URL for files, external URL for links

        // S3 object key, only for uploaded files
        key: {
            type: String,
            default: null,
            required: function () {
                return this.type === "file";
            },
        },

        // detected from the URL, only for links (used for icons in the UI)
        provider: {
            type: String,
            enum: LINK_PROVIDERS,
            default: null,
        },

        mimeType: { type: String, default: null }, // files only
        size: { type: Number, default: 0 }, // bytes, files only (after WebP conversion)

        category: {
            type: String,
            enum: FILE_CATEGORIES,
            default: "other",
        },
        description: { type: String, trim: true, default: "" },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

projectFileSchema.index({ project: 1, createdAt: -1 });
projectFileSchema.index({ task: 1, createdAt: -1 });
projectFileSchema.index({ project: 1, type: 1 });

export default mongoose.model("ProjectFile", projectFileSchema);