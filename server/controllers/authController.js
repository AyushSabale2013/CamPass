import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyGoogleToken } from "../services/googleAuthService.js";

// Single source of truth for what a "user" object looks like on the wire.
// googleLogin, registerStudent, and getCurrentUser must all return the
// same shape — otherwise AuthContext's user object is incomplete right
// after login/register (fields stay undefined until a later loadUser()
// call happens to run).
const buildUserResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profilePicture: user.profilePicture,

    mis: user.mis,
    phone: user.phone,
    userType: user.userType,
    hostel: user.hostel,
    room: user.room,

    isInsideCampus: user.isInsideCampus,

    profileCompleted: user.profileCompleted,

    createdAt: user.createdAt,
});

// Google login
export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Google credential is required.",
            });
        }

        // Verify Google Token
        const payload = await verifyGoogleToken(credential);

        const {
            sub: googleId,
            name,
            email,
            picture,
            email_verified,
        } = payload;

        // Check Google email verification
        if (!email_verified) {
            return res.status(401).json({
                success: false,
                message: "Google email is not verified.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Parse allowed domains and test security emails from .env
        const allowedDomains = (process.env.COLLEGE_EMAIL_DOMAINS || "")
            .split(",")
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean);

        const testSecurityEmails = (process.env.TEST_SECURITY_EMAILS || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

        // 2. Determine email permissions
        const isValidCollegeEmail = allowedDomains.some((domain) =>
            normalizedEmail.endsWith(domain)
        );
        const isTestSecurityEmail = testSecurityEmails.includes(normalizedEmail);

        // Reject if email belongs neither to college domains nor security test list
        if (!isValidCollegeEmail && !isTestSecurityEmail) {
            return res.status(403).json({
                success: false,
                message: "Only IIIT Pune college email addresses or authorized personnel are allowed.",
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });

        // Auto-provision or sync Security Guard User
        if (isTestSecurityEmail) {
            if (!user) {
                user = await User.create({
                    googleId,
                    name: name || "Security Guard",
                    email: normalizedEmail,
                    profilePicture: picture || "",
                    mis: "MSF-9999", // MSF ID stored in mis field
                    phone: "9999999999",
                    userType: "dayscholar",
                    hostel: "N/A",
                    room: "N/A",
                    role: "security",
                    isInsideCampus: false,
                    profileCompleted: true,
                });
            } else if (user.role !== "security") {
                user.role = "security";
                user.profileCompleted = true;
                if (!user.mis) user.mis = "MSF-9999";
                await user.save();
            }
        }

        // Existing User (or newly auto-provisioned Security Guard)
        if (user) {
            const token = jwt.sign(
                {
                    id: user._id,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES_IN,
                }
            );

            return res.status(200).json({
                success: true,
                isRegistered: true,
                message: "Login Successful",
                token,
                user: buildUserResponse(user),
            });
        }

        // New Student User Flow
        const registrationToken = jwt.sign(
            {
                googleId,
                name,
                email: normalizedEmail,
                profilePicture: picture,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m",
            }
        );

        return res.status(200).json({
            success: true,
            isRegistered: false,
            message: "Complete your profile to continue.",
            registrationToken,
        });

    } catch (error) {
        console.error("Google Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication Failed",
        });
    }
};

// Register Student
export const registerStudent = async (req, res) => {
    try {
        const {
            registrationToken,
            mis,
            phone,
            userType,
            hostel,
            room,
        } = req.body;

        // Check required fields
        if (!registrationToken || !mis || !phone || !userType) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields.",
            });
        }

        if (userType === "hosteller" && (!hostel || !room)) {
            return res.status(400).json({
                success: false,
                message: "Hostel and room are required for hostellers.",
            });
        }

        // Verify Registration Token
        let googleUser;

        try {
            googleUser = jwt.verify(
                registrationToken,
                process.env.JWT_SECRET
            );
        } catch (tokenError) {
            return res.status(401).json({
                success: false,
                message: "Registration session expired. Please log in again.",
            });
        }

        const {
            googleId,
            name,
            email,
            profilePicture,
        } = googleUser;

        // Check duplicate email
        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "User already exists.",
            });
        }

        // Check duplicate MIS
        const existingMIS = await User.findOne({ mis });

        if (existingMIS) {
            return res.status(400).json({
                success: false,
                message: "MIS already registered.",
            });
        }

        // Auto-fill Day Scholar
        let finalHostel = hostel;
        let finalRoom = room;

        if (userType === "dayscholar") {
            finalHostel = "Day Scholar";
            finalRoom = "Day Scholar";
        }

        // Create Student
        const user = await User.create({
            googleId,
            profilePicture,

            name,
            email,

            mis,
            phone,

            userType,

            hostel: finalHostel,
            room: finalRoom,

            role: "student",

            isInsideCampus: false,

            profileCompleted: true,
        });

        // Generate Login JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN,
            }
        );

        return res.status(201).json({
            success: true,
            message: "Registration Successful",
            token,
            user: buildUserResponse(user),
        });

    } catch (error) {
        console.error("Student Registration Error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration Failed.",
        });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: buildUserResponse(req.user),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to fetch user.",
        });
    }
};