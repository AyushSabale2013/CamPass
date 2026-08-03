import mongoose from "mongoose";

// Reasons shown when the student is currently OUTSIDE campus (about to
// log an ENTRY).
export const ENTRY_REASONS = [
    "Appointment",
    "College Lectures",
    "Study",
    "Visit",
    "Interview",
    "Sports",
    "Mess",
    "Other",
];

// Reasons shown when the student is currently INSIDE campus (about to
// log an EXIT).
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
    "Other",
];

// The schema itself just needs to accept anything valid for either
// direction — the controller enforces which list applies per request.
const ALL_REASONS = [...new Set([...ENTRY_REASONS, ...EXIT_REASONS])];

const entryLogSchema = new mongoose.Schema(
    {
        // References
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

        // Entry Details
        status: {
            type: String,
            enum: ["IN", "OUT"],
            required: true,
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

        // Distance from the gate at the moment of verification (meters)
        distance: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const EntryLog = mongoose.model("EntryLog", entryLogSchema);

export default EntryLog;