import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,           // For faster lookups
      // match: [/^EMP[A-Z0-9-]{3,}$/, "Invalid Employee ID format. Example: EMP001 or EMP-2025-001"],
    },

    name: { type: String, required: true },

    profilePhoto: {
      type: String, // S3 URL
      default: null,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      minlength: 10,
      maxlength: 10,
    },

    alternateMobile: {
      type: String,
      required: true,
      unique: true,
      minlength: 10,
      maxlength: 10,
    },

    address: { type: String },

    email: { type: String, required: true, unique: true },

    dateOfBirth: Date,

    joiningDate: Date,

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "employee", "hr"],
      default: "employee",
      required: true,
    },

    department: { type: String, required: true },

    designation: String,

    leaveInfo: {
      balance: { type: Number, default: 0 },
      extraLOP: { type: Number, default: 0 },
      updatedOn: { type: Date, default: Date.now },
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    // Identity fields
    pan: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      // minlength: 10,
      // maxlength: 10,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, // PAN format
    },

    panFile: {
      type: String, // S3 URL
      default: null,
    },

    aadhaar: {
      type: String,
      unique: true,
      sparse: true,
      // minlength: 12,
      // maxlength: 12,
      match: /^[0-9]{12}$/, // Aadhaar 12 digits
    },

    aadhaarFile: {
      type: String, // S3 URL
      default: null,
    },

    // Bank details
    bankDetails: {
      accountNumber: {
        type: String,
        sparse: true,
        // minlength: 9,
        maxlength: 18,
        match: /^[0-9]{9,18}$/, // numeric range
      },
      ifsc: {
        type: String,
        uppercase: true,
        sparse: true,
        // minlength: 11,
        // maxlength: 11,
        match: /^[A-Z]{4}0[A-Z0-9]{6}$/, // valid IFSC format
      },
      bankName: {
        type: String,
        trim: true,
      },

      cancelledChequeFile: {
        type: String, // S3 URL
        default: null,
      },

      passbookFile: {
        type: String, // S3 URL
        default: null,
      },
    },
  },
  { timestamps: true }
);

// compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export default mongoose.model("User", userSchema);
