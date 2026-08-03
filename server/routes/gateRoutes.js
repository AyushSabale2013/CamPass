import express from "express";
import {
  getGateDetails,
  verifyGate,
  getRecentLogs,
} from "../controllers/gateController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/details/:slug", protect, getGateDetails);
router.post("/verify", protect, verifyGate);
router.get("/history", protect, getRecentLogs);

export default router;