import Gate from "../models/Gate.js";
import User from "../models/User.js";
import EntryLog, { ENTRY_REASONS, EXIT_REASONS } from "../models/EntryLog.js";
import { calculateDistance } from "../utils/distance.js";

const COOLDOWN_MS = 30 * 1000; // 30 seconds between actions
const DAILY_LIMIT = 30; // max ENTRY and max EXIT actions per day

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
};

/**
 * GET /api/gate/details/:slug
 *
 * Returns just the gate's coordinates/radius/name so the client can
 * show a live GPS distance before the student taps the action button.
 */
export const getGateDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Missing gate slug.",
      });
    }

    const gate = await Gate.findOne({ slug, isActive: true });

    if (!gate) {
      return res.status(404).json({
        success: false,
        message: "Invalid Gate.",
      });
    }

    return res.status(200).json({
      success: true,
      gate: {
        slug: gate.slug,
        gateName: gate.gateName,
        latitude: gate.latitude,
        longitude: gate.longitude,
        radius: gate.radius,
      },
      entryReasons: ENTRY_REASONS,
      exitReasons: EXIT_REASONS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * GET /api/gate/junction/:slug
 *
 * The single endpoint a scanned QR code hits, regardless of who scans it.
 * protect runs before this (see routes), so req.user is always set, but
 * this handler itself is role-agnostic — its whole job is telling the
 * client where to go next based on req.user.role.
 *
 * Students get gate details back (same shape as getGateDetails) so
 * GateScanner.jsx can render immediately without a second request.
 * Security/admin get a redirectTo path instead — they never receive gate
 * coordinates or reasons here, since they have no business scanning in.
 */
export const getGateJunction = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Missing gate slug.",
      });
    }

    const gate = await Gate.findOne({ slug, isActive: true });

    if (!gate) {
      return res.status(404).json({
        success: false,
        message: "Invalid Gate.",
      });
    }

    if (req.user.role === "security") {
      return res.status(200).json({
        success: true,
        redirectTo: "/security/dashboard",
      });
    }

    if (req.user.role === "admin") {
      return res.status(200).json({
        success: true,
        redirectTo: "/admin/dashboard",
      });
    }

    // role === "student"
    return res.status(200).json({
      success: true,
      gate: {
        slug: gate.slug,
        gateName: gate.gateName,
        latitude: gate.latitude,
        longitude: gate.longitude,
        radius: gate.radius,
      },
      entryReasons: ENTRY_REASONS,
      exitReasons: EXIT_REASONS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * POST /api/gate/verify
 *
 * Body: { slug, latitude, longitude, reason, additionalNote? }
 */
export const verifyGate = async (req, res) => {
  try {
    const { slug, latitude, longitude, reason, additionalNote } = req.body;

    // --- Basic payload validation ---

    if (!slug || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please select a reason.",
      });
    }

    if (reason === "Other" && additionalNote && additionalNote.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Additional note must be 100 characters or fewer.",
      });
    }

    // --- Gate lookup ---

    const gate = await Gate.findOne({ slug, isActive: true });

    if (!gate) {
      return res.status(404).json({
        success: false,
        message: "Invalid Gate.",
      });
    }

    // --- Student lookup ---

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // --- GPS radius check ---

    const distance = calculateDistance(
      Number(latitude),
      Number(longitude),
      gate.latitude,
      gate.longitude
    );

    if (distance > gate.radius) {
      return res.status(403).json({
        success: false,
        code: "OUTSIDE_RADIUS",
        message: `Move closer to the gate. (${Math.round(distance)} m away)`,
      });
    }

    // --- 30 second cooldown between any two actions ---

    if (user.lastActionAt) {
      const elapsedMs = Date.now() - new Date(user.lastActionAt).getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const waitSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          code: "COOLDOWN",
          message: `Please wait ${waitSeconds}s before scanning again.`,
        });
      }
    }

    // --- Determine action from current state ---

    const action = user.isInsideCampus ? "EXIT" : "ENTRY";

    // --- Reason validation ---

    const validReasons = action === "ENTRY" ? ENTRY_REASONS : EXIT_REASONS;

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `"${reason}" is not a valid reason for ${action.toLowerCase()}.`,
      });
    }

    // --- Daily limit check ---

    const today = new Date();
    const sameDay = isSameDay(user.dailyCountDate, today);

    let dailyEntryCount = sameDay ? user.dailyEntryCount : 0;
    let dailyExitCount = sameDay ? user.dailyExitCount : 0;

    if (action === "ENTRY" && dailyEntryCount >= DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "DAILY_LIMIT",
        message: "Daily entry limit reached. Please contact the gate office.",
      });
    }

    if (action === "EXIT" && dailyExitCount >= DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "DAILY_LIMIT",
        message: "Daily exit limit reached. Please contact the gate office.",
      });
    }

    // --- Persist the log ---

    await EntryLog.create({
      userId: user._id,
      gateId: gate._id,
      name: user.name,
      email: user.email,
      mis: user.mis,
      phone: user.phone,
      hostel: user.hostel,
      room: user.room,
      gateName: gate.gateName,
      status: action === "ENTRY" ? "IN" : "OUT",
      reason,
      additionalNote: reason === "Other" ? additionalNote || "" : "",
      latitude,
      longitude,
      distance: Math.round(distance),
    });

    // --- Update student state ---

    user.isInsideCampus = !user.isInsideCampus;
    user.lastActionAt = new Date();
    user.dailyCountDate = today;
    user.dailyEntryCount = action === "ENTRY" ? dailyEntryCount + 1 : dailyEntryCount;
    user.dailyExitCount = action === "EXIT" ? dailyExitCount + 1 : dailyExitCount;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `${action} Successful`,
      action,
      gateName: gate.gateName,
      reason,
      distance: Math.round(distance),
      isInsideCampus: user.isInsideCampus,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * GET /api/gate/history?limit=5&page=1&status=IN|OUT
 *
 * Returns student logs, newest first.
 */
export const getRecentLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const { status } = req.query;

    const filter = { userId: req.user._id };

    if (status === "IN" || status === "OUT") {
      filter.status = status;
    }

    const [logs, total] = await Promise.all([
      EntryLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      EntryLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs: logs.map((log) => ({
        id: log._id,
        gateName: log.gateName,
        status: log.status, // "IN" | "OUT"
        reason: log.reason,
        additionalNote: log.additionalNote,
        distance: log.distance,
        createdAt: log.createdAt,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * GET /api/gate/security-logs?type=today|all&section=all|hostelers_outside|dayscholars_inside&page=1&limit=200
 *
 * For Security Guards to view real-time student logs and campus status.
 * Deduplicates records so each student appears only ONCE with their latest scan log.
 */
export const getSecurityLogs = async (req, res) => {
  try {
    const type = req.query.type || "today"; // "today" | "all"
    const section = req.query.section || "all"; // "all" | "hostelers_outside" | "dayscholars_inside"
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const filter = {};

    if (type === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    // Fetch all logs sorted newest first
    const rawLogs = await EntryLog.find(filter)
      .populate("userId", "userType isInsideCampus hostel room phone")
      .sort({ createdAt: -1 });

    // Deduplicate: Keep ONLY the most recent log per student
    const seenUsers = new Set();
    const uniqueLogs = [];

    for (const log of rawLogs) {
      const userIdStr = log.userId ? log.userId._id.toString() : log.mis || log.email;
      if (!seenUsers.has(userIdStr)) {
        seenUsers.add(userIdStr);
        uniqueLogs.push(log);
      }
    }

    // For status views (outside/inside), use deduplicated logs; for raw stream view, keep full logs
    const logsToProcess =
      section === "hostelers_outside" || section === "dayscholars_inside"
        ? uniqueLogs
        : rawLogs;

    const formattedLogs = logsToProcess.map((log) => {
      const student = log.userId;

      // Determine Day Scholar Status
      const isDayScholar =
        student?.userType === "dayscholar" ||
        log.hostel === "Day Scholar" ||
        student?.hostel === "Day Scholar";

      const isInside = student ? student.isInsideCampus : log.status === "IN";

      return {
        _id: log._id,
        id: log._id,
        name: log.name,
        studentName: log.name,
        mis: log.mis,
        studentMis: log.mis,
        phone: student?.phone || log.phone || "N/A",
        studentPhone: student?.phone || log.phone || "N/A",
        userType: isDayScholar ? "dayscholar" : "hosteller",
        hostel: isDayScholar ? "DS" : log.hostel || student?.hostel || "N/A",
        room: isDayScholar ? "DS" : log.room || student?.room || "N/A",
        gateName: log.gateName,
        status: log.status, // "IN" | "OUT"
        isInsideCampus: isInside,
        reason: log.reason,
        additionalNote: log.additionalNote,
        distance: log.distance,
        createdAt: log.createdAt,
      };
    });

    // Apply specific section filtering
    let filteredLogs = formattedLogs;

    if (section === "hostelers_outside") {
      // Hostelers currently outside campus
      filteredLogs = formattedLogs.filter(
        (log) => log.userType === "hosteller" && !log.isInsideCampus
      );
    } else if (section === "dayscholars_inside") {
      // Day Scholars currently inside campus
      filteredLogs = formattedLogs.filter(
        (log) => log.userType === "dayscholar" && log.isInsideCampus
      );
    }

    // Pagination after filtering
    const total = filteredLogs.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      sectionTitle:
        section === "hostelers_outside"
          ? "Hostelers Outside Campus"
          : section === "dayscholars_inside"
          ? "Day Scholars Inside Campus"
          : "All Gate Logs",
      logs: paginatedLogs,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Security logs fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};