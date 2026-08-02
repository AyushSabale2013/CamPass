import Gate from "../models/Gate.js";
import User from "../models/User.js";
import AccessLog from "../models/AccessLog.js";
import { calculateDistance } from "../utils/distance.js";

export const verifyGate = async (req, res) => {

    try {

        const {
            slug,
            latitude,
            longitude,
        } = req.body;

        if (
            !slug ||
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields.",
            });
        }

        // Find Gate
        const gate = await Gate.findOne({
            slug,
            isActive: true,
        });

        if (!gate) {
            return res.status(404).json({
                success: false,
                message: "Invalid Gate.",
            });
        }

        // Logged-in Student
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Calculate Distance
        const distance = calculateDistance(
            Number(latitude),
            Number(longitude),
            gate.latitude,
            gate.longitude
        );

        if (distance > gate.radius) {

            return res.status(403).json({
                success: false,
                message: `Move closer to the gate. (${Math.round(distance)} m away)`,
            });

        }

        // Anti Spam (5 scans in 2 minutes)

        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const recentScans = await AccessLog.countDocuments({

            userId: user._id,

            createdAt: {
                $gte: twoMinutesAgo,
            },

        });

        if (recentScans >= 5) {

            return res.status(429).json({

                success: false,

                message:
                    "Too many scans. Please wait before scanning again.",

            });

        }

        // ENTRY / EXIT

        const action = user.isInsideCampus
            ? "EXIT"
            : "ENTRY";

        // Save Access Log

        await AccessLog.create({

            userId: user._id,

            gateId: gate._id,

            name: user.name,

            email: user.email,

            mis: user.mis,

            phone: user.phone,

            hostel: user.hostel,

            room: user.room,

            gateName: gate.gateName,

            status: action === "ENTRY" ? "IN" : "OUT",

            reason: "QR Gate Verification",

            latitude,

            longitude,

        });

        // Update Student Status

        user.isInsideCampus = !user.isInsideCampus;

        await user.save();

        return res.status(200).json({

            success: true,

            message: `${action} Successful`,

            action,

            distance: Math.round(distance),

            isInsideCampus: user.isInsideCampus,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Server Error",

        });

    }

};