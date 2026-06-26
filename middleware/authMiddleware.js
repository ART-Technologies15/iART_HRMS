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
    req.user = await User.findById(decoded.id).select("-passwordHash");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found or token invalid",
      });
    }

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
      error: err.message,
    });
  }
};
