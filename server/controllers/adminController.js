import User from "../models/User.js";
import AccessLog from "../models/AccessLog.js";
import Gate from "../models/Gate.js";

// 1. Get Admin Profile / Dashboard Stats
export const getAdminProfile = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: "student" });
        const totalSecurity = await User.countDocuments({ role: "security" });
        const totalAdmins = await User.countDocuments({ role: "admin" });
        const totalLogs = await AccessLog.countDocuments();

        return res.status(200).json({
            success: true,
            admin: req.user,
            stats: {
                totalUsers,
                totalStudents,
                totalSecurity,
                totalAdmins,
                totalLogs,
            },
        });
    } catch (error) {
        console.error("Admin Profile Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 2. Reset All System Data (Deletes all logs, non-admin users, etc.)
export const resetAllSystemData = async (req, res) => {
    try {
        // Clear all access logs
        await AccessLog.deleteMany({});
        
        return res.status(200).json({
            success: true,
            message: "System data has been successfully reset.",
        });
    } catch (error) {
        console.error("System Reset Error:", error);
        return res.status(500).json({ success: false, message: "Failed to reset system data." });
    }
};

// --- USER MANAGEMENT ---

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        return res.status(200).json({ success: true, users });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch users." });
    }
};

export const createUser = async (req, res) => {
    try {
        const { name, email, role, mis, phone, userType, hostel, room, googleId } = req.body;
        
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "User already exists with this email." });
        }

        // Auto-generate a fallback googleId if it wasn't supplied by the frontend payload
        const finalGoogleId = googleId || `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const newUser = await User.create({
            googleId: finalGoogleId,
            name,
            email,
            role: role || "student",
            mis: mis || "N/A",
            phone: phone || "0000000000",
            userType: userType || "dayscholar",
            hostel: hostel || "N/A",
            room: room || "N/A",
            profileCompleted: true,
        });

        return res.status(201).json({ success: true, message: "User created successfully", user: newUser });
    } catch (error) {
        console.error("Create User Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to create user." });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        return res.status(200).json({ success: true, message: "User updated successfully", user: updatedUser });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update user." });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        return res.status(200).json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete user." });
    }
};

// --- GATE MANAGEMENT ---

export const getAllGates = async (req, res) => {
    try {
        const gates = await Gate.find({}).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, gates });
    } catch (error) {
        console.error("Fetch Gates Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch gates." });
    }
};

export const createGate = async (req, res) => {
    try {
        const { gateName, gateCode, qrId, slug, gateType, latitude, longitude, radius, isActive } = req.body;

        const existingGate = await Gate.findOne({ $or: [{ gateCode }, { slug }, { qrId }] });
        if (existingGate) {
            return res.status(400).json({ success: false, message: "Gate with this code, slug, or QR ID already exists." });
        }

        const newGate = await Gate.create({
            gateName,
            gateCode,
            qrId,
            slug,
            gateType,
            latitude,
            longitude,
            radius,
            isActive,
        });

        return res.status(201).json({ success: true, message: "Gate added successfully.", gate: newGate });
    } catch (error) {
        console.error("Create Gate Error:", error);
        return res.status(500).json({ success: false, message: "Failed to create gate." });
    }
};

export const updateGate = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedGate = await Gate.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedGate) {
            return res.status(404).json({ success: false, message: "Gate not found." });
        }

        return res.status(200).json({ success: true, message: "Gate updated successfully.", gate: updatedGate });
    } catch (error) {
        console.error("Update Gate Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update gate." });
    }
};

export const deleteGate = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Gate.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Gate not found." });
        }

        return res.status(200).json({ success: true, message: "Gate deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete gate." });
    }
};

// --- LOGS EXPORT ---

export const exportAllLogs = async (req, res) => {
    try {
        const logs = await AccessLog.find({})
            .populate("userId", "name email mis role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: logs.length,
            logs,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch logs." });
    }
};