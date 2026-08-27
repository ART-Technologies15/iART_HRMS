// models/ClientInvoice.js
import mongoose from "mongoose";

const clientInvoiceSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            trim: true,
        },

        service: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        serial: {
            type: String,
            required: true,
            trim: true,
        },

        invoiceNumber: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        invoiceDate: {
            type: Date,
            required: true,
        },

        invoiceDueDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Same serial cannot be used again for the same type + service
clientInvoiceSchema.index(
    {
        type: 1,
        service: 1,
        serial: 1,
    },
    {
        unique: true,
        name: "unique_type_service_serial",
    }
);

export default mongoose.model("ClientInvoice", clientInvoiceSchema);