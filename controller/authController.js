import jwt from "jsonwebtoken";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import LeaveBalance from "../models/LeaveBalance.js";
import { updateLeaveBalanceOnLogin } from "../utils/leaveBalanceUtils.js";

export const register = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
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
      dateOfBirth
    } = req.body;

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

    const existingUser = await User.findOne({
      $or: [
        { email },
        { mobile },
        { alternateMobile },
        pan ? { pan } : null,
        aadhaar ? { aadhaar } : null,
      ].filter(Boolean),
    });

    if (existingUser) {
      let field = "email";
      if (existingUser.mobile === mobile) field = "mobile";
      else if (existingUser.alternateMobile === alternateMobile)
        field = "alternateMobile";
      else if (pan && existingUser.pan === pan) field = "pan";
      else if (aadhaar && existingUser.aadhaar === aadhaar) field = "aadhaar";

      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      mobile,
      alternateMobile,
      address,
      department,
      designation,
      passwordHash: hashedPassword,
      role: role || "employee",
      pan,
      aadhaar,
      bankDetails: bankDetails || undefined,
      dateOfBirth: dateOfBirth || null,
      isActive: true,
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
      expiresIn: "1d",
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

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword, bankDetails, leaveInfo, isActive, ...rest } =
      req.body;

    // 1️⃣ Access Control
    if (req.user.role !== "admin" && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile",
      });
    }

    // 2️⃣ Find User
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = { ...rest, isActive };

    // 3️⃣ Restricted fields protection for non-admin
    if (req.user.role !== "admin") {
      ["role", "department", "designation"].forEach(
        (f) => delete updateData[f]
      );
    }

    // 4️⃣ Auto-null cleanup for Aadhaar & PAN
    ["aadhaar", "pan"].forEach((field) => {
      if (field in updateData) {
        const value = String(updateData[field] || "").trim();
        if (value === "") {
          // remove the field entirely → avoids duplicate nulls
          updateData.$unset = { ...(updateData.$unset || {}), [field]: "" };
          delete updateData[field];
        }
      }
    });

    // 5️⃣ Validate formatting of Aadhaar & PAN only if non-null
    if (updateData.aadhaar) {
      if (!/^[0-9]{12}$/.test(updateData.aadhaar)) {
        return res.status(400).json({
          success: false,
          message: "Aadhaar number must be a 12-digit numeric value",
        });
      }
    }

    if (updateData.pan) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(updateData.pan)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PAN format",
        });
      }
    }

    // 6️⃣ Handle Bank Details
    if (bankDetails) {
      const bd = { ...bankDetails };

      // Convert empty to null
      Object.keys(bd).forEach((key) => {
        if (bd[key] === "") bd[key] = null;
      });

      // Validate if provided
      if (bd.accountNumber && !/^[0-9]{9,18}$/.test(bd.accountNumber)) {
        return res.status(400).json({
          success: false,
          message: "Account number must be 9-18 digits",
        });
      }

      if (bd.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bd.ifsc)) {
        return res.status(400).json({
          success: false,
          message: "Invalid IFSC code format",
        });
      }

      // Merge existing & new
      updateData.bankDetails = {
        ...(user.bankDetails?.toObject?.() || {}),
        ...bd,
      };
    }

    // 7️⃣ Password Update Logic
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      if (req.user.role === "admin") {
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
          return res.status(400).json({
            success: false,
            message: "Old password is incorrect",
          });
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
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can update leave balance manually",
        });
      }

      updateData.leaveInfo = {
        balance: leaveInfo.balance,
        updatedOn: new Date(),
      };
    }

    if (updateData.dateOfBirth) {
      const dateOfBirth = new Date(updateData.dateOfBirth);

      if (isNaN(dateOfBirth.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of birth",
        });
      }

      updateData.dateOfBirth = dateOfBirth;
    }

    // 8️⃣ Perform Update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        ...(updateData.$unset ? { $unset: updateData.$unset } : {}),
      },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);

    // Duplicate Key Error (email, mobile, pan, aadhaar, etc.)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`,
      });
    }

    // 🔟 Mongoose validation errors (regex failures, etc.)
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
// In authController.js
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