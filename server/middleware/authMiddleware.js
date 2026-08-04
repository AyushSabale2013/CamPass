import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    // Verify token using secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support payload variations: decoded.id, decoded._id, or decoded.userId
    const userId = decoded.id || decoded._id || decoded.userId;

    // Attach user (excluding password)
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Verification Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

/**
 * Must run AFTER protect (needs req.user already set).
 * Usage: router.get("/x", protect, restrictTo("student"), handler)
 */
export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  }

  // Normalize current user's role to lowercase
  let userRole = req.user.role.toString().trim().toLowerCase();

  // Map role variations (e.g., "security guard" -> "security")
  if (userRole === "security guard") {
    userRole = "security";
  }

  // Normalize allowed roles passed into restrictTo
  const allowedRoles = roles.map((role) => {
    const r = role.toString().trim().toLowerCase();
    return r === "security guard" ? "security" : r;
  });

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  }

  next();
};