import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import gateRoutes from "./routes/gateRoutes.js";
import accessLogRoutes from "./routes/accessLogRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/gate", gateRoutes);
app.use("/api/access-log", accessLogRoutes);

// Test Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "CamPass API Running",
    });
});

export default app;