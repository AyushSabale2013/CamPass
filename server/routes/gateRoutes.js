import express from "express";
import {
  getGateDetails,
  verifyGate,
  getRecentLogs,
  getSecurityLogs,
  getGateJunction,
  getBusLogs,
  submitGateRequest,
  getMyRequests,
  getPendingRequests,
  approveGateRequest,
  rejectGateRequest,
} from "../controllers/gateController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Junction — any authenticated role, decides where to send them
router.get("/junction/:slug", protect, getGateJunction);

// Student-only access
router.get("/details/:slug", protect, restrictTo("student"), getGateDetails);
router.post("/verify", protect, restrictTo("student"), verifyGate);
router.get("/history", protect, restrictTo("student"), getRecentLogs);

// Student — approval workflow
router.post("/requests", protect, restrictTo("student"), submitGateRequest);
router.get("/requests/mine", protect, restrictTo("student"), getMyRequests);

// Security & Admin — approval workflow
router.get(
  "/requests/pending",
  protect,
  restrictTo("security", "admin"),
  getPendingRequests
);
router.post(
  "/requests/:id/approve",
  protect,
  restrictTo("security", "admin"),
  approveGateRequest
);
router.post(
  "/requests/:id/reject",
  protect,
  restrictTo("security", "admin"),
  rejectGateRequest
);

// Security & Admin access
router.get(
  "/security-logs",
  protect,
  restrictTo("security", "admin"),
  getSecurityLogs
);

// Security & Admin access for Bus Logs
router.get(
  "/bus-logs",
  protect,
  restrictTo("security", "admin"),
  getBusLogs
);

export default router;