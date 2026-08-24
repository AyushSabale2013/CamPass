import GateRequest from "../models/GateRequest.js";

const SWEEP_INTERVAL_MS = 30 * 1000; // check every 30s

/**
 * Flips any PENDING request whose expiresAt has passed to REJECTED.
 * This is the "eventually consistent" half of the 5-minute auto-reject
 * rule — the authoritative guarantee (a guard can never approve an
 * expired request) lives in approveGateRequest's atomic filter, not
 * here. This sweep just makes sure stale requests don't sit visibly
 * PENDING on the security dashboard until someone happens to click them.
 */
export const sweepExpiredGateRequests = async () => {
  try {
    await GateRequest.updateMany(
      { status: "PENDING", expiresAt: { $lte: new Date() } },
      {
        $set: {
          status: "REJECTED",
          autoRejected: true,
          reviewedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error("Gate request sweep error:", error);
  }
};

let sweepIntervalHandle = null;

/**
 * Call once at server boot (see server.js). Guarded against being
 * started twice (e.g. on a hot-reload) since setInterval would
 * otherwise stack duplicate timers.
 */
export const startGateRequestSweep = () => {
  if (sweepIntervalHandle) return;
  sweepIntervalHandle = setInterval(sweepExpiredGateRequests, SWEEP_INTERVAL_MS);
  // Run once immediately on boot too, instead of waiting the full interval.
  sweepExpiredGateRequests();
};