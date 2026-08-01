import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use("/api/auth", authRoutes);

// Test Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "CamPass API Running",
    });
});

export default app;