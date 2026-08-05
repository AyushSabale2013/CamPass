import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        googleId: {
            type: String,
            required: true,
            unique: true,
        },

        profilePicture: {
            type: String,
            default: "",
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        mis: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        userType: {
            type: String,
            enum: ["hosteller", "dayscholar"],
            required: true,
        },

        hostel: {
            type: String,
            required: true,
            trim: true,
        },

        room: {
            type: String,
            required: true,
            trim: true,
        },

        role: {
            type: String,
            enum: ["student", "security", "admin"],
            default: "student",
        },

        profileCompleted: {
            type: Boolean,
            default: false,
        },

        isInsideCampus: {
            type: Boolean,
            default: true, // Default to true so new users start inside
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("User", userSchema);