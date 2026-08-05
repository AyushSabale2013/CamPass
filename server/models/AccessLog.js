import mongoose from "mongoose";

// Reasons shown when student is currently OUTSIDE campus (about to log ENTRY)
export const ENTRY_REASONS = [
  "Appointment",
  "College Lectures",
  "Study",
  "Visit",
  "Interview",
  "Sports",
  "Mess",
  "Competition",
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
  "Talegaon",
  "Other",
];

// Combined reasons list for Mongoose validation
const ALL_REASONS = [...new Set([...ENTRY_REASONS, ...EXIT_REASONS])];

const accessLogSchema = new mongoose.Schema(
  {
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

    // Snapshot fields (denormalized so historical logs stay correct
    // even if the student's profile changes later)
    name: { type: String, required: true },
    email: { type: String, required: true },
    mis: { type: String, required: true },
    phone: { type: String, required: true },
    hostel: { type: String, required: true },
    room: { type: String, required: true },
    gateName: { type: String, required: true },

    status: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    reason: {
      type: String,
      enum: ALL_REASONS,
      required: true,
    },

    // Only used / relevant when reason === "Other"
    additionalNote: {
      type: String,
      maxlength: 100,
      default: "",
    },

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
  },
  { timestamps: true }
);

export default mongoose.model("AccessLog", accessLogSchema);