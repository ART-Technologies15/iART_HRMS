import mongoose from "mongoose";

const careerPostSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        opportunityType: {
            type: String,
            enum: ["job", "internship"],
            required: true,
        },

        internshipType: {
            type: String,
            enum: ["paid", "unpaid"],
            required: function () {
                return this.opportunityType === "internship";
            },
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

        description: {
            type: String,
            required: true,
        },

        responsibilities: [
            {
                type: String,
                trim: true,
            },
        ],

        requirements: [
            {
                type: String,
                trim: true,
            },
        ],

        skills: [
            {
                type: String,
                trim: true,
            },
        ],

        // Only applicable for jobs
        salary: {
            min: {
                type: Number,
                default: null,
            },

            max: {
                type: Number,
                default: null,
            },

            currency: {
                type: String,
                default: "INR",
            },

            period: {
                type: String,
                enum: ["monthly", "yearly", "hourly", "fixed"],
                default: "monthly",
            },

            displayText: {
                type: String,
                default: "",
            },
        },

        // Internship duration
        duration: {
            value: {
                type: Number,
                default: null,
            },

            unit: {
                type: String,
                enum: ["days", "weeks", "months"],
                default: "months",
            },
        },

        location: {
            type: String,
            trim: true,
            default: "Remote",
        },

        workMode: {
            type: String,
            enum: ["onsite", "remote", "hybrid"],
            default: "onsite",
        },

        vacancies: {
            type: Number,
            default: 1,
            min: 1,
        },

        applicationDeadline: {
            type: Date,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        status: {
            type: String,
            enum: ["draft", "published", "closed", "archived"],
            default: "draft",
        },

        publishedAt: {
            type: Date,
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
        },

        // Who created the career post
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Who last updated the career post
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

careerPostSchema.index({
    opportunityType: 1,
    category: 1,
    subCategory: 1,
});

careerPostSchema.index({
    status: 1,
    isActive: 1,
});

careerPostSchema.index({
    applicationDeadline: 1,
});

const CareerPost = mongoose.model("CareerPost", careerPostSchema);

export default CareerPost;