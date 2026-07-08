import mongoose from "mongoose";

const assetAssignmentSchema = new mongoose.Schema(
    {
        assetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AssetInventory",
            required: true,
            index: true,
        },

        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        assignedDate: {
            type: Date,
            required: true,
            default: Date.now,
        },

        expectedReturnDate: {
            type: Date,
            default: null,
        },

        returnedDate: {
            type: Date,
            default: null,
        },

        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        assignmentStatus: {
            type: String,
            enum: [
                "Assigned",
                "Returned",
                "Transferred",
                "Lost",
                "Damaged",
            ],
            default: "Assigned",
            index: true,
        },

        remarks: {
            type: String,
            default: "",
            trim: true,
        },

        returnRemarks: {
            type: String,
            default: "",
        },

        conditionAtAssignment: {
            type: String,
            enum: [
                "New",
                "Good",
                "Fair",
                "Damaged",
            ],
            default: "Good",
        },

        conditionAtReturn: {
            type: String,
            enum: [
                "Good",
                "Fair",
                "Damaged",
                "Lost",
            ],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

assetAssignmentSchema.index({
    assetId: 1,
    assignmentStatus: 1,
});

assetAssignmentSchema.index({
    employeeId: 1,
    assignmentStatus: 1,
});

export default mongoose.model(
    "AssetAssignment",
    assetAssignmentSchema
);