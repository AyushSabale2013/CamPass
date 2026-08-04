import express from "express";
import {
  getGateDetails,
  verifyGate,
  getRecentLogs,
  getSecurityLogs,
  getGateJunction,
  getBusLogs,
} from "../controllers/gateController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Junction — any authenticated role, decides where to send them
router.get("/junction/:slug", protect, getGateJunction);

// Student-only access
router.get("/details/:slug", protect, restrictTo("student"), getGateDetails);
router.post("/verify", protect, restrictTo("student"), verifyGate);
router.get("/history", protect, restrictTo("student"), getRecentLogs);

// Security & Admin access (handles both "security" and "security guard")
router.get(
  "/security-logs",
  protect,
  restrictTo("security", "security guard", "admin"),
  getSecurityLogs
);

// Security & Admin access for Bus Logs
router.get(
  "/bus-logs",
  protect,
  restrictTo("security", "security guard", "admin"),
  getBusLogs
);

export default router;