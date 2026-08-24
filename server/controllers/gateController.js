import Gate from "../models/Gate.js";
import User from "../models/User.js";
import EntryLog, { ENTRY_REASONS, EXIT_REASONS, TRANSPORT_MODES } from "../models/EntryLog.js";
import GateRequest from "../models/GateRequest.js";
import { calculateDistance } from "../utils/distance.js";

const COOLDOWN_MS = 60 * 1000; // 30 seconds between actions
const DAILY_LIMIT = 30; // max ENTRY and max EXIT actions per day
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30
const GATE_REQUEST_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes to be reviewed

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
 * Shared core of "actually perform an entry/exit": cooldown check,
 * reason validation, daily-limit check, atomic user toggle, EntryLog
 * creation. Used by both the instant self-scan (verifyGate) and the
 * approval workflow (approveGateRequest) so the two paths can never
 * drift apart or duplicate logic.
 *
 * Geofence distance is NOT re-checked in here — callers are responsible
 * for validating/snapshotting distance before calling this, since the
 * approval path uses the distance captured at request-submission time
 * (the guard isn't standing where the student was).
 *
 * Returns either:
 *   { ok: true, action, distance, entryLog, updatedUser, time }
 *   { ok: false, statusCode, code, message }
 */
const performGateAction = async ({
  user,
  gate,
  latitude,
  longitude,
  reason,
  additionalNote,
  transportMode,
  distance,
}) => {
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
      return {
        ok: false,
        statusCode: 429,
        code: "COOLDOWN",
        message: `Please wait ${waitSeconds}s before scanning again.`,
      };
    }
  }

  const action = readIsInsideCampus ? "EXIT" : "ENTRY";
  const validReasons = action === "ENTRY" ? ENTRY_REASONS : EXIT_REASONS;

  if (!validReasons.includes(reason)) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_REASON",
      message: `"${reason}" is not a valid reason for ${action.toLowerCase()}.`,
    };
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
    return {
      ok: false,
      statusCode: 429,
      code: "DAILY_LIMIT",
      message: "Daily entry limit reached. Please contact the gate office.",
    };
  }

  if (action === "EXIT" && currentExitCount >= DAILY_LIMIT) {
    return {
      ok: false,
      statusCode: 429,
      code: "DAILY_LIMIT",
      message: "Daily exit limit reached. Please contact the gate office.",
    };
  }

  const nextEntryCount = action === "ENTRY" ? currentEntryCount + 1 : currentEntryCount;
  const nextExitCount = action === "EXIT" ? currentExitCount + 1 : currentExitCount;
  const nowTs = new Date();

  // --- Atomic, race-safe write ---
  // The filter demands lastActionAt/isInsideCampus still equal what we
  // just read. If a concurrent request already updated this user
  // (e.g. a double-tap, or a guard double-clicking Approve), those
  // fields will have already changed and this matches zero documents —
  // so only ONE of the racing requests can ever win and increment the
  // counters / toggle the state.
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
    return {
      ok: false,
      statusCode: 409,
      code: "CONFLICT",
      message: "Another request was just processed for this account. Please try again.",
    };
  }

  const entryLog = await EntryLog.create({
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
    transportMode,
    reason,
    additionalNote: reason === "Other" ? additionalNote || "" : "",
    latitude,
    longitude,
    distance: Math.round(distance),
  });

  return {
    ok: true,
    action,
    distance: Math.round(distance),
    entryLog,
    updatedUser,
    time: nowTs,
  };
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
 * Instant self-scan — unchanged behavior, now delegating the core logic
 * to performGateAction() so it stays identical to the approval path.
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

    const result = await performGateAction({
      user,
      gate,
      latitude,
      longitude,
      reason,
      additionalNote,
      transportMode: selectedTransportMode,
      distance,
    });

    if (!result.ok) {
      return res.status(result.statusCode).json({
        success: false,
        code: result.code,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${result.action} Successful`,
      action: result.action,
      transportMode: selectedTransportMode,
      gateName: gate.gateName,
      reason,
      distance: result.distance,
      isInsideCampus: result.updatedUser.isInsideCampus,
      time: result.time.toISOString(),
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
 * POST /api/gate/requests
 * Student submits a gate entry/exit request instead of scanning instantly.
 * Stores it as PENDING — does NOT touch isInsideCampus or create an
 * EntryLog. That only happens on approval.
 */
export const submitGateRequest = async (req, res) => {
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

    // Prevent pile-up of duplicate requests from the same student.
    const existingPending = await GateRequest.findOne({
      userId: user._id,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        code: "REQUEST_PENDING",
        message: "You already have a pending request awaiting approval.",
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

    const action = user.isInsideCampus ? "EXIT" : "ENTRY";
    const validReasons = action === "ENTRY" ? ENTRY_REASONS : EXIT_REASONS;

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `"${reason}" is not a valid reason for ${action.toLowerCase()}.`,
      });
    }

    const expiresAt = new Date(Date.now() + GATE_REQUEST_EXPIRY_MS);

    const gateRequest = await GateRequest.create({
      userId: user._id,
      gateId: gate._id,
      latitude,
      longitude,
      distance: Math.round(distance),
      reason,
      additionalNote: reason === "Other" ? additionalNote || "" : "",
      transportMode: selectedTransportMode,
      action,
      status: "PENDING",
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: "Request submitted — waiting for security approval.",
      request: {
        id: gateRequest._id,
        action,
        gateName: gate.gateName,
        status: gateRequest.status,
        expiresAt: gateRequest.expiresAt,
      },
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
 * GET /api/gate/requests/mine?limit=10
 * Student's own requests, most recent first, with the linked EntryLog
 * ("pass") populated once approved.
 */
export const getMyRequests = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const requests = await GateRequest.find({ userId: req.user._id })
      .populate("gateId", "gateName slug")
      .populate("entryLogId")
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      requests: requests.map((r) => ({
        id: r._id,
        gateName: r.gateId?.gateName,
        action: r.action,
        status: r.status,
        reason: r.reason,
        additionalNote: r.additionalNote,
        transportMode: r.transportMode,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        autoRejected: r.autoRejected,
        rejectionNote: r.rejectionNote,
        entryLog: r.entryLogId || null,
      })),
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
 * GET /api/gate/requests/pending
 * Security guard's queue. Excludes anything already past its expiry,
 * even in the brief window before the sweep job catches it.
 */
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await GateRequest.find({
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "name email mis phone hostel room isInsideCampus")
      .populate("gateId", "gateName slug")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      requests: requests.map((r) => ({
        id: r._id,
        student: {
          name: r.userId?.name,
          email: r.userId?.email,
          mis: r.userId?.mis,
          phone: r.userId?.phone,
          hostel: r.userId?.hostel,
          room: r.userId?.room,
        },
        gateName: r.gateId?.gateName,
        action: r.action,
        reason: r.reason,
        additionalNote: r.additionalNote,
        transportMode: r.transportMode,
        distance: r.distance,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
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
 * POST /api/gate/requests/:id/approve
 * The enforcement point: a GatePass (EntryLog) is only ever created
 * here, and only after this atomic PENDING -> APPROVED transition
 * succeeds. There is no other code path that creates one from a
 * GateRequest, so a pass can never be generated while still PENDING.
 */
export const approveGateRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const gateRequest = await GateRequest.findOneAndUpdate(
      { _id: id, status: "PENDING", expiresAt: { $gt: new Date() } },
      {
        $set: {
          status: "APPROVED",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!gateRequest) {
      const existing = await GateRequest.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Request not found.",
        });
      }

      if (existing.status === "PENDING" && existing.expiresAt <= new Date()) {
        return res.status(409).json({
          success: false,
          code: "EXPIRED",
          message: "This request has expired.",
        });
      }

      return res.status(409).json({
        success: false,
        code: "ALREADY_REVIEWED",
        message: `Request already ${existing.status.toLowerCase()}.`,
      });
    }

    const [gate, user] = await Promise.all([
      Gate.findById(gateRequest.gateId),
      User.findById(gateRequest.userId),
    ]);

    if (!gate || !user) {
      // Roll back so this doesn't sit APPROVED with no pass and no
      // way for the guard to retry.
      gateRequest.status = "PENDING";
      gateRequest.reviewedBy = null;
      gateRequest.reviewedAt = null;
      await gateRequest.save();

      return res.status(404).json({
        success: false,
        message: "Gate or student account no longer exists.",
      });
    }

    const result = await performGateAction({
      user,
      gate,
      latitude: gateRequest.latitude,
      longitude: gateRequest.longitude,
      reason: gateRequest.reason,
      additionalNote: gateRequest.additionalNote,
      transportMode: gateRequest.transportMode,
      distance: gateRequest.distance,
    });

    if (!result.ok) {
      // e.g. cooldown/daily-limit/conflict surfaced only now, at
      // approval time. Roll back to PENDING rather than leaving an
      // APPROVED request with no pass — the guard sees the real reason
      // and can retry once it clears.
      gateRequest.status = "PENDING";
      gateRequest.reviewedBy = null;
      gateRequest.reviewedAt = null;
      await gateRequest.save();

      return res.status(result.statusCode).json({
        success: false,
        code: result.code,
        message: result.message,
      });
    }

    gateRequest.entryLogId = result.entryLog._id;
    await gateRequest.save();

    return res.status(200).json({
      success: true,
      message: `Request approved — ${result.action} logged.`,
      request: {
        id: gateRequest._id,
        status: gateRequest.status,
        action: result.action,
      },
      entryLog: result.entryLog,
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
 * POST /api/gate/requests/:id/reject
 * Body: { rejectionNote? }
 */
export const rejectGateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionNote } = req.body;

    const gateRequest = await GateRequest.findOneAndUpdate(
      { _id: id, status: "PENDING" },
      {
        $set: {
          status: "REJECTED",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          rejectionNote: rejectionNote ? String(rejectionNote).slice(0, 200) : "",
        },
      },
      { new: true }
    );

    if (!gateRequest) {
      return res.status(409).json({
        success: false,
        code: "ALREADY_REVIEWED",
        message: "Request already reviewed or does not exist.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request rejected.",
      request: {
        id: gateRequest._id,
        status: gateRequest.status,
      },
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