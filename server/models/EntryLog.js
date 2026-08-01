import mongoose from "mongoose";

import mongoose from "mongoose";

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
            required: true,
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
    },
    {
        timestamps: true,
    }
);

const EntryLog = mongoose.model("EntryLog", entryLogSchema);

export default EntryLog;

const EntryLog = mongoose.model("EntryLog", entryLogSchema);

export default EntryLog;