import AccessLog from "../models/AccessLog.js";

export const getMyAccessLogs = async (req, res) => {

    try {

        const logs = await AccessLog.find({

            userId: req.user._id,

        })
            .sort({ createdAt: -1 });

        return res.status(200).json({

            success: true,

            logs,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Server Error",

        });

    }

};