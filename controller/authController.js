import jwt from "jsonwebtoken";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import LeaveBalance from "../models/LeaveBalance.js";
import { updateLeaveBalanceOnLogin } from "../utils/leaveBalanceUtils.js";
import { uploadToS3, deleteS3File } from "../utils/s3Upload/s3.js";

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
      joiningDate
    } = req.body;

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

    if (leaveInfo && typeof leaveInfo.balance === "number") {
      if (!isAdminOrHr) {
        return res.status(403).json({
          success: false,
          message: "Only Admins and HR can update leave balance manually",
        });
      }
      updateData.leaveInfo = { balance: leaveInfo.balance, updatedOn: new Date() };
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

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("createdBy", "name role")
        .select(
          `
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
          `
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      User.countDocuments(query),
    ]);

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