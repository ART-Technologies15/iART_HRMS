import mongoose from "mongoose";

const trainingEnquirySchema = new mongoose.Schema(
    {
        // Basic information
        fullName: {
            type: String,
            trim: true,
            default: "",
        },

        email: {
            type: String,
            trim: true,
            default: "",
            lowercase: true,
        },

        phone: {
            type: String,
            trim: true,
            default: "",
        },

        experience: {
            type: String,
            default: "",
        },

        // Training opportunity
        opportunityType: {
            type: String,
            default: "training",
            immutable: true,
        },

        category: {
            type: String,
            trim: true,
            default: "",
        },

        subCategory: {
            type: String,
            trim: true,
            default: "",
        },

        // Training duration requested by candidate
        duration: {
            value: {
                type: Number,
                required: true,
            },

            unit: {
                type: String,
                enum: ["days", "weeks", "months"],
                required: true,
            },
        },

        linkedinProfile: {
            type: String,
            trim: true,
            default: "",
        },

        githubProfile: {
            type: String,
            trim: true,
            default: "",
        },

        portfolio: {
            type: String,
            trim: true,
            default: "",
        },

        about: {
            type: String,
            trim: true,
            default: "",
        },

        resume: {
            fileName: {
                type: String,
                default: "",
            },

            fileUrl: {
                type: String,
                default: "",
            },

            fileKey: {
                type: String,
                default: "",
            },

            uploadedAt: {
                type: Date,
                default: null,
            },
        },

        consent: {
            type: Boolean,
            default: false,
        },

        // Admin/HR handling
        status: {
            type: String,
            enum: [
                "new",
                "contacted",
                "under-review",
                "approved",
                "rejected",
                "completed",
            ],
            default: "new",
        },

        isReviewed: {
            type: Boolean,
            default: false,
        },

        notes: {
            type: String,
            default: "",
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

trainingEnquirySchema.index({
    category: 1,
    subCategory: 1,
});

trainingEnquirySchema.index({
    email: 1,
});

trainingEnquirySchema.index({
    status: 1,
});

const TrainingEnquiry = mongoose.model(
    "TrainingEnquiry",
    trainingEnquirySchema
);

export default TrainingEnquiry;