import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

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

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "employee"],
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

    aadhaar: {
      type: String,
      unique: true,
      sparse: true,
      // minlength: 12,
      // maxlength: 12,
      match: /^[0-9]{12}$/, // Aadhaar 12 digits
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
    },
  },
  { timestamps: true }
);

// compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export default mongoose.model("User", userSchema);
