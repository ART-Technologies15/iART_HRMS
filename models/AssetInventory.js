import mongoose from "mongoose";

const assetInventorySchema = new mongoose.Schema(
    {
        assetCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        assetName: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            // enum: [
            //     "Laptop",
            //     "Laptop Mac",
            //     "CPU",
            //     "CPU Mac",
            //     "Monitor",
            //     "Keyboard",
            //     "Mouse",
            //     "Headset",
            //     "Mobile",
            //     "SIM",
            //     "Cable",
            //     "Furniture",
            //     "Other",
            // ],
            required: true,
        },

        brand: String,

        model: String,

        serialNumber: {
            type: String,
            default: "",
            index: true,
        },

        purchaseDate: Date,

        purchasePrice: Number,

        warrantyExpiry: Date,

        vendor: String,

        condition: {
            type: String,
            // enum: [
            //     "New",
            //     "Good",
            //     "Fair",
            //     "Damaged",
            //     "Repair",
            //     "Lost",
            //     "Scrapped",
            // ],
            default: "New",
        },

        status: {
            type: String,
            enum: [
                "Available",
                "Assigned",
                "Repair",
                "Lost",
                "Scrapped",
            ],
            default: "Available",
            index: true,
        },

        currentAssignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        notes: String,

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("AssetInventory", assetInventorySchema);