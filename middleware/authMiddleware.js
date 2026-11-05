// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/Users.js";

export const protect = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or token invalid",
      });
    }

    // Check account active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator.",
      });
    }

    req.user = user
    
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
      error: err.message,
    });
  }
};

export const protectAdminHr = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or token invalid",
      });
    }

    // Check account active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator.",
      });
    }

    // Allow only Admin and HR
    if (!["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin and HR can access this resource.",
      });
    }

    req.user = user;

    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
      error: err.message,
    });
  }
};