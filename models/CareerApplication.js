import mongoose from "mongoose";

const pastExperienceSchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: true,
            trim: true,
        },

        jobTitle: {
            type: String,
            required: true,
            trim: true,
        },

        employmentType: {
            type: String,
            enum: [
                "full-time",
                "part-time",
                "internship",
                "contract",
                "freelance",
            ],
            default: "full-time",
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            default: null,
        },

        currentlyWorking: {
            type: Boolean,
            default: false,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        technologies: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    {
        _id: true,
    }
);

const careerApplicationSchema = new mongoose.Schema(
    {
        // The career post this person applied for
        careerPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CareerPost",
            required: true,
        },

        // Applicant basic information
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        experience: {
            type: String,
            enum: [
                "student",
                "fresher",
                "0-1-years",
                "1-3-years",
                "3-5-years",
                "5-plus-years",
            ],
            required: true,
        },

        // Previous employment details
        // Required only when candidate has experience
        pastExperience: {
            type: [pastExperienceSchema],
            default: [],
        },

        // Snapshot of post information at application time
        opportunityType: {
            type: String,
            enum: ["job", "internship"],
            required: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        subCategory: {
            type: String,
            required: true,
            trim: true,
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
            required: true,
            default: false,
        },

        currentLocation: {
            city: {
                type: String,
                trim: true,
                default: "",
            },
            state: {
                type: String,
                trim: true,
                default: "",
            },
            country: {
                type: String,
                trim: true,
                default: "",
            },
        },

        // Application processing
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: [
                        "new",
                        "reviewing",
                        "shortlisted",
                        "interview",
                        "selected",
                        "rejected",
                        "withdrawn",
                    ],
                    required: true,
                },

                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null,
                },

                changedAt: {
                    type: Date,
                    default: Date.now,
                },

                note: {
                    type: String,
                    trim: true,
                    default: "",
                },
            },
        ],

        notes: {
            type: String,
            default: "",
        },

        // Admin/HR who is handling the application
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

careerApplicationSchema.index({
    careerPost: 1,
    createdAt: -1,
});

careerApplicationSchema.index({
    email: 1,
});

careerApplicationSchema.index({
    status: 1,
});

careerApplicationSchema.index(
    {
        careerPost: 1,
        email: 1,
    },
    {
        unique: true,
    }
);

const CareerApplication = mongoose.model(
    "CareerApplication",
    careerApplicationSchema
);

export default CareerApplication;