import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Google Authentication
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    profilePicture: {
      type: String,
      default: "",
    },

    // Basic Information
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

    // Password (Only for Admin & Security)
    password: {
      type: String,
      select: false,
    },

    // Student Information
    mis: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    userType: {
      type: String,
      enum: ["hosteller", "dayscholar"],
    },

    hostel: {
      type: String,
      default: "Day Scholar",
    },

    room: {
      type: String,
      default: "Day Scholar",
    },

    // Role
    role: {
      type: String,
      enum: ["student", "security", "admin"],
      default: "student",
    },

    // First Login Check
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;