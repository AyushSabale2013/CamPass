import mongoose from "mongoose";



const gateSchema = new mongoose.Schema(
    {
        gateName: {
            type: String,
            required: true,
            trim: true,
        },

        gateCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        qrId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },

        radius: {
            type: Number,
            required: true
        },

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