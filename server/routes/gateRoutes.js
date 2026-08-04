import express from "express";
import {
  getGateDetails,
  verifyGate,
  getRecentLogs,
  getSecurityLogs,
  getGateJunction,
} from "../controllers/gateController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Junction — any authenticated role, decides where to send them
router.get("/junction/:slug", protect, getGateJunction);

// Student-only
router.get("/details/:slug", protect, restrictTo("student"), getGateDetails);
router.post("/verify", protect, restrictTo("student"), verifyGate);
router.get("/history", protect, restrictTo("student"), getRecentLogs);

// Security-only
router.get("/security-logs", protect, restrictTo("security"), getSecurityLogs);

export default router;