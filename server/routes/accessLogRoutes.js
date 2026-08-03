import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getMyAccessLogs } from "../controllers/accessLogController.js";

const router = express.Router();

router.get("/me", protect, getMyAccessLogs);

export default router;