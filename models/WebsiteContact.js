// models/WebsiteContact.js
import mongoose from "mongoose";

const websiteContactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        service: {
            type: String,
            trim: true,
        },

        budget: {
            type: String,
            trim: true,
        },

        message: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("WebsiteContact", websiteContactSchema);