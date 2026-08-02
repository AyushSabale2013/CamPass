import express from "express";
import { verifyGate } from "../controllers/gateController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/gate/verify
router.post("/verify", protect, verifyGate);

export default router;