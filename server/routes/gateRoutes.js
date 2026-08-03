import express from "express";
import {
  getGateDetails,
  verifyGate,
  getRecentLogs,
  getSecurityLogs,
} from "../controllers/gateController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Student / General Gate Routes
router.get("/details/:slug", protect, getGateDetails);
router.post("/verify", protect, verifyGate);
router.get("/history", protect, getRecentLogs);

// Security Dashboard Log Access Route
router.get("/security-logs", protect, getSecurityLogs);

export default router;