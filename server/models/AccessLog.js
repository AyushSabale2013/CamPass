import mongoose from "mongoose";

const REASON_OPTIONS = [
  "Personal Work",
  "Medical",
  "Home Visit",
  "Railway Station",
  "Shopping",
  "Internship",
  "Emergency",
  "Other",
];

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
      enum: REASON_OPTIONS,
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

export const REASONS = REASON_OPTIONS;
export default mongoose.model("AccessLog", accessLogSchema);