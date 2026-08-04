import mongoose from "mongoose";

// Supported transport modes
export const TRANSPORT_MODES = ["SELF", "SCHOOL_BUS"];

// Reasons shown when student is currently OUTSIDE campus (about to log ENTRY)
export const ENTRY_REASONS = [
    "Appointment",
    "College Lectures",
    "Study",
    "Visit",
    "Interview",
    "Sports",
    "Mess",
    "College Bus", // <--- ADDED
    "Other",
];

// Reasons shown when student is currently INSIDE campus (about to log EXIT)
export const EXIT_REASONS = [
    "Personal Work",
    "Medical",
    "Trekking",
    "Tapari",
    "Railway Station",
    "Home Visit",
    "Shopping",
    "Internship",
    "Emergency",
    "College Bus", // <--- ADDED
    "Other",
];

// Combined reasons list for Mongoose validation
const ALL_REASONS = [...new Set([...ENTRY_REASONS, ...EXIT_REASONS])];

const entryLogSchema = new mongoose.Schema(
    {
        // References
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true, // Speeds up user history lookups
        },

        gateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Gate",
            required: true,
        },

        // User Snapshot
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        mis: {
            type: String,
            required: true,
            trim: true,
            index: true, // Speeds up search by MIS
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        hostel: {
            type: String,
            required: true,
            default: "Day Scholar",
        },

        room: {
            type: String,
            required: true,
            default: "Day Scholar",
        },

        // Gate Snapshot
        gateName: {
            type: String,
            required: true,
            trim: true,
        },

        // Entry / Exit Details
        status: {
            type: String,
            enum: ["IN", "OUT"],
            required: true,
        },

        // NEW: Mode of transport
        transportMode: {
            type: String,
            enum: TRANSPORT_MODES,
            default: "SELF",
            required: true,
            index: true, // Speeds up security bus dashboard filtering
        },

        reason: {
            type: String,
            enum: ALL_REASONS,
            required: true,
            trim: true,
        },

        // Only used / relevant when reason === "Other"
        additionalNote: {
            type: String,
            maxlength: 100,
            default: "",
            trim: true,
        },

        // GPS Coordinates
        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },

        // Distance from gate at moment of verification (meters)
        distance: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound Index for fast date-range and transport-mode analytics
entryLogSchema.index({ createdAt: -1, transportMode: 1 });

const EntryLog = mongoose.model("EntryLog", entryLogSchema);

export default EntryLog;