import express from "express";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import {
  getAdminProfile,
  resetAllSystemData,
  // User Management
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  // Gate Management
  getAllGates,
  createGate,
  updateGate,
  deleteGate,
  // Logs Export
  exportAllLogs,
} from "../controllers/adminController.js";

const router = express.Router();

//GLOBAL LOCK: Every route below this line is fully protected & strictly ADMIN ONLY
router.use(protect, restrictTo("admin"));

// 1. Admin Profile
router.get("/profile", getAdminProfile);

// 2. Global System Reset
router.post("/reset-data", resetAllSystemData);

// 3. User Management (Students, Security Guards, Admins)
router.get("/users", getAllUsers);
router.post("/users", createUser);          // Add new user
router.put("/users/:id", updateUser);       // Edit user
router.delete("/users/:id", deleteUser);    // Delete user

// 4. Gate Management
router.get("/gates", getAllGates);
router.post("/gates", createGate);          // Add new gate
router.put("/gates/:id", updateGate);       // Edit gate
router.delete("/gates/:id", deleteGate);    // Delete gate

// 5. Export Logs
router.get("/logs/export", exportAllLogs);  // Export all logs (CSV/Excel/JSON)

export default router;