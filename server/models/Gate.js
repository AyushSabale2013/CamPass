import mongoose from "mongoose";

const gateSchema = new mongoose.Schema(
  {
    // Gate Name
    gateName: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique Gate Code
    gateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Used in URL
    // Example: /gate/main-gate
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Gate Latitude
    latitude: {
      type: Number,
      required: true,
    },

    // Gate Longitude
    longitude: {
      type: Number,
      required: true,
    },

    // Allowed GPS Radius (in meters)
    radius: {
      type: Number,
      default: 50,
      min: 1,
    },

    // Gate Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Gate = mongoose.model("Gate", gateSchema);

export default Gate;