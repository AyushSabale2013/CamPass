import Gate from "../models/Gate.js";
import User from "../models/User.js";
import EntryLog, { ENTRY_REASONS, EXIT_REASONS, TRANSPORT_MODES } from "../models/EntryLog.js";
import { calculateDistance } from "../utils/distance.js";

const COOLDOWN_MS = 60 * 1000; // 30 seconds between actions
const DAILY_LIMIT = 30; // max ENTRY and max EXIT actions per day
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Returns the Date (as a UTC instant) representing midnight IST for the
 * IST calendar day that `date` falls in. Two dates are on the "same IST
 * day" iff getISTDayStart() gives the exact same value for both — so
 * this replaces the old isSameDay(), which compared using UTC date
 * parts and reset counters at 5:30 AM IST instead of midnight IST.
 */
const getISTDayStart = (date = new Date()) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
};

/**
 * GET /api/gate/details/:slug
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
 */
export const verifyGate = async (req, res) => {
  try {
    const { slug, latitude, longitude, reason, additionalNote, transportMode } = req.body;

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

    const selectedTransportMode = (TRANSPORT_MODES && TRANSPORT_MODES.includes(transportMode))
      ? transportMode
      : "SELF";

    const gate = await Gate.findOne({ slug, isActive: true });

    if (!gate) {
      return res.status(404).json({
        success: false,
        message: "Invalid Gate.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

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

    // Snapshot exactly what we read. These same values are re-checked in
    // the update filter below (optimistic locking) — if another request
    // for this same user writes in between our read and our write, this
    // snapshot will no longer match and our write will be rejected
    // instead of silently double-counting or double-toggling.
    const readLastActionAt = user.lastActionAt ? new Date(user.lastActionAt).getTime() : null;
    const readIsInsideCampus = user.isInsideCampus;

    if (readLastActionAt !== null) {
      const elapsedMs = Date.now() - readLastActionAt;
      if (elapsedMs < COOLDOWN_MS) {
        const waitSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          code: "COOLDOWN",
          message: `Please wait ${waitSeconds}s before scanning again.`,
        });
      }
    }

    const action = readIsInsideCampus ? "EXIT" : "ENTRY";
    const validReasons = action === "ENTRY" ? ENTRY_REASONS : EXIT_REASONS;

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `"${reason}" is not a valid reason for ${action.toLowerCase()}.`,
      });
    }

    // --- Timezone-safe daily count check (IST) ---
    const todayStart = getISTDayStart();
    const storedDayStart = user.dailyCountDate
      ? getISTDayStart(new Date(user.dailyCountDate))
      : null;
    const sameDay = storedDayStart !== null && storedDayStart.getTime() === todayStart.getTime();

    const currentEntryCount = sameDay ? user.dailyEntryCount : 0;
    const currentExitCount = sameDay ? user.dailyExitCount : 0;

    if (action === "ENTRY" && currentEntryCount >= DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "DAILY_LIMIT",
        message: "Daily entry limit reached. Please contact the gate office.",
      });
    }

    if (action === "EXIT" && currentExitCount >= DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "DAILY_LIMIT",
        message: "Daily exit limit reached. Please contact the gate office.",
      });
    }

    const nextEntryCount = action === "ENTRY" ? currentEntryCount + 1 : currentEntryCount;
    const nextExitCount = action === "EXIT" ? currentExitCount + 1 : currentExitCount;
    const nowTs = new Date();

    // --- Atomic, race-safe write ---
    // The filter demands lastActionAt/isInsideCampus still equal what we
    // just read. If a concurrent request already updated this user
    // (e.g. a double-tap), those fields will have already changed and
    // this matches zero documents — so only ONE of the racing requests
    // can ever win and increment the counters / toggle the state.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isInsideCampus: readIsInsideCampus,
        lastActionAt: user.lastActionAt ?? null,
      },
      {
        $set: {
          isInsideCampus: !readIsInsideCampus,
          lastActionAt: nowTs,
          dailyCountDate: todayStart,
          dailyEntryCount: nextEntryCount,
          dailyExitCount: nextExitCount,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      // Another request for this same user won the race between our
      // read and our write. Nothing was written by us — safe to ask
      // the client to just retry.
      return res.status(409).json({
        success: false,
        code: "CONFLICT",
        message: "Another request was just processed for this account. Please try again.",
      });
    }

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
      transportMode: selectedTransportMode,
      reason,
      additionalNote: reason === "Other" ? additionalNote || "" : "",
      latitude,
      longitude,
      distance: Math.round(distance),
    });

    return res.status(200).json({
      success: true,
      message: `${action} Successful`,
      action,
      transportMode: selectedTransportMode,
      gateName: gate.gateName,
      reason,
      distance: Math.round(distance),
      isInsideCampus: updatedUser.isInsideCampus,
      time: nowTs.toISOString(),
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
        status: log.status,
        transportMode: log.transportMode || "SELF",
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
 */
export const getSecurityLogs = async (req, res) => {
  try {
    const type = req.query.type || "today";
    const section = req.query.section || "all";
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

    const rawLogs = await EntryLog.find(filter)
      .populate("userId", "userType isInsideCampus hostel room phone")
      .sort({ createdAt: -1 });

    const seenUsers = new Set();
    const uniqueLogs = [];

    for (const log of rawLogs) {
      const userIdStr = log.userId ? log.userId._id.toString() : log.mis || log.email;
      if (!seenUsers.has(userIdStr)) {
        seenUsers.add(userIdStr);
        uniqueLogs.push(log);
      }
    }

    const logsToProcess =
      section === "hostelers_outside" || section === "dayscholars_inside"
        ? uniqueLogs
        : rawLogs;

    const formattedLogs = logsToProcess.map((log) => {
      const student = log.userId;

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
        status: log.status,
        transportMode: log.transportMode || "SELF",
        isInsideCampus: isInside,
        reason: log.reason,
        additionalNote: log.additionalNote,
        distance: log.distance,
        createdAt: log.createdAt,
      };
    });

    let filteredLogs = formattedLogs;

    if (section === "hostelers_outside") {
      filteredLogs = formattedLogs.filter(
        (log) => log.userType === "hosteller" && !log.isInsideCampus
      );
    } else if (section === "dayscholars_inside") {
      filteredLogs = formattedLogs.filter(
        (log) => log.userType === "dayscholar" && log.isInsideCampus
      );
    }

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

/**
 * GET /api/gate/bus-logs?date=YYYY-MM-DD&status=IN|OUT
 */
export const getBusLogs = async (req, res) => {
  try {
    const { date, status } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      transportMode: "SCHOOL_BUS",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    if (status === "IN" || status === "OUT") {
      filter.status = status;
    }

    const logs = await EntryLog.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      total: logs.length,
      logs: logs.map((log) => ({
        id: log._id,
        _id: log._id,
        studentName: log.name,
        name: log.name,
        studentMis: log.mis,
        mis: log.mis,
        studentPhone: log.phone,
        phone: log.phone,
        hostel: log.hostel,
        room: log.room,
        status: log.status,
        gateName: log.gateName,
        transportMode: log.transportMode || "SCHOOL_BUS",
        reason: log.reason,
        additionalNote: log.additionalNote,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Bus logs fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};