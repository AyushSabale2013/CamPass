import mongoose from "mongoose";
import { TRANSPORT_MODES } from "./EntryLog.js";

const gateRequestSchema = new mongoose.Schema(
  {
    // References
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gate",
      required: true,
    },

    // Snapshot at submission time (same idea as EntryLog's snapshot fields)
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    distance: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
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

    transportMode: {
      type: String,
      enum: TRANSPORT_MODES,
      default: "SELF",
      required: true,
    },

    // Derived at submission time from user.isInsideCampus, same as verifyGate
    action: {
      type: String,
      enum: ["ENTRY", "EXIT"],
      required: true,
    },

    // Approval workflow state
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    // Auto-reject deadline — 5 minutes from creation (set by the controller)
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // True only when the background sweep rejected this (vs. a guard's
    // explicit REJECT action) — lets the UI show "Timed out" vs "Denied".
    autoRejected: {
      type: Boolean,
      default: false,
    },

    rejectionNote: {
      type: String,
      maxlength: 200,
      default: "",
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // Set only after APPROVED — this EntryLog *is* the generated pass.
    // A GateRequest must never have this set while status !== "APPROVED".
    entryLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntryLog",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup for the security dashboard's pending queue and the sweep job
gateRequestSchema.index({ status: 1, expiresAt: 1 });

const GateRequest = mongoose.model("GateRequest", gateRequestSchema);

export default GateRequest;