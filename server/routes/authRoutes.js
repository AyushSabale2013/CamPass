import express from "express";
import {
  googleLogin,
  registerStudent,
  getCurrentUser,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/google", googleLogin);
router.post("/register", registerStudent);
router.get("/me", protect, getCurrentUser);

export default router;