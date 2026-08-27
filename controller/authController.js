import jwt from "jsonwebtoken";
import User from "../models/Users.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import LeaveBalance from "../models/LeaveBalance.js";
import WebsiteContact from "../models/WebsiteContact.js";
import TrainingEnquiry from "../models/Training.js";
import CareerPost from "../models/CareerPost.js";
import ClientInvoice from "../models/ClientInvoice.js";
import {
  getTypeCode,
  getServiceCode,
  generateInvoiceNumber,
} from "../helpers/clientInvoice.helper.js";

import { uploadToS3, deleteS3File } from "../utils/s3Upload/s3.js";
import CareerApplication from "../models/CareerApplication.js";
import MailService from "../services/mailService.js";
import path from "path";

export const register = async (req, res) => {
  try {
    const allowedRoles = ["admin", "hr"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can register users.",
      });
    }

    const {
      name,
      email,
      password,
      role,
      mobile,
      alternateMobile,
      address,
      department,
      designation,
      pan,
      aadhaar,
      bankDetails,
      dateOfBirth,
      joiningDate,
      leaveInfo
    } = req.body;

    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin users cannot be created.",
      });
    }

    const files = req.files || {};

    const requiredFields = {
      name,
      email,
      password,
      mobile,
      alternateMobile,
      department,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Convert empty strings to undefined so sparse uniqueness index ignores them
    const sanitizedPan = pan && pan.trim() !== "" ? pan : undefined;
    const sanitizedAadhaar = aadhaar && aadhaar.trim() !== "" ? aadhaar : undefined;

    const existingUser = await User.findOne({
      $or: [
        { email },
        { mobile },
        { alternateMobile },
        sanitizedPan ? { pan: sanitizedPan } : null,
        sanitizedAadhaar ? { aadhaar: sanitizedAadhaar } : null,
      ].filter(Boolean),
    });

    if (existingUser) {
      let field = "email";
      if (existingUser.mobile === mobile) field = "mobile";
      else if (existingUser.alternateMobile === alternateMobile)
        field = "alternateMobile";
      else if (sanitizedPan && existingUser.pan === sanitizedPan) field = "pan";
      else if (sanitizedAadhaar && existingUser.aadhaar === sanitizedAadhaar) field = "aadhaar";

      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
      });
    }

    let parsedLeaveInfo = {};

    if (leaveInfo) {
      try {
        parsedLeaveInfo =
          typeof leaveInfo === "string"
            ? JSON.parse(leaveInfo)
            : leaveInfo;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid leaveInfo format",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePhoto = null;
    let parsedBankDetails = {};
    let panFile = null;
    let aadhaarFile = null;
    let cancelledChequeFile = null;
    let passbookFile = null;

    if (files.profilePhoto?.length) {
      const file = files.profilePhoto[0];

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      profilePhoto = uploaded.Location;
    }

    if (files.panFile?.length) {
      const file = files.panFile[0];

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      panFile = uploaded.Location;
    }

    if (files.aadhaarFile?.length) {
      const file = files.aadhaarFile[0];

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      aadhaarFile = uploaded.Location;
    }

    if (bankDetails) {
      parsedBankDetails =
        typeof bankDetails === "string"
          ? JSON.parse(bankDetails)
          : bankDetails;
    }

    if (files.cancelledChequeFile?.length) {
      const file = files.cancelledChequeFile[0];

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      cancelledChequeFile = uploaded.Location;
    }

    if (files.passbookFile?.length) {
      const file = files.passbookFile[0];

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      passbookFile = uploaded.Location;
    }

    parsedBankDetails = {
      ...parsedBankDetails,
      cancelledChequeFile,
      passbookFile,
    };

    // Clean nested bank details fields if they are sent as empty strings
    if (parsedBankDetails.accountNumber === "") parsedBankDetails.accountNumber = undefined;
    if (parsedBankDetails.ifsc === "") parsedBankDetails.ifsc = undefined;

    // Generate Employee ID using aggregation
    const lastEmployee = await User.aggregate([
      {
        $match: {
          employeeId: {
            $exists: true,
            $ne: null,
            $regex: /^IART\d+$/,
          },
        },
      },
      {
        $addFields: {
          employeeNumber: {
            $toInt: {
              $substr: [
                "$employeeId",
                4, // Skip "IART"
                {
                  $subtract: [
                    { $strLenCP: "$employeeId" },
                    4,
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $sort: {
          employeeNumber: -1,
        },
      },
      {
        $limit: 1,
      },
    ]);

    const nextEmployeeNumber =
      lastEmployee.length > 0
        ? lastEmployee[0].employeeNumber + 1
        : 1;

    const employeeId = `IART${String(nextEmployeeNumber).padStart(3, "0")}`;

    // ── Auto-verification (register is admin/hr only, so always trusted) ──
    const isPanVerified = Boolean(sanitizedPan && panFile);
    const isAadhaarVerified = Boolean(sanitizedAadhaar && aadhaarFile);
    const isBankVerified = Boolean(
      parsedBankDetails.accountNumber &&
      parsedBankDetails.ifsc &&
      parsedBankDetails.bankName &&
      (parsedBankDetails.cancelledChequeFile || parsedBankDetails.passbookFile)
    );

    const user = await User.create({
      createdBy: req.user._id || req.user.id,
      createdByRole: req.user.role,
      employeeId,
      name,
      profilePhoto,
      email,
      mobile,
      alternateMobile,
      address,
      department,
      designation,
      passwordHash: hashedPassword,
      role: role || "employee",
      pan: sanitizedPan,
      aadhaar: sanitizedAadhaar,
      panFile,
      aadhaarFile,
      bankDetails:
        Object.keys(parsedBankDetails).length > 0
          ? parsedBankDetails
          : undefined,
      dateOfBirth: dateOfBirth || null,
      joiningDate,
      leaveInfo: {
        balance:
          typeof parsedLeaveInfo.balance === "number"
            ? parsedLeaveInfo.balance
            : 0,

        extraLOP:
          typeof parsedLeaveInfo.extraLOP === "number"
            ? parsedLeaveInfo.extraLOP
            : 0,

        updatedOn: new Date(),
      },

      isActive: true,
      isPanVerified,
      panVerifiedBy: isPanVerified ? req.user._id : null,
      panVerifiedAt: isPanVerified ? new Date() : null,
      isAadhaarVerified,
      aadhaarVerifiedBy: isAadhaarVerified ? req.user._id : null,
      aadhaarVerifiedAt: isAadhaarVerified ? new Date() : null,
      isBankVerified,
      bankVerifiedBy: isBankVerified ? req.user._id : null,
      bankVerifiedAt: isBankVerified ? new Date() : null,
    });

    const currentYear = new Date().getFullYear();
    await LeaveBalance.create({
      userId: user._id,
      year: currentYear,
      personal_total_leaves: 12,
      personal_leaves_taken: 0,
      personal_remaining_leaves: 12,
      sick_total_leaves: 12,
      sick_leaves_taken: 0,
      sick_remaining_leaves: 12,
    });

    const { passwordHash, ...userData } = user.toObject();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      const missing = [];
      if (!email) missing.push("email");
      if (!password) missing.push("password");

      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Find user
    const user = await User.findOne({ email, isActive: true }).select("+passwordHash");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    const { passwordHash, ...userData } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        ...userData,
        leaveInfo: user.leaveInfo, // include leaveInfo in response
      },
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: err.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const user = req.user

    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      department = "",
      designation = "",
      isActive = "",
    } = req.query;

    // Build search query
    const query = {
      _id: { $ne: req.user._id },
      // isActive: true,
    };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { employeeId: regex },
        { name: regex },
        { email: regex },
        { mobile: regex },
        { alternateMobile: regex },
        { address: regex },
        { designation: regex },
      ];
    }

    if (role) query.role = role;
    if (department) query.department = department;
    if (designation) query.designation = designation;

    if (isActive !== "") {
      query.isActive = isActive === "true";
    }


    const skip = (Number(page) - 1) * Number(limit);

    // Dynamic field selection based on role
    const selectFields =
      req.user.role === "admin" || req.user.role === "hr"
        ? "-passwordHash" // Admin sees everything except password
        : "-passwordHash -address -alternateMobile -pan -aadhaar -bankDetails"; // Non-admin sees NONE of these

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("createdBy", "name email employeeId role profilePhoto")
        .populate("panVerifiedBy", "name email employeeId role profilePhoto")
        .populate("aadhaarVerifiedBy", "name email employeeId role profilePhoto")
        .populate("bankVerifiedBy", "name email employeeId role profilePhoto")
        .populate(
          "pendingVerification.pan.reviewedBy",
          "name email employeeId role profilePhoto"
        )
        .populate(
          "pendingVerification.aadhaar.reviewedBy",
          "name email employeeId role profilePhoto"
        )
        .populate(
          "pendingVerification.bank.reviewedBy",
          "name email employeeId role profilePhoto"
        )
        .select(selectFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(), // Important: .lean() returns plain JS objects → faster + safer

      User.countDocuments(query),
    ]);

    // Convert _id to string for consistency (optional but clean)
    const filteredUsers = users.map((user) => ({
      ...user,
      _id: user._id.toString(),
    }));

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users: filteredUsers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: err.message,
    });
  }
};

export const getAllUsersPhoneBook = async (req, res) => {
  try {
    const user = req.user

    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      department = "",
      designation = "",
    } = req.query;

    // Build search query
    const query = {
      _id: { $ne: req.user._id },
      isActive: true,
    };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { mobile: regex },
        { alternateMobile: regex },
        { address: regex },
        { designation: regex },
      ];
    }

    if (role) query.role = role;
    if (department) query.department = department;
    if (designation) query.designation = designation;

    const skip = (Number(page) - 1) * Number(limit);

    // Dynamic field selection based on role
    const selectFields =
      req.user.role === "admin"
        ? "-passwordHash" // Admin sees everything except password
        : "-passwordHash -address -alternateMobile -pan -aadhaar -bankDetails"; // Non-admin sees NONE of these

    const [users, total] = await Promise.all([
      User.find(query)
        .select(selectFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(), // Important: .lean() returns plain JS objects → faster + safer

      User.countDocuments(query),
    ]);

    // Convert _id to string for consistency (optional but clean)
    const filteredUsers = users.map((user) => ({
      ...user,
      _id: user._id.toString(),
    }));

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users: filteredUsers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: err.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await User.findById(userId)
      .select("-passwordHash")
      .populate("createdBy", "name email employeeId role profilePhoto")
      .populate("panVerifiedBy", "name email employeeId role profilePhoto")
      .populate("aadhaarVerifiedBy", "name email employeeId role profilePhoto")
      .populate("bankVerifiedBy", "name email employeeId role profilePhoto")
      .populate(
        "pendingVerification.pan.reviewedBy",
        "name email employeeId role profilePhoto"
      )
      .populate(
        "pendingVerification.aadhaar.reviewedBy",
        "name email employeeId role profilePhoto"
      )
      .populate(
        "pendingVerification.bank.reviewedBy",
        "name email employeeId role profilePhoto"
      );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: profile,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: err.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: err.message,
    });
  }
};

// export const updateUser = async (req, res) => {
//   try {
//     // const id = req.user.id || req.user._id?.toString();
//     const { id } = req.params;
//     const { oldPassword, newPassword, bankDetails, leaveInfo, isActive, ...rest } =
//       req.body;
//     const files = req.files || {};

//     // 1️⃣ Access Control
//     const isAdmin = req.user.role === "admin";
//     const isHr = req.user.role === "hr";
//     const isAdminOrHr = isAdmin || isHr;

//     // 2️⃣ Find User
//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (!isAdminOrHr && req.user._id.toString() !== id) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not authorized to update this profile",
//       });
//     }

//     // HR cannot edit Admin accounts
//     if (isHr && user.role === "admin") {
//       return res.status(403).json({
//         success: false,
//         message: "HR is not allowed to update admin accounts",
//       });
//     }

//     const updateData = { ...rest, isActive };

//     // 3️⃣ Restricted fields protection for non-admin
//     // Only Admin can change role
//     if (!isAdmin) {
//       delete updateData.role;
//     }

//     // Admin & HR can change department/designation
//     // Employees cannot
//     if (!isAdminOrHr) {
//       delete updateData.department;
//       delete updateData.designation;
//     }

//     // 4️⃣ Auto-null cleanup for Aadhaar & PAN
//     ["aadhaar", "pan"].forEach((field) => {
//       if (field in updateData) {
//         const value = String(updateData[field] || "").trim();
//         if (value === "") {
//           // remove the field entirely → avoids duplicate nulls
//           updateData.$unset = { ...(updateData.$unset || {}), [field]: "" };
//           delete updateData[field];
//         }
//       }
//     });

//     // 5️⃣ Validate formatting of Aadhaar & PAN only if non-null
//     if (updateData.aadhaar) {
//       if (!/^[0-9]{12}$/.test(updateData.aadhaar)) {
//         return res.status(400).json({
//           success: false,
//           message: "Aadhaar number must be a 12-digit numeric value",
//         });
//       }
//     }

//     if (updateData.pan) {
//       if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(updateData.pan)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid PAN format",
//         });
//       }
//     }

//     // 6️⃣ Handle Bank Details
//     if (bankDetails) {
//       const parsed = typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails;
//       const bd = { ...parsed };

//       // Convert empty to null
//       Object.keys(bd).forEach((key) => {
//         if (bd[key] === "") bd[key] = null;
//       });

//       // Validate if provided
//       if (bd.accountNumber && !/^[0-9]{9,18}$/.test(bd.accountNumber)) {
//         return res.status(400).json({
//           success: false,
//           message: "Account number must be 9-18 digits",
//         });
//       }

//       if (bd.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bd.ifsc)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid IFSC code format",
//         });
//       }

//       // Merge existing & new
//       updateData.bankDetails = {
//         ...(user.bankDetails?.toObject?.() || {}),
//         ...bd,
//       };
//     }

//     // 7️⃣ Password Update Logic
//     if (newPassword) {
//       if (newPassword.length < 6) {
//         return res.status(400).json({
//           success: false,
//           message: "New password must be at least 6 characters long",
//         });
//       }

//       if (isAdminOrHr) {
//         updateData.passwordHash = await bcrypt.hash(newPassword, 10);
//       } else {
//         if (!oldPassword) {
//           return res.status(400).json({
//             success: false,
//             message: "Old password is required to change password",
//           });
//         }

//         const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
//         if (!isMatch) {
//           return res.status(400).json({
//             success: false,
//             message: "Old password is incorrect",
//           });
//         }

//         if (oldPassword === newPassword) {
//           return res.status(400).json({
//             success: false,
//             message: "New password cannot be same as old password",
//           });
//         }

//         updateData.passwordHash = await bcrypt.hash(newPassword, 10);
//       }
//     }

//     if (leaveInfo && typeof leaveInfo.balance === "number") {
//       if (!isAdminOrHr) {
//         return res.status(403).json({
//           success: false,
//           message: "Only Admins and HR can update leave balance manually",
//         });
//       }

//       updateData.leaveInfo = {
//         balance: leaveInfo.balance,
//         updatedOn: new Date(),
//       };
//     }

//     if (updateData.dateOfBirth) {
//       const dateOfBirth = new Date(updateData.dateOfBirth);

//       if (isNaN(dateOfBirth.getTime())) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid date of birth",
//         });
//       }

//       updateData.dateOfBirth = dateOfBirth;
//     }

//     // UPLOADING AND DELETING THE AADHAR, PAN, BANK FILES AND PROFILE PHOTO FROM ACCOUNT
//     if (files.profilePhoto?.length) {
//       // if (user.profilePhoto) {
//       //   await deleteS3File(user.profilePhoto);
//       // }

//       const file = files.profilePhoto[0];

//       const uploaded = await uploadToS3(
//         file.buffer,
//         file.originalname,
//         file.mimetype
//       );

//       updateData.profilePhoto = uploaded.Location;
//     }

//     // UPLOAD PAN
//     if (files.panFile?.length) {
//       // if (user.panFile) {
//       //   await deleteS3File(user.panFile);
//       // }

//       const file = files.panFile[0];

//       const uploaded = await uploadToS3(
//         file.buffer,
//         file.originalname,
//         file.mimetype
//       );

//       updateData.panFile = uploaded.Location;
//     }

//     // UPLOAD AADHAR
//     if (files.aadhaarFile?.length) {
//       // if (user.aadhaarFile) {
//       //   await deleteS3File(user.aadhaarFile);
//       // }

//       const file = files.aadhaarFile[0];

//       const uploaded = await uploadToS3(
//         file.buffer,
//         file.originalname,
//         file.mimetype
//       );

//       updateData.aadhaarFile = uploaded.Location;
//     }

//     // UPLOAD BANK CANCELLED CHEQUE AND PASSBOOK
//     if (files.cancelledChequeFile?.length) {
//       // if (user.bankDetails?.cancelledChequeFile) {
//       //   await deleteS3File(user.bankDetails.cancelledChequeFile);
//       // }

//       const file = files.cancelledChequeFile[0];

//       const uploaded = await uploadToS3(
//         file.buffer,
//         file.originalname,
//         file.mimetype
//       );

//       updateData.bankDetails = {
//         ...(user.bankDetails?.toObject?.() || {}),
//         ...(updateData.bankDetails || {}),
//         cancelledChequeFile: uploaded.Location,
//       };
//     }

//     if (files.passbookFile?.length) {
//       // if (user.bankDetails?.passbookFile) {
//       //   await deleteS3File(user.bankDetails.passbookFile);
//       // }

//       const file = files.passbookFile[0];

//       const uploaded = await uploadToS3(
//         file.buffer,
//         file.originalname,
//         file.mimetype
//       );

//       updateData.bankDetails = {
//         ...(user.bankDetails?.toObject?.() || {}),
//         ...(updateData.bankDetails || {}),
//         passbookFile: uploaded.Location,
//       };
//     }

//     // 8️⃣ Perform Update
//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       {
//         $set: updateData,
//         ...(updateData.$unset ? { $unset: updateData.$unset } : {}),
//       },
//       { new: true, runValidators: true }
//     ).select("-passwordHash");

//     return res.status(200).json({
//       success: true,
//       message: "User updated successfully",
//       user: updatedUser,
//     });
//   } catch (err) {
//     console.error("Error updating user:", err);

//     // Duplicate Key Error (email, mobile, pan, aadhaar, etc.)
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyPattern)[0];
//       return res.status(400).json({
//         success: false,
//         message: `A user with this ${field} already exists`,
//       });
//     }

//     // 🔟 Mongoose validation errors (regex failures, etc.)
//     if (err.name === "ValidationError") {
//       return res.status(400).json({
//         success: false,
//         message: "Validation failed",
//         errors: Object.values(err.errors).map((e) => e.message),
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while updating the user",
//       error: err.message,
//     });
//   }
// };

// In authController.js

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword, bankDetails, leaveInfo, isActive, ...rest } =
      req.body;
    const files = req.files || {};

    // 1️⃣ Access Control
    const isAdmin = req.user.role === "admin";
    const isHr = req.user.role === "hr";
    const isAdminOrHr = isAdmin || isHr;
    const isSelfUpdate = req.user._id.toString() === id;

    // 2️⃣ Find User
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!isAdminOrHr && !isSelfUpdate) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile",
      });
    }

    if (isHr && user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "HR is not allowed to update admin accounts",
      });
    }

    // Only Admin bypasses review, even on their own profile.
    // HR-self and Employee-self identity/bank edits must go through pendingVerification.
    const goesToPending = isSelfUpdate && !isAdmin;

    const updateData = { ...rest };
    const setData = {};
    const unsetData = {};

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // 3️⃣ Restricted fields protection
    if (!isAdmin) delete updateData.role;
    if (!isAdminOrHr) {
      delete updateData.department;
      delete updateData.designation;
    }

    // Capture incoming pan/aadhaar before we route/strip them
    const incomingPan = updateData.pan;
    const incomingAadhaar = updateData.aadhaar;

    // 4️⃣ Detect explicit clears (empty string sent) vs real value changes
    const isClearingPan = ("pan" in req.body) && String(req.body.pan || "").trim() === "";
    const isClearingAadhaar = ("aadhaar" in req.body) && String(req.body.aadhaar || "").trim() === "";

    delete updateData.pan;
    delete updateData.aadhaar;

    // 5️⃣ Format validation (skip if clearing — nothing to validate)
    if (
      !isClearingAadhaar &&
      incomingAadhaar !== undefined &&
      incomingAadhaar !== null
    ) {
      if (!/^[0-9]{12}$/.test(incomingAadhaar)) {
        return res.status(400).json({
          success: false,
          message: "Aadhaar number must be a 12-digit numeric value",
        });
      }
    }

    if (
      !isClearingPan &&
      incomingPan !== undefined &&
      incomingPan !== null
    ) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(incomingPan)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PAN format",
        });
      }
    }

    // 6️⃣ Parse & validate bank details
    let parsedBank = null;
    if (bankDetails) {
      let parsed;
      try {
        parsed = typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails;
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid bankDetails format" });
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        Object.keys(parsed).length > 0
      ) {
        parsedBank = { ...parsed };
        Object.keys(parsedBank).forEach((key) => {
          if (parsedBank[key] === "") parsedBank[key] = null;
        });
        if (parsedBank.accountNumber && !/^[0-9]{9,18}$/.test(parsedBank.accountNumber)) {
          return res.status(400).json({
            success: false,
            message: "Account number must be 9-18 digits",
          });
        }
        if (parsedBank.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(parsedBank.ifsc)) {
          return res.status(400).json({ success: false, message: "Invalid IFSC code format" });
        }
      }
    }

    // 7️⃣ Password update logic
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }
      if (isAdminOrHr) {
        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      } else {
        if (!oldPassword) {
          return res.status(400).json({
            success: false,
            message: "Old password is required to change password",
          });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: "Old password is incorrect" });
        }
        if (oldPassword === newPassword) {
          return res.status(400).json({
            success: false,
            message: "New password cannot be same as old password",
          });
        }
        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      }
    }

    // Leave info
    let parsedLeaveInfo = null;

    if (leaveInfo) {
      try {
        parsedLeaveInfo =
          typeof leaveInfo === "string"
            ? JSON.parse(leaveInfo)
            : leaveInfo;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid leaveInfo format",
        });
      }
    }

    if (
      parsedLeaveInfo &&
      typeof parsedLeaveInfo.balance === "number"
    ) {
      if (!isAdminOrHr) {
        return res.status(403).json({
          success: false,
          message: "Only Admins and HR can update leave balance manually",
        });
      }

      updateData.leaveInfo = {
        balance: parsedLeaveInfo.balance,
        updatedOn: new Date(),
      };
    }

    if (updateData.dateOfBirth) {
      const dob = new Date(updateData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date of birth" });
      }
      updateData.dateOfBirth = dob;
    }

    // 8️⃣ Profile photo — never part of verification, always applies directly
    if (files.profilePhoto?.length) {
      const file = files.profilePhoto[0];
      const uploaded = await uploadToS3(file.buffer, file.originalname, file.mimetype);
      updateData.profilePhoto = uploaded.Location;
    }

    // 9️⃣ Upload identity/bank files — upload always happens, only the destination differs
    let panFileUrl = null;
    if (files.panFile?.length) {
      const file = files.panFile[0];
      panFileUrl = (await uploadToS3(file.buffer, file.originalname, file.mimetype)).Location;
    }

    let aadhaarFileUrl = null;
    if (files.aadhaarFile?.length) {
      const file = files.aadhaarFile[0];
      aadhaarFileUrl = (await uploadToS3(file.buffer, file.originalname, file.mimetype)).Location;
    }

    let chequeFileUrl = null;
    if (files.cancelledChequeFile?.length) {
      const file = files.cancelledChequeFile[0];
      chequeFileUrl = (await uploadToS3(file.buffer, file.originalname, file.mimetype)).Location;
    }

    let passbookFileUrl = null;
    if (files.passbookFile?.length) {
      const file = files.passbookFile[0];
      passbookFileUrl = (await uploadToS3(file.buffer, file.originalname, file.mimetype)).Location;
    }

    // 🔟 Detect what's actually being touched (clearing counts as touched too)
    const panTouched = isClearingPan || ("pan" in req.body) || Boolean(panFileUrl);
    const aadhaarTouched = isClearingAadhaar || ("aadhaar" in req.body) || Boolean(aadhaarFileUrl);
    const bankTouched =
      Boolean(parsedBank && Object.keys(parsedBank).length > 0) ||
      Boolean(chequeFileUrl) ||
      Boolean(passbookFileUrl);

    // 1️⃣1️⃣ Handle explicit clears FIRST — always applies directly for everyone,
    // never goes to pending, and must never coexist with a $set on the same field.
    if (isClearingPan) {
      unsetData.pan = "";
      unsetData.panFile = "";
      updateData.isPanVerified = false;
      updateData.panVerifiedBy = null;
      updateData.panVerifiedAt = null;
      unsetData["pendingVerification.pan"] = "";
    }
    if (isClearingAadhaar) {
      unsetData.aadhaar = "";
      unsetData.aadhaarFile = "";
      updateData.isAadhaarVerified = false;
      updateData.aadhaarVerifiedBy = null;
      updateData.aadhaarVerifiedAt = null;
      unsetData["pendingVerification.aadhaar"] = "";
    }

    // 1️⃣2️⃣ Route real (non-clearing) changes to pending vs direct
    if (goesToPending) {
      // ── HR-self / Employee-self: identity & bank edits wait for review ──
      if (panTouched && !isClearingPan) {
        setData["pendingVerification.pan"] = {
          number: incomingPan ?? user.pan,
          file: panFileUrl || user.panFile,
          status: "pending",
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        };
      }
      if (aadhaarTouched && !isClearingAadhaar) {
        setData["pendingVerification.aadhaar"] = {
          number: incomingAadhaar ?? user.aadhaar,
          file: aadhaarFileUrl || user.aadhaarFile,
          status: "pending",
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        };
      }
      if (bankTouched) {
        const existingBank = user.bankDetails?.toObject?.() || {};
        setData["pendingVerification.bank"] = {
          accountNumber: parsedBank?.accountNumber ?? existingBank.accountNumber,
          ifsc: parsedBank?.ifsc ?? existingBank.ifsc,
          bankName: parsedBank?.bankName ?? existingBank.bankName,
          cancelledChequeFile: chequeFileUrl || existingBank.cancelledChequeFile || null,
          passbookFile: passbookFileUrl || existingBank.passbookFile || null,
          status: "pending",
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        };
      }
      // Main pan/aadhaar/bankDetails fields are left untouched — they stay at last verified state.
    } else {
      // ── Admin (any target incl. self) / HR editing employee or other HR: apply + auto-verify ──
      if (panTouched && !isClearingPan) {
        updateData.pan = incomingPan ?? user.pan;
        if (panFileUrl) updateData.panFile = panFileUrl;
        const finalPanFile = panFileUrl || user.panFile;
        updateData.isPanVerified = Boolean(updateData.pan && finalPanFile);
        updateData.panVerifiedBy = updateData.isPanVerified ? req.user._id : null;
        updateData.panVerifiedAt = updateData.isPanVerified ? new Date() : null;
        unsetData["pendingVerification.pan"] = "";
      }
      if (aadhaarTouched && !isClearingAadhaar) {
        updateData.aadhaar = incomingAadhaar ?? user.aadhaar;
        if (aadhaarFileUrl) updateData.aadhaarFile = aadhaarFileUrl;
        const finalAadhaarFile = aadhaarFileUrl || user.aadhaarFile;
        updateData.isAadhaarVerified = Boolean(updateData.aadhaar && finalAadhaarFile);
        updateData.aadhaarVerifiedBy = updateData.isAadhaarVerified ? req.user._id : null;
        updateData.aadhaarVerifiedAt = updateData.isAadhaarVerified ? new Date() : null;
        unsetData["pendingVerification.aadhaar"] = "";
      }
      if (bankTouched) {
        const mergedBank = { ...(user.bankDetails?.toObject?.() || {}), ...(parsedBank || {}) };
        if (chequeFileUrl) mergedBank.cancelledChequeFile = chequeFileUrl;
        if (passbookFileUrl) mergedBank.passbookFile = passbookFileUrl;
        updateData.bankDetails = mergedBank;
        const bankComplete = Boolean(
          mergedBank.accountNumber &&
          mergedBank.ifsc &&
          mergedBank.bankName &&
          (mergedBank.cancelledChequeFile || mergedBank.passbookFile)
        );
        updateData.isBankVerified = bankComplete;
        updateData.bankVerifiedBy = bankComplete ? req.user._id : null;
        updateData.bankVerifiedAt = bankComplete ? new Date() : null;
        unsetData["pendingVerification.bank"] = "";
      }
    }

    // 1️⃣3️⃣ Perform update
    const mongoUpdate = {};
    if (Object.keys(updateData).length) mongoUpdate.$set = { ...updateData, ...setData };
    else if (Object.keys(setData).length) mongoUpdate.$set = setData;
    if (Object.keys(unsetData).length) mongoUpdate.$unset = unsetData;

    if (!mongoUpdate.$set && !mongoUpdate.$unset) {
      return res.status(400).json({ success: false, message: "No changes provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    return res.status(200).json({
      success: true,
      message: goesToPending
        ? "Profile updated. Identity/bank changes are pending Admin or HR review."
        : "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`,
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the user",
      error: err.message,
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update user status",
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
    }

    // Prevent deactivating self
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (err) {
    console.error("Error toggling user status:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating user status",
      error: err.message,
    });
  }
};

export const getPendingVerificationRequests = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      designation = "",
      isActive = "",
    } = req.query;

    const query = {
      _id: { $ne: req.user._id }, // Don't show own profile
      isActive: true,
      role: { $ne: "admin" }, // Don't show admin users
      $or: [
        { "pendingVerification.pan.status": "pending" },
        { "pendingVerification.aadhaar.status": "pending" },
        { "pendingVerification.bank.status": "pending" },
      ],
    };

    // Search
    if (search) {
      const regex = new RegExp(search, "i");

      query.$and = [
        {
          $or: [
            { employeeId: regex },
            { name: regex },
            { email: regex },
            { mobile: regex },
            { alternateMobile: regex },
            { designation: regex },
          ],
        },
      ];
    }

    if (department) query.department = department;
    if (designation) query.designation = designation;

    if (isActive !== "") {
      query.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [
      users,
      total,
      totalEmployees,
      submittedCount,
      notSubmittedUsers,
      pendingUsers,
      approvedUsers
    ] = await Promise.all([
      // Existing queries...
      User.find(query)
        .populate("createdBy", "name role")
        .select(`
      employeeId
      name
      email
      mobile
      department
      designation
      role
      isActive
      createdBy
      pendingVerification
    `)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      User.countDocuments(query),

      User.countDocuments({
        _id: { $ne: req.user._id },
        role: { $ne: "admin" },
        isActive: true,
      }),

      User.countDocuments({
        _id: { $ne: req.user._id },
        role: { $ne: "admin" },
        isActive: true,
        $or: [
          { "pendingVerification.pan.number": { $exists: true, $ne: null } },
          { "pendingVerification.aadhaar.number": { $exists: true, $ne: null } },
          { "pendingVerification.bank.accountNumber": { $exists: true, $ne: null } },
        ],
      }),

      // Users who haven't submitted anything
      User.find({
        _id: { $ne: req.user._id },
        role: { $ne: "admin" },
        isActive: true,
        $and: [
          {
            $or: [
              { "pendingVerification.pan.number": null },
              { "pendingVerification.pan.number": { $exists: false } },
            ],
          },
          {
            $or: [
              { "pendingVerification.aadhaar.number": null },
              { "pendingVerification.aadhaar.number": { $exists: false } },
            ],
          },
          {
            $or: [
              { "pendingVerification.bank.accountNumber": null },
              { "pendingVerification.bank.accountNumber": { $exists: false } },
            ],
          },
        ],
      })
        .select("name profilePhoto role designation department mobile alternateMobile email")
        .lean(),

      // Users having at least one pending verification
      User.find({
        _id: { $ne: req.user._id },
        role: { $ne: "admin" },
        isActive: true,
        $or: [
          { "pendingVerification.pan.status": "pending" },
          { "pendingVerification.aadhaar.status": "pending" },
          { "pendingVerification.bank.status": "pending" },
        ],
      })
        .select(
          "name profilePhoto role designation department pendingVerification"
        )
        .lean(),

      // Users whose KYC has been approved
      User.find({
        _id: { $ne: req.user._id },
        role: { $ne: "admin" },
        isActive: true,
        $or: [
          { "pendingVerification.pan.status": "approved" },
          { "pendingVerification.aadhaar.status": "approved" },
          { "pendingVerification.bank.status": "approved" },
        ],
      })
        .select(
          "name profilePhoto role designation department pendingVerification"
        )
        .lean(),
    ]);

    const formattedPendingUsers = pendingUsers.map((user) => {
      const pendingTypes = [];

      if (user.pendingVerification?.pan?.status === "pending") {
        pendingTypes.push("PAN");
      }

      if (user.pendingVerification?.aadhaar?.status === "pending") {
        pendingTypes.push("Aadhaar");
      }

      if (user.pendingVerification?.bank?.status === "pending") {
        pendingTypes.push("Bank");
      }

      return {
        _id: user._id,
        name: user.name,
        profilePhoto: user.profilePhoto,
        role: user.role,
        designation: user.designation,
        department: user.department,
        pendingTypes,
        pendingCount: pendingTypes.length,
      };
    });

    const formattedApprovedUsers = approvedUsers.map((user) => {
      const approvedTypes = [];

      if (user.pendingVerification?.pan?.status === "approved") {
        approvedTypes.push("PAN");
      }

      if (user.pendingVerification?.aadhaar?.status === "approved") {
        approvedTypes.push("Aadhaar");
      }

      if (user.pendingVerification?.bank?.status === "approved") {
        approvedTypes.push("Bank");
      }

      return {
        _id: user._id,
        name: user.name,
        profilePhoto: user.profilePhoto,
        role: user.role,
        designation: user.designation,
        department: user.department,
        approvedTypes,
        approvedCount: approvedTypes.length,
      };
    });

    const data = users.map((user) => {
      const pendingTypes = [];

      if (user.pendingVerification?.pan?.status === "pending") {
        pendingTypes.push("pan");
      }

      if (user.pendingVerification?.aadhaar?.status === "pending") {
        pendingTypes.push("aadhaar");
      }

      if (user.pendingVerification?.bank?.status === "pending") {
        pendingTypes.push("bank");
      }

      return {
        _id: user._id.toString(),
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        department: user.department,
        designation: user.designation,
        role: user.role,
        isActive: user.isActive,
        createdBy: user.createdBy,
        pendingTypes,
        pendingVerification: user.pendingVerification,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Pending verification requests fetched successfully",
      summary: {
        totalEmployees,
        submittedCount,

        pendingCount: formattedPendingUsers.length,
        approvedCount: formattedApprovedUsers.length,
        notSubmittedCount: totalEmployees - submittedCount,

        // pendingUsers: formattedPendingUsers,
        approvedUsers: formattedApprovedUsers,
        notSubmittedUsers,
      },

      users: data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching pending verification requests:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching pending verification requests",
      error: error.message,
    });
  }
};

export const reviewPendingVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, action, reason } = req.body; // field: "pan" | "aadhaar" | "bank", action: "approve" | "reject"

    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and HR can review verification submissions",
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(403).json({
        success: false,
        message: "You cannot review your own submission",
      });
    }

    if (!["pan", "aadhaar", "bank"].includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid field" });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    if (action === "reject" && !reason?.trim()) {
      return res.status(400).json({ success: false, message: "A rejection reason is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.user.role === "hr" && user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "HR is not allowed to review admin accounts",
      });
    }

    const pending = user.pendingVerification?.[field];
    if (!pending || pending.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `No pending ${field} submission to review`,
      });
    }

    const setData = {};

    if (action === "approve") {
      // ── Proactive duplicate check, BEFORE attempting the write ──
      if (field === "pan") {
        const dup = await User.findOne({ pan: pending.number, _id: { $ne: id } }).select("_id");
        if (dup) {
          return res.status(400).json({
            success: false,
            message: `Approval failed — another user already has this pan`,
          });
        }
      }
      if (field === "aadhaar") {
        const dup = await User.findOne({ aadhaar: pending.number, _id: { $ne: id } }).select("_id");
        if (dup) {
          return res.status(400).json({
            success: false,
            message: `Approval failed — another user already has this aadhaar`,
          });
        }
      }

      if (field === "pan") {
        setData.pan = pending.number;
        setData.panFile = pending.file;
        setData.isPanVerified = true;
        setData.panVerifiedBy = req.user._id;
        setData.panVerifiedAt = new Date();
      } else if (field === "aadhaar") {
        setData.aadhaar = pending.number;
        setData.aadhaarFile = pending.file;
        setData.isAadhaarVerified = true;
        setData.aadhaarVerifiedBy = req.user._id;
        setData.aadhaarVerifiedAt = new Date();
      } else {
        setData.bankDetails = {
          accountNumber: pending.accountNumber,
          ifsc: pending.ifsc,
          bankName: pending.bankName,
          cancelledChequeFile: pending.cancelledChequeFile,
          passbookFile: pending.passbookFile,
        };
        setData.isBankVerified = true;
        setData.bankVerifiedBy = req.user._id;
        setData.bankVerifiedAt = new Date();
      }
      setData[`pendingVerification.${field}.status`] = "approved";
      setData[`pendingVerification.${field}.reviewedAt`] = new Date();
      setData[`pendingVerification.${field}.reviewedBy`] = req.user._id;
      setData[`pendingVerification.${field}.rejectionReason`] = null;
    } else {
      setData[`pendingVerification.${field}.status`] = "rejected";
      setData[`pendingVerification.${field}.reviewedAt`] = new Date();
      setData[`pendingVerification.${field}.reviewedBy`] = req.user._id;
      setData[`pendingVerification.${field}.rejectionReason`] = reason.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(id, { $set: setData }, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    return res.status(200).json({
      success: true,
      message: `${field} submission ${action === "approve" ? "approved" : "rejected"}`,
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error reviewing verification:", err);

    // Fallback safety net only — the proactive check above should catch this first
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Approval failed — another user already has this ${dupField}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while reviewing submission",
      error: err.message,
    });
  }
};

export const reviewAllPendingVerification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and HR can review verification submissions",
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(403).json({
        success: false,
        message: "You cannot review your own submission",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.user.role === "hr" && user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "HR is not allowed to review admin accounts",
      });
    }

    const pv = user.pendingVerification || {};
    const pendingFields = ["pan", "aadhaar", "bank"].filter((f) => pv[f]?.status === "pending");

    if (pendingFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No pending submissions to review",
      });
    }

    const setData = {};
    const results = {}; // field -> { status: "approved" | "skipped", message? }

    for (const field of pendingFields) {
      const pending = pv[field];

      if (field === "pan") {
        const dup = await User.findOne({ pan: pending.number, _id: { $ne: id } }).select("_id");
        if (dup) {
          results.pan = {
            status: "skipped",
            message: "Approval failed — another user already has this pan",
          };
          continue;
        }
        setData.pan = pending.number;
        setData.panFile = pending.file;
        setData.isPanVerified = true;
        setData.panVerifiedBy = req.user._id;
        setData.panVerifiedAt = new Date();
        setData["pendingVerification.pan.status"] = "approved";
        setData["pendingVerification.pan.reviewedAt"] = new Date();
        setData["pendingVerification.pan.reviewedBy"] = req.user._id;
        setData["pendingVerification.pan.rejectionReason"] = null;
        results.pan = { status: "approved" };
      }

      if (field === "aadhaar") {
        const dup = await User.findOne({ aadhaar: pending.number, _id: { $ne: id } }).select("_id");
        if (dup) {
          results.aadhaar = {
            status: "skipped",
            message: "Approval failed — another user already has this aadhaar",
          };
          continue;
        }
        setData.aadhaar = pending.number;
        setData.aadhaarFile = pending.file;
        setData.isAadhaarVerified = true;
        setData.aadhaarVerifiedBy = req.user._id;
        setData.aadhaarVerifiedAt = new Date();
        setData["pendingVerification.aadhaar.status"] = "approved";
        setData["pendingVerification.aadhaar.reviewedAt"] = new Date();
        setData["pendingVerification.aadhaar.reviewedBy"] = req.user._id;
        setData["pendingVerification.aadhaar.rejectionReason"] = null;
        results.aadhaar = { status: "approved" };
      }

      if (field === "bank") {
        // No unique constraint on bank fields in the schema today, so this
        // can't conflict the same way — approved unconditionally.
        setData.bankDetails = {
          accountNumber: pending.accountNumber,
          ifsc: pending.ifsc,
          bankName: pending.bankName,
          cancelledChequeFile: pending.cancelledChequeFile,
          passbookFile: pending.passbookFile,
        };
        setData.isBankVerified = true;
        setData.bankVerifiedBy = req.user._id;
        setData.bankVerifiedAt = new Date();
        setData["pendingVerification.bank.status"] = "approved";
        setData["pendingVerification.bank.reviewedAt"] = new Date();
        setData["pendingVerification.bank.reviewedBy"] = req.user._id;
        setData["pendingVerification.bank.rejectionReason"] = null;
        results.bank = { status: "approved" };
      }
    }

    const approvedCount = Object.values(results).filter((r) => r.status === "approved").length;

    if (approvedCount === 0) {
      // Everything conflicted — nothing to write, all fields stay pending untouched
      return res.status(400).json({
        success: false,
        message: "All pending submissions failed — duplicate values found for every field",
        results,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { $set: setData }, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    const skippedCount = pendingFields.length - approvedCount;

    return res.status(200).json({
      success: true,
      message:
        skippedCount > 0
          ? `${approvedCount} field(s) approved, ${skippedCount} skipped due to duplicates`
          : "All pending fields approved",
      results,
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error approving all verifications:", err);

    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Approval failed — another user already has this ${dupField}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while approving submissions",
      error: err.message,
    });
  }
};

export const getWebsiteContacts = async (req, res) => {
  try {
    const user = req.user

    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin can view website contacts.",
      });
    }

    const {
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};

    // Search
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
        { service: { $regex: search.trim(), $options: "i" } },
        { budget: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Get total count
    const total = await WebsiteContact.countDocuments(query);

    // Get paginated contacts
    const contacts = await WebsiteContact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    return res.status(200).json({
      success: true,
      contacts,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    console.error("Error fetching website contacts:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching website contacts",
      error: err.message,
    });
  }
};

export const getWebsiteTraining = async (req, res) => {
  try {
    const user = req.user;

    // Only Admin and HR can view training enquiries
    const isAdminAndHr =
      user?.role === "admin" || user?.role === "hr";

    if (!isAdminAndHr) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can view training enquiries.",
      });
    }

    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      category = "",
      subCategory = "",
      experience = "",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};

    // =========================================================
    // SEARCH
    // =========================================================

    if (search.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { category: searchRegex },
        { subCategory: searchRegex },
        { experience: searchRegex },
        { about: searchRegex },
      ];
    }

    // =========================================================
    // FILTERS
    // =========================================================

    if (status.trim()) {
      query.status = status.trim();
    }

    if (category.trim()) {
      query.category = {
        $regex: category.trim(),
        $options: "i",
      };
    }

    if (subCategory.trim()) {
      query.subCategory = {
        $regex: subCategory.trim(),
        $options: "i",
      };
    }

    if (experience.trim()) {
      query.experience = experience.trim();
    }

    // =========================================================
    // TOTAL
    // =========================================================

    const total = await TrainingEnquiry.countDocuments(query);

    // =========================================================
    // PAGINATED DATA
    // =========================================================

    const enquiries = await TrainingEnquiry.find(query)
      .populate("assignedTo", "name email role employeeId")
      .populate("reviewedBy", "name email role employeeId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,
      enquiries,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    console.error("Error fetching website training enquiries:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching website training enquiries",
      error: err.message,
    });
  }
};

export const createCareerPost = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can create career posts.",
      });
    }

    let {
      title,
      opportunityType,
      internshipType,
      category,
      subCategory,
      description,
      responsibilities,
      requirements,
      skills,
      salary,
      duration,
      location,
      workMode,
      vacancies,
      applicationDeadline,
      isActive,
      status,
    } = req.body;

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================

    const requiredFields = {
      title,
      opportunityType,
      category,
      subCategory,
      description,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => {
        return value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim());
      })
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // =====================================================
    // OPPORTUNITY TYPE
    // =====================================================

    if (!["job", "internship"].includes(opportunityType)) {
      return res.status(400).json({
        success: false,
        message: "Opportunity type must be either job or internship.",
      });
    }

    // =====================================================
    // INTERNSHIP VALIDATION
    // =====================================================

    if (opportunityType === "internship") {
      if (!["paid", "unpaid"].includes(internshipType)) {
        return res.status(400).json({
          success: false,
          message:
            "Internship type is required and must be either paid or unpaid.",
        });
      }
    }

    // =====================================================
    // PARSE ARRAYS
    // =====================================================

    const parseArray = (value) => {
      if (!value) return [];

      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);

          if (Array.isArray(parsed)) {
            return parsed;
          }

          return [value];
        } catch {
          return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }

      return [];
    };

    responsibilities = parseArray(responsibilities);
    requirements = parseArray(requirements);
    skills = parseArray(skills);

    // =====================================================
    // PARSE SALARY
    // =====================================================

    let parsedSalary = {
      min: null,
      max: null,
      currency: "INR",
      period: "monthly",
      displayText: "",
    };

    if (salary) {
      try {
        parsedSalary =
          typeof salary === "string"
            ? JSON.parse(salary)
            : salary;
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid salary format.",
        });
      }
    }

    // Salary only applies to jobs
    if (opportunityType === "internship") {
      parsedSalary = {
        min: null,
        max: null,
        currency: "INR",
        period: "monthly",
        displayText: "",
      };
    }

    // =====================================================
    // PARSE DURATION
    // =====================================================

    let parsedDuration = {
      value: null,
      unit: "months",
    };

    if (duration) {
      try {
        parsedDuration =
          typeof duration === "string"
            ? JSON.parse(duration)
            : duration;
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid duration format.",
        });
      }
    }

    // =====================================================
    // VACANCIES
    // =====================================================

    const parsedVacancies =
      vacancies !== undefined
        ? Number(vacancies)
        : 1;

    if (
      !Number.isInteger(parsedVacancies) ||
      parsedVacancies < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Vacancies must be a positive integer.",
      });
    }

    // =====================================================
    // DEADLINE
    // =====================================================

    let parsedDeadline = null;

    if (applicationDeadline) {
      parsedDeadline = new Date(applicationDeadline);

      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid application deadline.",
        });
      }
    }

    // =====================================================
    // STATUS
    // =====================================================

    const finalStatus = status || "draft";

    if (
      ![
        "draft",
        "published",
        "closed",
        "archived",
      ].includes(finalStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid career post status.",
      });
    }

    // =====================================================
    // CREATE
    // =====================================================

    const careerPost = await CareerPost.create({
      title: title.trim(),

      opportunityType,

      internshipType:
        opportunityType === "internship"
          ? internshipType
          : undefined,

      category: category.trim(),
      subCategory: subCategory.trim(),

      description: description.trim(),

      responsibilities,
      requirements,
      skills,

      salary: parsedSalary,

      duration: parsedDuration,

      location: location?.trim() || "Remote",

      workMode: workMode || "onsite",

      vacancies: parsedVacancies,

      applicationDeadline: parsedDeadline,

      isActive:
        typeof isActive === "boolean"
          ? isActive
          : true,

      status: finalStatus,

      publishedAt:
        finalStatus === "published"
          ? new Date()
          : null,

      createdBy: user._id || user.id,

      updatedBy: null,
    });

    return res.status(201).json({
      success: true,
      message: "Career post created successfully.",
      careerPost,
    });

  } catch (error) {
    console.error("Create Career Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create career post.",
      error: error.message,
    });
  }
};

export const updateCareerPost = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can update career posts.",
      });
    }

    const { id } = req.params;

    const careerPost = await CareerPost.findById(id);

    if (!careerPost) {
      return res.status(404).json({
        success: false,
        message: "Career post not found.",
      });
    }

    let {
      title,
      opportunityType,
      internshipType,
      category,
      subCategory,
      description,
      responsibilities,
      requirements,
      skills,
      salary,
      duration,
      location,
      workMode,
      vacancies,
      applicationDeadline,
      isActive,
      status,
    } = req.body;

    // =====================================================
    // PARSE ARRAYS
    // =====================================================

    const parseArray = (value, fallback) => {
      if (value === undefined) return fallback;

      if (Array.isArray(value)) return value;

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);

          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch { }

        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return fallback;
    };

    // =====================================================
    // OPPORTUNITY TYPE
    // =====================================================

    const finalOpportunityType =
      opportunityType || careerPost.opportunityType;

    if (!["job", "internship"].includes(finalOpportunityType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity type.",
      });
    }

    if (finalOpportunityType === "internship") {
      const finalInternshipType =
        internshipType || careerPost.internshipType;

      if (!["paid", "unpaid"].includes(finalInternshipType)) {
        return res.status(400).json({
          success: false,
          message: "Internship type must be paid or unpaid.",
        });
      }
    }

    // =====================================================
    // UPDATE
    // =====================================================

    careerPost.title =
      title?.trim() || careerPost.title;

    careerPost.opportunityType =
      finalOpportunityType;

    careerPost.internshipType =
      finalOpportunityType === "internship"
        ? internshipType || careerPost.internshipType
        : undefined;

    careerPost.category =
      category?.trim() || careerPost.category;

    careerPost.subCategory =
      subCategory?.trim() || careerPost.subCategory;

    careerPost.description =
      description?.trim() || careerPost.description;

    careerPost.responsibilities =
      parseArray(
        responsibilities,
        careerPost.responsibilities
      );

    careerPost.requirements =
      parseArray(
        requirements,
        careerPost.requirements
      );

    careerPost.skills =
      parseArray(
        skills,
        careerPost.skills
      );

    if (salary !== undefined) {
      careerPost.salary =
        typeof salary === "string"
          ? JSON.parse(salary)
          : salary;
    }

    if (duration !== undefined) {
      careerPost.duration =
        typeof duration === "string"
          ? JSON.parse(duration)
          : duration;
    }

    if (location !== undefined) {
      careerPost.location = location.trim();
    }

    if (workMode !== undefined) {
      careerPost.workMode = workMode;
    }

    if (vacancies !== undefined) {
      const parsedVacancies = Number(vacancies);

      if (
        !Number.isInteger(parsedVacancies) ||
        parsedVacancies < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Vacancies must be a positive integer.",
        });
      }

      careerPost.vacancies = parsedVacancies;
    }

    if (applicationDeadline !== undefined) {
      careerPost.applicationDeadline =
        applicationDeadline
          ? new Date(applicationDeadline)
          : null;
    }

    if (isActive !== undefined) {
      careerPost.isActive =
        isActive === true ||
        isActive === "true";
    }

    // =====================================================
    // STATUS
    // =====================================================

    if (status !== undefined) {
      if (
        ![
          "draft",
          "published",
          "closed",
          "archived",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid career post status.",
        });
      }

      careerPost.status = status;

      if (
        status === "published" &&
        !careerPost.publishedAt
      ) {
        careerPost.publishedAt = new Date();
      }

      if (
        status === "closed" &&
        !careerPost.closedAt
      ) {
        careerPost.closedAt = new Date();
      }
    }

    careerPost.updatedBy = user._id || user.id;

    await careerPost.save();

    return res.status(200).json({
      success: true,
      message: "Career post updated successfully.",
      careerPost,
    });

  } catch (error) {
    console.error("Update Career Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update career post.",
      error: error.message,
    });
  }
};

export const closeCareerPost = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const { id } = req.params;

    const careerPost = await CareerPost.findById(id);

    if (!careerPost) {
      return res.status(404).json({
        success: false,
        message: "Career post not found.",
      });
    }

    careerPost.status = "closed";
    careerPost.isActive = false;
    careerPost.closedAt = new Date();
    careerPost.updatedBy = user._id || user.id;

    await careerPost.save();

    return res.status(200).json({
      success: true,
      message: "Career post closed successfully.",
      careerPost,
    });

  } catch (error) {
    console.error("Close Career Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to close career post.",
      error: error.message,
    });
  }
};

export const getAllCareerPosts = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can view career posts.",
      });
    }

    const {
      page = 1,
      limit = 10,
      search = "",
      opportunityType = "",
      category = "",
      status = "",
      isActive,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};

    // =====================================================
    // SEARCH
    // =====================================================

    if (search.trim()) {
      query.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          category: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          subCategory: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // =====================================================
    // FILTERS
    // =====================================================

    if (
      opportunityType &&
      ["job", "internship"].includes(opportunityType)
    ) {
      query.opportunityType = opportunityType;
    }

    if (category.trim()) {
      query.category = {
        $regex: category.trim(),
        $options: "i",
      };
    }

    if (
      status &&
      ["draft", "published", "closed", "archived"].includes(status)
    ) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // =====================================================
    // COUNT
    // =====================================================

    const total = await CareerPost.countDocuments(query);

    // =====================================================
    // FETCH
    // =====================================================

    const careerPosts = await CareerPost.find(query)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    return res.status(200).json({
      success: true,
      careerPosts,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });

  } catch (error) {
    console.error("Get Career Posts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch career posts.",
      error: error.message,
    });
  }
};

export const getWebsiteOpportunities = async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 10,
      search = "",
      category = "",
      subCategory = "",
      status = "",
      opportunityType = "",
      internshipType = "",
    } = req.query;

    // =========================================================
    // VALIDATE TYPE
    // =========================================================

    const normalizedType = type?.trim().toLowerCase();

    if (
      !normalizedType ||
      !["training", "career", "internship"].includes(normalizedType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid type. Type must be 'training', 'career', or 'internship'.",
      });
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const searchValue = search.trim();

    // =========================================================
    // TRAINING
    // =========================================================

    if (normalizedType === "training") {
      const query = {};

      // Search
      if (searchValue) {
        const searchRegex = {
          $regex: searchValue,
          $options: "i",
        };

        query.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex },
          { experience: searchRegex },
          { about: searchRegex },
        ];
      }

      // Category
      if (category.trim()) {
        query.category = {
          $regex: category.trim(),
          $options: "i",
        };
      }

      // Sub Category
      if (subCategory.trim()) {
        query.subCategory = {
          $regex: subCategory.trim(),
          $options: "i",
        };
      }

      // Experience
      if (req.query.experience?.trim()) {
        query.experience = req.query.experience.trim();
      }

      // Status
      if (status.trim()) {
        query.status = status.trim();
      }

      const total = await TrainingEnquiry.countDocuments(query);

      const data = await TrainingEnquiry.find(query)
        .populate("assignedTo", "name email role employeeId")
        .populate("reviewedBy", "name email role employeeId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      return res.status(200).json({
        success: true,
        type: "training",
        data,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    }

    // =========================================================
    // CAREER / INTERNSHIP
    // =========================================================

    if (
      normalizedType === "career" ||
      normalizedType === "internship"
    ) {
      const query = {};

      // -------------------------------------------------------
      // Search
      // -------------------------------------------------------

      if (searchValue) {
        const searchRegex = {
          $regex: searchValue,
          $options: "i",
        };

        query.$or = [
          { title: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
        ];
      }

      // -------------------------------------------------------
      // Opportunity Type
      // -------------------------------------------------------


      if (normalizedType === "internship") {
        query.opportunityType = "internship";
      } else if (normalizedType === "career") {
        query.opportunityType = "job";
      }

      // -------------------------------------------------------
      // Internship Type
      // paid / unpaid
      // -------------------------------------------------------

      if (
        internshipType.trim() &&
        ["paid", "unpaid"].includes(
          internshipType.trim().toLowerCase()
        )
      ) {
        query.internshipType =
          internshipType.trim().toLowerCase();
      }

      // -------------------------------------------------------
      // Category
      // -------------------------------------------------------

      if (category.trim()) {
        query.category = {
          $regex: category.trim(),
          $options: "i",
        };
      }

      // -------------------------------------------------------
      // Sub Category
      // -------------------------------------------------------

      if (subCategory.trim()) {
        query.subCategory = {
          $regex: subCategory.trim(),
          $options: "i",
        };
      }

      // -------------------------------------------------------
      // Status
      // -------------------------------------------------------

      if (status.trim()) {
        query.status = status.trim();
      }

      // -------------------------------------------------------
      // Fetch
      // -------------------------------------------------------

      const total = await CareerPost.countDocuments(query);

      const data = await CareerPost.find(query)
        .populate("createdBy", "name email role employeeId")
        .populate("updatedBy", "name email role employeeId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      return res.status(200).json({
        success: true,
        type: normalizedType,
        data,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    }
  } catch (error) {
    console.error("Get Website Opportunities Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch website opportunities.",
      error: error.message,
    });
  }
};

export const getCareerPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // =========================================================
    // Validate Career Post ID
    // =========================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid career post ID.",
      });
    }

    // =========================================================
    // Get Career Post
    // =========================================================

    const careerPost = await CareerPost.findById(id)
      .populate("createdBy", "name email role employeeId")
      .populate("updatedBy", "name email role employeeId")
      .lean();

    if (!careerPost) {
      return res.status(404).json({
        success: false,
        message: "Career post not found.",
      });
    }

    // =========================================================
    // Get Applications
    // =========================================================

    const careerApplications = await CareerApplication.find({
      careerPost: id,
    })
      .populate("assignedTo", "name email role employeeId")
      .populate("reviewedBy", "name email role employeeId")
      .sort({ createdAt: -1 })
      .lean();

    // =========================================================
    // Response
    // =========================================================

    return res.status(200).json({
      success: true,
      data: {
        careerPost,
        applications: careerApplications,
        totalApplications: careerApplications.length,
      },
    });
  } catch (error) {
    console.error("Get Career Post By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch career post.",
      error: error.message,
    });
  }
};

export const updateCareerApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "" } = req.body;

    // =========================================================
    // 1. Validate Application ID
    // =========================================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    // =========================================================
    // 2. Validate Status
    // =========================================================

    const allowedStatuses = [
      "new",
      "reviewing",
      "shortlisted",
      "interview",
      "selected",
      "rejected",
      "withdrawn",
    ];

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses are: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    // =========================================================
    // 3. Find Application
    // =========================================================

    const application = await CareerApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Career application not found",
      });
    }

    // =========================================================
    // 4. Check Current Status
    // =========================================================

    if (application.status === status) {
      return res.status(400).json({
        success: false,
        message: `Application is already '${status}'`,
      });
    }

    // =========================================================
    // 5. Get Logged-in User
    // =========================================================

    const changedBy = req.user?._id || req.user?.id || null;

    // =========================================================
    // 6. Add Status History
    // =========================================================

    application.statusHistory.push({
      status,
      changedBy,
      changedAt: new Date(),
      note: typeof note === "string" ? note.trim() : "",
    });

    // =========================================================
    // 7. Save
    // =========================================================

    await application.save();

    // =========================================================
    // 8. Populate Updated Application
    // =========================================================

    const updatedApplication = await CareerApplication.findById(id)
      .populate(
        "careerPost",
        "title opportunityType category subCategory location workMode"
      )
      .populate("assignedTo", "name email role employeeId")
      .populate("reviewedBy", "name email role employeeId")
      .populate(
        "statusHistory.changedBy",
        "name email role employeeId"
      )
      .lean();

    // =========================================================
    // 9. Response
    // =========================================================

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Update Career Application Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update application status",
      error: error.message,
    });
  }
};

export const createClientInvoiceNumber = async (req, res) => {
  try {
    // ------------------------------------------------------
    // ADMIN CHECK
    // ------------------------------------------------------

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    // ------------------------------------------------------
    // REQUEST BODY
    // ------------------------------------------------------

    const {
      type,
      service,
      serial,
      invoiceDate,
      invoiceDueDate,
    } = req.body;

    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Invoice type is required.",
      });
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "Service is required.",
      });
    }

    if (!serial) {
      return res.status(400).json({
        success: false,
        message: "Serial is required.",
      });
    }

    if (!invoiceDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice date is required.",
      });
    }

    // ------------------------------------------------------
    // VALIDATE SERIAL
    // ------------------------------------------------------

    const serialNumber = Number(serial);

    if (
      !Number.isInteger(serialNumber) ||
      serialNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Serial must be a valid positive number.",
      });
    }

    // ------------------------------------------------------
    // VALIDATE DATE
    // ------------------------------------------------------

    const parsedInvoiceDate = new Date(invoiceDate);

    if (Number.isNaN(parsedInvoiceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date.",
      });
    }

    let parsedDueDate = null;

    if (invoiceDueDate) {
      parsedDueDate = new Date(invoiceDueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice due date.",
        });
      }
    }

    // ------------------------------------------------------
    // GET CODES
    // ------------------------------------------------------

    const typeCode = getTypeCode(type);
    const serviceCode = getServiceCode(service);

    // ------------------------------------------------------
    // GENERATE FULL INVOICE NUMBER
    // ------------------------------------------------------

    const invoiceNumber = generateInvoiceNumber({
      type: typeCode,
      service: serviceCode,
      invoiceDate: parsedInvoiceDate,
      serial: serialNumber,
    });

    // ------------------------------------------------------
    // CHECK IF SAME INVOICE ALREADY EXISTS
    // ------------------------------------------------------

    const existingInvoice = await ClientInvoice.findOne({
      $or: [
        {
          invoiceNumber,
        },
        {
          type: typeCode,
          service: serviceCode,
          serial: String(serialNumber),
        },
      ],
    }).lean();

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "This invoice already exists.",
        data: {
          invoiceNumber: existingInvoice.invoiceNumber,
        },
      });
    }

    // ------------------------------------------------------
    // CREATE INVOICE
    // ------------------------------------------------------

    const invoice = await ClientInvoice.create({
      type: typeCode,
      service: serviceCode,
      serial: String(serialNumber),
      invoiceNumber,
      invoiceDate: parsedInvoiceDate,
      invoiceDueDate: parsedDueDate,
    });

    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Client invoice created successfully.",
      data: {
        id: invoice._id,
        type: invoice.type,
        service: invoice.service,
        serial: invoice.serial,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceDueDate: invoice.invoiceDueDate,
        createdAt: invoice.createdAt,
      },
    });
  } catch (err) {
    // ------------------------------------------------------
    // DUPLICATE KEY ERROR
    // ------------------------------------------------------

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This invoice already exists.",
        error: "Duplicate invoice number or serial.",
      });
    }

    console.error("Error create client invoice number:", err);

    return res.status(500).json({
      success: false,
      message: "Server error during create client invoice number.",
      error: err.message,
    });
  }
};

export const getClientInvoiceNumber = async (req, res) => {
  try {
    // ------------------------------------------------------
    // ADMIN CHECK
    // ------------------------------------------------------

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    // ------------------------------------------------------
    // QUERY PARAMS
    // ------------------------------------------------------

    const { type, service } = req.query;

    if (!type || !service) {
      return res.status(400).json({
        success: false,
        message: "type and service are required.",
      });
    }

    // ------------------------------------------------------
    // CONVERT TO CODES
    // ------------------------------------------------------

    const typeCode = getTypeCode(type);
    const serviceCode = getServiceCode(service);

    // ------------------------------------------------------
    // FIND LATEST INVOICE FOR THIS TYPE + SERVICE
    // ------------------------------------------------------

    const latestInvoice = await ClientInvoice.findOne({
      type: typeCode,
      service: serviceCode,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    // ------------------------------------------------------
    // CALCULATE NEXT SERIAL
    // ------------------------------------------------------

    let nextSerial = 1;

    if (latestInvoice) {
      const lastSerial = Number(latestInvoice.serial);

      if (!Number.isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }

    // ------------------------------------------------------
    // GENERATE PREVIEW INVOICE NUMBER
    // ------------------------------------------------------

    const invoiceDate = new Date();

    const invoiceNumber = generateInvoiceNumber({
      type: typeCode,
      service: serviceCode,
      invoiceDate,
      serial: nextSerial,
    });

    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Next client invoice number generated successfully.",
      data: {
        type: typeCode,
        service: serviceCode,
        serial: String(nextSerial),
        invoiceNumber,
      },
    });
  } catch (err) {
    console.error("Error get client invoice number:", err);

    return res.status(500).json({
      success: false,
      message: "Server error during get client invoice number.",
      error: err.message,
    });
  }
};


// ********************************************************WEBISTE API**********************************************************************

export const websiteContactUs = async (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body;

    const newContact = new WebsiteContact({
      name,
      email,
      phone,
      service,
      budget,
      message,
    });

    await newContact.save();

    // Fire-and-forget so a slow/failed mail send never blocks the API response
    Promise.allSettled([
      MailService.sendContactUsNotification(newContact),
      MailService.sendContactUsSelfNotification(newContact),
    ]).then((results) => {
      results.forEach((r) => {
        if (r.status === "rejected") {
          console.error("Contact Us mail dispatch failed:", r.reason);
        }
      });
    });

    return res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      contact: newContact,
    });
  } catch (err) {
    console.error("Error submitting website contact form:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting contact form",
      error: err.message,
    });
  }
};

export const websiteTrainingSubmit = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      experience,
      category,
      subCategory,
      duration,
      linkedinProfile,
      githubProfile,
      portfolio,
      about,
      consent,
    } = req.body || {};

    // =========================================================
    // REQUIRED FIELDS
    // =========================================================

    const requiredFields = {
      fullName,
      email,
      phone,
      experience,
      category,
      subCategory,
      duration,
      consent,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => {
        if (value === undefined || value === null) {
          return true;
        }

        if (typeof value === "string" && !value.trim()) {
          return true;
        }

        return false;
      })
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // =========================================================
    // CONSENT
    // =========================================================

    const isConsent =
      consent === true ||
      consent === "true" ||
      consent === 1 ||
      consent === "1";

    if (!isConsent) {
      return res.status(400).json({
        success: false,
        message: "You must provide consent before submitting the enquiry.",
      });
    }

    // =========================================================
    // EMAIL VALIDATION
    // =========================================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // =========================================================
    // DURATION
    // =========================================================

    let parsedDuration;

    try {
      parsedDuration =
        typeof duration === "string"
          ? JSON.parse(duration)
          : duration;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration format.",
      });
    }

    if (
      !parsedDuration ||
      parsedDuration.value === undefined ||
      parsedDuration.value === null ||
      !parsedDuration.unit
    ) {
      return res.status(400).json({
        success: false,
        message: "Training duration is required.",
      });
    }

    const durationValue = Number(parsedDuration.value);

    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Training duration must be greater than 0.",
      });
    }

    const allowedDurationUnits = [
      "days",
      "weeks",
      "months",
    ];

    if (!allowedDurationUnits.includes(parsedDuration.unit)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid duration unit. Allowed values are days, weeks, or months.",
      });
    }

    // =========================================================
    // RESUME
    // =========================================================

    let resume = {
      fileName: "",
      fileUrl: "",
      fileKey: "",
      uploadedAt: null,
    };

    const files = req.files || {};

    if (files.resume?.length) {
      const file = files.resume[0];

      // =======================================================
      // Maximum 5 MB
      // =======================================================

      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: "Resume file size must not exceed 50 MB.",
        });
      }

      // =======================================================
      // File Type Validation
      // =======================================================

      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        // Postman/browser may sometimes send this
        "application/octet-stream",
      ];

      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
      ];

      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      if (
        !allowedExtensions.includes(extension) ||
        !allowedMimeTypes.includes(file.mimetype)
      ) {
        return res.status(400).json({
          success: false,
          message: "Only PDF, DOC, and DOCX files are allowed.",
        });
      }

      // =======================================================
      // Upload to S3
      // =======================================================

      const uploaded = await uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // =======================================================
      // Get S3 File Key
      // =======================================================

      let fileKey = uploaded?.Key || "";

      // If uploadToS3 doesn't return Key,
      // extract it from the S3 URL.
      if (!fileKey && uploaded?.Location) {
        try {
          fileKey = new URL(uploaded.Location).pathname
            .replace(/^\/+/, "");
        } catch (error) {
          console.error(
            "Unable to extract S3 file key:",
            error
          );
        }
      }

      resume = {
        fileName: file.originalname,
        fileUrl: uploaded?.Location || "",
        fileKey,
        uploadedAt: new Date(),
      };
    }

    // =========================================================
    // CREATE TRAINING ENQUIRY
    // =========================================================

    const trainingEnquiry = await TrainingEnquiry.create({
      fullName: fullName.trim(),

      email: email
        .trim()
        .toLowerCase(),

      phone: phone.trim(),

      experience,

      // Always training for this API
      opportunityType: "training",

      category: category.trim(),

      subCategory: subCategory.trim(),

      duration: {
        value: durationValue,
        unit: parsedDuration.unit,
      },

      linkedinProfile:
        linkedinProfile?.trim() || "",

      githubProfile:
        githubProfile?.trim() || "",

      portfolio:
        portfolio?.trim() || "",

      about:
        about?.trim() || "",

      resume,

      consent: true,

      // =======================================================
      // Admin / HR Handling
      // =======================================================

      status: "new",

      isReviewed: false,

      notes: "",

      assignedTo: null,

      reviewedBy: null,

      reviewedAt: null,
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(201).json({
      success: true,

      message:
        "Training enquiry submitted successfully. Our team will contact you shortly.",

      enquiry: trainingEnquiry,
    });

  } catch (error) {
    console.error(
      "Website Training Submit Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to submit training enquiry.",
      error: error.message,
    });
  }
};

export const getOpportunities = async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 50,
      search = "",
      category = "",
      subCategory = "",
      status = "",
      opportunityType = "",
      internshipType = "",
    } = req.query;

    // =========================================================
    // VALIDATE TYPE
    // =========================================================

    const normalizedType = type?.trim().toLowerCase();

    if (
      !normalizedType ||
      !["training", "career", "internship"].includes(normalizedType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid type. Type must be 'training', 'career', or 'internship'.",
      });
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const searchValue = search.trim();

    // =========================================================
    // TRAINING
    // =========================================================

    if (normalizedType === "training") {
      const query = {};

      // Search
      if (searchValue) {
        const searchRegex = {
          $regex: searchValue,
          $options: "i",
        };

        query.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex },
          { experience: searchRegex },
          { about: searchRegex },
        ];
      }

      // Category
      if (category.trim()) {
        query.category = {
          $regex: category.trim(),
          $options: "i",
        };
      }

      // Sub Category
      if (subCategory.trim()) {
        query.subCategory = {
          $regex: subCategory.trim(),
          $options: "i",
        };
      }

      // Experience
      if (req.query.experience?.trim()) {
        query.experience = req.query.experience.trim();
      }

      // Status
      if (status.trim()) {
        query.status = status.trim();
      }

      const total = await TrainingEnquiry.countDocuments(query);

      const data = await TrainingEnquiry.find(query)
        .populate("assignedTo", "name email role employeeId")
        .populate("reviewedBy", "name email role employeeId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      return res.status(200).json({
        success: true,
        type: "training",
        data,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    }

    // =========================================================
    // CAREER / INTERNSHIP
    // =========================================================

    if (
      normalizedType === "career" ||
      normalizedType === "internship"
    ) {
      const query = {};

      // -------------------------------------------------------
      // Search
      // -------------------------------------------------------

      if (searchValue) {
        const searchRegex = {
          $regex: searchValue,
          $options: "i",
        };

        query.$or = [
          { title: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
        ];
      }

      // -------------------------------------------------------
      // Opportunity Type
      // -------------------------------------------------------


      if (normalizedType === "internship") {
        query.opportunityType = "internship";
      } else if (normalizedType === "career") {
        query.opportunityType = "job";
      }

      // -------------------------------------------------------
      // Internship Type
      // paid / unpaid
      // -------------------------------------------------------

      if (
        internshipType.trim() &&
        ["paid", "unpaid"].includes(
          internshipType.trim().toLowerCase()
        )
      ) {
        query.internshipType =
          internshipType.trim().toLowerCase();
      }

      // -------------------------------------------------------
      // Category
      // -------------------------------------------------------

      if (category.trim()) {
        query.category = {
          $regex: category.trim(),
          $options: "i",
        };
      }

      // -------------------------------------------------------
      // Sub Category
      // -------------------------------------------------------

      if (subCategory.trim()) {
        query.subCategory = {
          $regex: subCategory.trim(),
          $options: "i",
        };
      }

      // -------------------------------------------------------
      // Status
      // -------------------------------------------------------

      if (status.trim()) {
        query.status = status.trim();
      }

      // -------------------------------------------------------
      // Fetch
      // -------------------------------------------------------

      const total = await CareerPost.countDocuments(query);

      const data = await CareerPost.find(query)
        .select(
          "title opportunityType internshipType category subCategory description salary vacancies"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      return res.status(200).json({
        success: true,
        type: normalizedType,
        data,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    }
  } catch (error) {
    console.error("Get Website Opportunities Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch website opportunities.",
      error: error.message,
    });
  }
};

export const getOpportunitiesDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // =========================================================
    // VALIDATE ID
    // =========================================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Opportunity ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity ID.",
      });
    }

    // =========================================================
    // FETCH OPPORTUNITY
    // Exclude admin/system fields
    // =========================================================

    const opportunity = await CareerPost.findById(id).select(
      "-createdBy -updatedBy -createdAt -updatedAt -__v"
    );

    // =========================================================
    // NOT FOUND
    // =========================================================

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found.",
      });
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    console.error("Get Opportunity Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch opportunity details.",
      error: error.message,
    });
  }
};

export const applyForCareer = async (req, res) => {
  try {
    const {
      careerPostId,
      fullName,
      email,
      phone,
      experience,
      pastExperience,
      linkedinProfile,
      githubProfile,
      portfolio,
      about,
      consent,
      currentLocation,
    } = req.body;

    // =========================================================
    // 1. Validate Career Post ID
    // =========================================================

    if (!careerPostId) {
      return res.status(400).json({
        success: false,
        message: "Career post ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(careerPostId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid career post ID",
      });
    }

    // =========================================================
    // 2. Validate Required Fields
    // =========================================================

    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!experience) {
      return res.status(400).json({
        success: false,
        message: "Experience is required",
      });
    }

    // =========================================================
    // 3. Validate Consent
    // =========================================================

    const hasConsent =
      consent === true ||
      consent === "true" ||
      consent === 1 ||
      consent === "1";

    if (!hasConsent) {
      return res.status(400).json({
        success: false,
        message: "Please provide consent before applying",
      });
    }

    // =========================================================
    // 4. Find Career Post
    // =========================================================

    const careerPost = await CareerPost.findById(careerPostId);

    if (!careerPost) {
      return res.status(404).json({
        success: false,
        message: "Career post not found",
      });
    }

    // =========================================================
    // 5. Check Whether Applications Are Open
    // =========================================================

    if (
      careerPost.status !== "published" ||
      careerPost.isActive !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This career opportunity is not accepting applications",
      });
    }

    // =========================================================
    // 6. Check Deadline
    // =========================================================

    if (
      careerPost.applicationDeadline &&
      new Date() > new Date(careerPost.applicationDeadline)
    ) {
      return res.status(400).json({
        success: false,
        message: "The application deadline has passed",
      });
    }

    // =========================================================
    // 7. Normalize Email
    // =========================================================

    const normalizedEmail = email.trim().toLowerCase();

    // =========================================================
    // 8. Check Duplicate Application
    // =========================================================

    const existingApplication = await CareerApplication.findOne({
      careerPost: careerPost._id,
      email: normalizedEmail,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this opportunity",
        applicationId: existingApplication._id,
      });
    }

    // =========================================================
    // 9. Parse Past Experience
    // =========================================================

    let parsedPastExperience = [];

    if (pastExperience) {
      try {
        parsedPastExperience =
          typeof pastExperience === "string"
            ? JSON.parse(pastExperience)
            : pastExperience;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid past experience format",
        });
      }
    }

    if (!Array.isArray(parsedPastExperience)) {
      return res.status(400).json({
        success: false,
        message: "Past experience must be an array",
      });
    }

    // =========================================================
    // 10. Parse Current Location
    // =========================================================

    let parsedCurrentLocation = {
      city: "",
      state: "",
      country: "",
    };

    if (currentLocation) {
      try {
        parsedCurrentLocation =
          typeof currentLocation === "string"
            ? JSON.parse(currentLocation)
            : currentLocation;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid current location format",
        });
      }
    }

    // =========================================================
    // 11. Resume Upload
    // =========================================================

    let resumeData = {
      fileName: "",
      fileUrl: "",
      fileKey: "",
      uploadedAt: null,
    };

    const resumeFile = req.files?.resume?.[0];

    if (resumeFile) {
      const uploaded = await uploadToS3(
        resumeFile.buffer,
        resumeFile.originalname,
        resumeFile.mimetype
      );

      resumeData = {
        fileName: resumeFile.originalname,
        fileUrl: uploaded.Location,
        fileKey: uploaded.Key || "",
        uploadedAt: new Date(),
      };
    }

    // =========================================================
    // 12. Create Application
    // =========================================================

    const application = await CareerApplication.create({
      careerPost: careerPost._id,

      // Applicant details
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      experience,

      // Past experience
      pastExperience: parsedPastExperience,

      // Snapshot of career post
      opportunityType: careerPost.opportunityType,
      category: careerPost.category,
      subCategory: careerPost.subCategory,

      // Profiles
      linkedinProfile: linkedinProfile?.trim() || "",
      githubProfile: githubProfile?.trim() || "",
      portfolio: portfolio?.trim() || "",
      about: about?.trim() || "",

      // Resume
      resume: resumeData,

      // Consent
      consent: true,

      // Location
      currentLocation: {
        city: parsedCurrentLocation.city?.trim() || "",
        state: parsedCurrentLocation.state?.trim() || "",
        country: parsedCurrentLocation.country?.trim() || "",
      },

      // Initial status
      status: "new",

      statusHistory: [
        {
          status: "new",
          changedBy: null,
          changedAt: new Date(),
          note: "Application submitted",
        },
      ],
    });

    // =========================================================
    // 13. Populate Response
    // =========================================================

    const populatedApplication =
      await CareerApplication.findById(application._id)
        .populate(
          "careerPost",
          "title opportunityType category subCategory location workMode"
        )
        .lean();

    // =========================================================
    // 14. Success
    // =========================================================

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: populatedApplication,
    });
  } catch (error) {
    console.error("Apply Career Error:", error);

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this opportunity",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error.message,
    });
  }
};