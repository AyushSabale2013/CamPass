import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyGoogleToken } from "../services/googleAuthService.js";

// Single source of truth for what a "user" object looks like on the wire.
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

        // 1. Check if user already exists in the database first (Handles Admin, Security, and existing Students)
        let user = await User.findOne({ email: normalizedEmail });

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

        // 2. If user does NOT exist in database, check if it's a valid college email domain for new student registration
        const allowedDomains = (process.env.COLLEGE_EMAIL_DOMAINS || "")
            .split(",")
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean);

        const isValidCollegeEmail = allowedDomains.some((domain) =>
            normalizedEmail.endsWith(domain)
        );

        if (!isValidCollegeEmail) {
            return res.status(403).json({
                success: false,
                message: "Only IIIT Pune students can log in.",
            });
        }

        // 3. New Student User Flow (Valid domain, but needs profile completion)
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



// Register user 
export const createUser = async (req, res) => {
    try {
        const {
            registrationToken,
            phone,
            hostel = "Day Scholar",
            room = "Day Scholar",
            role = "student",
            name,
            userType,
            isInsideCampus,
            status = "active",
            mis: bodyMis,
            email: bodyEmail
        } = req.body;

        let email = bodyEmail;
        let mis = bodyMis;

        if (registrationToken) {
            try {
                const decoded = jwt.decode(registrationToken) || JSON.parse(Buffer.from(registrationToken.split('.')[1], 'base64').toString());
                if (decoded && decoded.email) {
                    email = decoded.email;
                    const localPart = email.split("@")[0];
                    mis = localPart.substring(0, 9);
                }
            } catch (err) {
                console.error("Token decoding error:", err);
            }
        }

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is missing or invalid." });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { mis }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email or MIS already exists."
            });
        }

        const resolvedUserType = userType || (hostel === "Day Scholar" ? "dayscholar" : "hosteller");

        const newUser = await User.create({
            name: name || email.split("@")[0],
            email,
            mis,
            phone,
            userType: resolvedUserType,
            hostel,
            room,
            role,
            // If isInsideCampus is undefined/null in req.body, default to true
            isInsideCampus: isInsideCampus !== undefined ? isInsideCampus : true,
            status,
            googleId: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        });

        const authToken = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });

        return res.status(201).json({ success: true, user: newUser, token: authToken });
    } catch (error) {
        console.error("Create User Error:", error);
        return res.status(400).json({ success: false, message: error.message });
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