import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getGateDetails, verifyGate } from "../../services/gateService";

import Loader from "../../components/common/Loader";

// ==========================================
// 1. CONSTANTS & UTILS
// ==========================================

// The reason that gets the free-text note field. Must match the value
// the backend treats specially (EntryLog schema: additionalNote only
// applies when reason === "Other").
const NOTE_REASON = "Other";

// Any GPS fix worse (larger) than this is too noisy to trust for a
// gate-radius check — treat it as "still acquiring" rather than granted.
const MAX_ACCEPTABLE_ACCURACY_METERS = 75;

// Network resilience for the verifyGate submission — a plain fetch with
// no timeout can hang indefinitely on flaky connections.
const SUBMIT_TIMEOUT_MS = 15000;
const SUBMIT_MAX_RETRIES = 2; // total attempts = 1 + retries
const SUBMIT_RETRY_DELAY_MS = 1500;

/**
 * Calculates distance in meters between two lat/lon coordinates using Haversine formula.
 */
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs verifyGate with a timeout + limited retries. Only retries on
 * network-level failures (no response reached the server) or a client
 * timeout — never on a request that actually got a response, since
 * retrying a completed server-side action (e.g. a logged entry) could
 * double-submit.
 */
const verifyGateWithResilience = async (payload) => {
  let lastError;

  for (let attempt = 0; attempt <= SUBMIT_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await verifyGate(payload, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Server responded (even with an error status) — do not retry,
      // surface it immediately so COOLDOWN / DAILY_LIMIT etc. show up.
      const gotServerResponse = Boolean(err?.response);
      if (gotServerResponse) {
        throw err;
      }

      const isLastAttempt = attempt === SUBMIT_MAX_RETRIES;
      if (isLastAttempt) {
        throw err;
      }

      await sleep(SUBMIT_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
};

// ==========================================
// 2. SUB-COMPONENTS
// ==========================================

/** Header Bar */
const Header = ({ gateName, now, onBack }) => (
  <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md text-white border-b border-slate-800 px-4 py-3 shadow-md">
    <div className="max-w-md mx-auto flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 px-3 py-1.5 rounded-full border border-slate-700 transition-all"
        aria-label="Back to Dashboard"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Dashboard
      </button>

      <div className="text-right">
        <h1 className="text-sm font-bold tracking-tight text-slate-100">
          {gateName || "CamPass Gate"}
        </h1>
        <p className="text-[11px] font-medium text-slate-400">
          {now.toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
          {now.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>
    </div>
  </header>
);

/** Student Profile Card */
const StudentProfileCard = ({ user }) => (
  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
    <div className="flex items-start gap-4">
      {user?.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.name || "Student"}
          referrerPolicy="no-referrer"
          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-100 shadow-sm"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
          {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 truncate">
            {user?.name || "Student Name"}
          </h2>
          <span className="shrink-0 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
            MIS: {user?.mis || "N/A"}
          </span>
        </div>

        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
          {user?.email}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] pt-3 border-t border-slate-100 text-slate-600">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Hostel & Room
            </span>
            <span className="font-semibold text-slate-800">
              {user?.hostel || "N/A"} • R-{user?.room || "N/A"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Phone
            </span>
            <span className="font-semibold text-slate-800">
              {user?.phone || "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/** GPS Status Card
 *  gpsStatus now distinguishes: "pending" | "denied" | "unavailable" |
 *  "timeout" | "granted" — each with its own message, instead of
 *  collapsing every failure into "Permission Denied". Also surfaces a
 *  low-accuracy warning when a fix arrives but is too noisy to trust. */
const GpsCard = ({ gpsStatus, gpsVerified, distance, allowedRadius, accuracy }) => {
  const roundedDist = distance !== null ? Math.round(distance) : null;
  const roundedAccuracy = accuracy !== null ? Math.round(accuracy) : null;
  const isLowAccuracy =
    gpsStatus === "granted" && accuracy !== null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS;

  const dotColor = gpsVerified
    ? "emerald"
    : gpsStatus === "denied" || gpsStatus === "unavailable" || gpsStatus === "timeout"
      ? "rose"
      : "amber";

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
          GPS Location Verification
        </span>
        <div className="relative flex h-3 w-3">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${dotColor}-400`}
          />
          <span
            className={`relative inline-flex rounded-full h-3 w-3 bg-${dotColor}-500`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-${dotColor}-50 text-${dotColor}-600 border border-${dotColor}-200`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <div>
          {gpsStatus === "pending" && (
            <>
              <h3 className="text-sm font-bold text-slate-800">
                Searching signal…
              </h3>
              <p className="text-xs text-slate-500">
                Locking onto current GPS location coordinates.
              </p>
            </>
          )}

          {gpsStatus === "denied" && (
            <>
              <h3 className="text-sm font-bold text-rose-600">
                Permission Denied
              </h3>
              <p className="text-xs text-slate-500">
                Please enable location permissions in your browser settings
                and reload this page.
              </p>
            </>
          )}

          {gpsStatus === "unavailable" && (
            <>
              <h3 className="text-sm font-bold text-rose-600">
                Location Unavailable
              </h3>
              <p className="text-xs text-slate-500">
                Couldn't get a GPS fix. Move to an open area (away from
                buildings) and check your device's location is turned on.
              </p>
            </>
          )}

          {gpsStatus === "timeout" && (
            <>
              <h3 className="text-sm font-bold text-rose-600">
                Signal Timed Out
              </h3>
              <p className="text-xs text-slate-500">
                GPS took too long to respond. Retrying automatically — stay
                on this page.
              </p>
            </>
          )}

          {gpsStatus === "granted" && gpsVerified && (
            <>
              <h3 className="text-sm font-bold text-emerald-600">
                GPS Verified
              </h3>
              <p className="text-xs text-slate-500">
                You are{" "}
                <strong className="text-slate-800">{roundedDist}m</strong> away
                (Allowed: &le; {allowedRadius}m)
              </p>
            </>
          )}

          {gpsStatus === "granted" && !gpsVerified && isLowAccuracy && (
            <>
              <h3 className="text-sm font-bold text-amber-600">
                Improving GPS Accuracy…
              </h3>
              <p className="text-xs text-slate-500">
                Signal accuracy is &plusmn;{roundedAccuracy}m, too rough to
                verify reliably. Step outside if you're indoors.
              </p>
            </>
          )}

          {gpsStatus === "granted" && !gpsVerified && !isLowAccuracy && (
            <>
              <h3 className="text-sm font-bold text-amber-600">
                Outside Allowed Gate Radius
              </h3>
              <p className="text-xs text-slate-500">
                Distance:{" "}
                <strong className="text-slate-800">{roundedDist}m</strong> (Must
                be within {allowedRadius}m)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** Current Campus Status Card */
const CampusStatusCard = ({ isInsideCampus }) => (
  <div
    className={`rounded-3xl p-5 shadow-sm border transition-all duration-300 relative overflow-hidden ${isInsideCampus
      ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/80"
      : "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-200/80"
      }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
          Current Live Status
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isInsideCampus ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"
              }`}
          />
          <span
            className={`text-lg font-black tracking-tight ${isInsideCampus ? "text-emerald-700" : "text-indigo-700"
              }`}
          >
            {isInsideCampus ? "INSIDE CAMPUS" : "OUTSIDE CAMPUS"}
          </span>
        </div>
      </div>

      <div className="text-right">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isInsideCampus
            ? "bg-emerald-100 text-emerald-800"
            : "bg-indigo-100 text-indigo-800"
            }`}
        >
          {isInsideCampus ? "Ready for Exit" : "Ready for Entry"}
        </span>
      </div>
    </div>
  </div>
);

/** Transport Mode Selection Card */
const TransportModeCard = ({ transportMode, setTransportMode }) => (
  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
    <div className="mb-3">
      <h3 className="text-sm font-bold text-slate-900">Mode of Transport</h3>
      <p className="text-xs text-slate-500">Select how you are traveling through the gate</p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => setTransportMode("SELF")}
        className={`
          p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95 flex items-center justify-between
          ${transportMode === "SELF"
            ? "border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-600/20 font-bold shadow-sm"
            : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 font-medium"
          }
        `}
      >
        <span className="text-xs">Self</span>
      </button>

      <button
        type="button"
        onClick={() => setTransportMode("SCHOOL_BUS")}
        className={`
          p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95 flex items-center justify-between
          ${transportMode === "SCHOOL_BUS"
            ? "border-amber-600 bg-amber-50/80 text-amber-900 ring-2 ring-amber-600/20 font-bold shadow-sm"
            : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 font-medium"
          }
        `}
      >
        <span className="text-xs">College Bus</span>
      </button>
    </div>
  </div>
);

/** Standard Reasons Card — options come from the backend so they always
 *  match the EntryLog enum (never hardcoded / never drift out of sync). */
const StandardReasonsCard = ({ isInside, options, reason, setReason }) => (
  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900">
        Standard Reasons for {isInside ? "Exit" : "Entry"}
      </h3>
      <p className="text-xs text-slate-500">Select standard activity option</p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      {options.map((val) => {
        const selected = reason === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => setReason(val)}
            className={`
              p-3 rounded-2xl border text-left transition-all duration-200 active:scale-95
              ${selected
                ? "border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-600/20 shadow-sm font-bold"
                : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 font-medium"
              }
            `}
          >
            <span className="text-xs leading-tight truncate block">{val}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/** "Other" Reason Card — the one option that takes a free-text note */
const OtherReasonCard = ({ reason, setReason, note, setNote }) => {
  const selected = reason === NOTE_REASON;

  return (
    <div
      className={`rounded-3xl p-5 shadow-sm border transition-all duration-200 ${selected
        ? "bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20"
        : "bg-white border-slate-100"
        }`}
    >
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">Something Else</h3>
        <p className="text-xs text-slate-500">
          Select for anything not covered above
        </p>
      </div>

      <button
        type="button"
        onClick={() => setReason(NOTE_REASON)}
        className={`
          w-full p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95 flex items-center justify-between
          ${selected
            ? "border-rose-600 bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20"
            : "border-slate-200/80 bg-slate-50 text-slate-800 hover:bg-slate-100 font-semibold"
          }
        `}
      >
        <span className="text-xs uppercase tracking-wider">Other</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${selected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}
        >
          Custom Reason
        </span>
      </button>

      {selected && (
        <div className="mt-4 pt-4 border-t border-rose-200/60">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Specify Note / Details
          </label>
          <textarea
            rows={2}
            maxLength={100}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Briefly state your reason..."
            className="w-full border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 resize-none transition-all bg-white"
          />
          <p className="text-[10px] text-slate-400 text-right mt-1 font-mono">
            {note.length}/100
          </p>
        </div>
      )}
    </div>
  );
};

/** Error Banner */
const ErrorBanner = ({ message }) => (
  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 shadow-sm">
    <svg
      className="w-5 h-5 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <div className="text-xs font-semibold leading-relaxed">{message}</div>
  </div>
);

/** Cooldown Popup — shown when scanning too soon after the last action */
const CooldownPopup = ({ waitSeconds, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(waitSeconds);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
      <div
        className={`
          relative w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl
          transition-all duration-300 ease-out
          ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
        `}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Close popup"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors active:scale-95"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="relative w-24 h-24 mx-auto mb-5">
          <span className="absolute inset-0 rounded-full bg-amber-100 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center">
            <svg
              className="w-11 h-11 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
          Please Wait
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mt-3 mb-2 tracking-tight">
          Scanning Too Soon
        </h2>

        <p className="text-sm text-slate-500 mb-5">
          You need to wait a moment before your next scan.
        </p>

        <div className="mx-auto mb-6 w-24 h-24 rounded-full border-4 border-amber-500 flex items-center justify-center">
          <span className="text-3xl font-black text-amber-600 font-mono">
            {secondsLeft}s
          </span>
        </div>

        <button
          onClick={onClose}
          type="button"
          disabled={secondsLeft > 0}
          className={`
            w-full py-3.5 px-4 font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95
            ${secondsLeft > 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 text-white"
            }
          `}
        >
          {secondsLeft > 0 ? `Wait ${secondsLeft}s...` : "Got It"}
        </button>
      </div>
    </div>
  );
};

/** Daily Limit Popup — shown when the student has used up all their entry/exit passes for the day */
const DailyLimitPopup = ({ action, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
      <div
        className={`
          relative w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl
          transition-all duration-300 ease-out
          ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
        `}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Close popup"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors active:scale-95"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="relative w-24 h-24 mx-auto mb-5">
          <span className="absolute inset-0 rounded-full bg-rose-100 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-rose-500 flex items-center justify-center">
            <svg
              className="w-11 h-11 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
          Limit Reached
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mt-3 mb-2 tracking-tight">
          Daily {action === "EXIT" ? "Exit" : "Entry"} Limit Reached
        </h2>

        <p className="text-sm text-slate-500 mb-6">
          You've used all your allowed {action === "EXIT" ? "exits" : "entries"} for today.
          Please contact the gate office if you need further assistance.
        </p>

        <button
          onClick={onClose}
          type="button"
          className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95"
        >
          Okay
        </button>
      </div>
    </div>
  );
};

/** GPay-style success popup — overlays the current page (doesn't replace
 *  it), scales/pops in, pulses a ring behind the checkmark, then shows
 *  a boarding-pass style stub with the student's Name & MIS in large
 *  type before the rest of the verification summary. */
const SuccessPopup = ({ verification, user, onDone }) => {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isBus = verification?.transportMode === "SCHOOL_BUS";
  const actionLabel = (verification?.action || "PASS").toString().toUpperCase();
  const verifiedAt = new Date(verification?.time || Date.now());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
      <div
        className={`
          relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl
          transition-all duration-300 ease-out
          ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
        `}
      >
        {/* Success Icon — compact */}
        <div className="relative w-16 h-16 mx-auto mb-3">
          <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Verification Complete
        </span>

        <h2 className="text-lg font-extrabold text-slate-900 mt-2 mb-4 tracking-tight">
          {actionLabel} SUCCESSFUL
        </h2>

        {/* ===== Pass Stub — Name, MIS, Room in one compact block ===== */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-4 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-slate-400">
              Campus Gate Pass
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
              {actionLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                Student
              </span>
              <p className="text-lg font-black tracking-tight leading-tight text-slate-900 truncate">
                {user?.name || "Student Name"}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {user?.hostel || "N/A"} • R-{user?.room || "N/A"}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                MIS
              </span>
              <p className="text-base font-black font-mono tracking-widest text-slate-900">
                {user?.mis || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Transport Mode — compact pill instead of full-width banner */}
        <div
          className={`
            inline-flex items-center gap-1.5 mx-auto mb-4 px-3.5 py-2 rounded-full border
            ${isBus ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-300"}
          `}
        >
          <svg
            className={`w-4 h-4 ${isBus ? "text-amber-600" : "text-blue-600"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isBus ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 6v6m8-6v6M3 12h18M4 12v6a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
              />
            )}
          </svg>
          <span
            className={`text-xs font-extrabold uppercase tracking-wide ${isBus ? "text-amber-700" : "text-blue-700"
              }`}
          >
            {isBus ? "College Bus" : "Self Transport"}
          </span>
        </div>

        {/* Verification Summary — 2-column grid, same data, less height */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs border-t border-slate-100 pt-4 text-left">
          <div>
            <span className="block text-slate-400 font-medium text-[10px]">Gate</span>
            <span className="font-bold text-slate-800">{verification?.gateName || "Main Gate"}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium text-[10px]">Date</span>
            <span className="font-bold text-slate-800">
              {verifiedAt.toLocaleDateString([], { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium text-[10px]">Time</span>
            <span className="font-bold text-slate-800">
              {verifiedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium text-[10px]">Distance</span>
            <span className="font-bold text-emerald-600 font-mono">
              {verification?.distance ?? 0}m
            </span>
          </div>
          <div className="col-span-2">
            <span className="block text-slate-400 font-medium text-[10px]">Reason</span>
            <span className="font-bold text-slate-800">{verification?.reason || "Not specified"}</span>
          </div>
        </div>

        {/* Manual Close Button — no auto-redirect, this is a gate pass */}
        <button
          onClick={handleClose}
          type="button"
          className="w-full mt-5 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN CONTAINER
// ==========================================

const GateScanner = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { isAuthenticated, loading: authLoading, user, loadUser } = useAuth();

  const [now, setNow] = useState(new Date());
  const [gate, setGate] = useState(null);
  const [entryReasons, setEntryReasons] = useState([]);
  const [exitReasons, setExitReasons] = useState([]);
  const [loadingGate, setLoadingGate] = useState(true);

  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  // "pending" | "denied" | "unavailable" | "timeout" | "granted"
  const [gpsStatus, setGpsStatus] = useState("pending");

  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [transportMode, setTransportMode] = useState("SELF");

  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState("");

  // Holds { type: "COOLDOWN" | "DAILY_LIMIT", waitSeconds?, action? } or null.
  // Separate from `error` so these get their own popup treatment instead
  // of the plain inline ErrorBanner.
  const [blockedState, setBlockedState] = useState(null);

  const watchIdRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGate = async () => {
      try {
        const response = await getGateDetails(slug);
        if (!cancelled) {
          setGate(response.data.gate);
          setEntryReasons(response.data.entryReasons || []);
          setExitReasons(response.data.exitReasons || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Invalid or unreachable gate."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingGate(false);
        }
      }
    };

    if (slug) {
      loadGate();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Watches position and maps the three distinct GeolocationPositionError
  // codes to distinct statuses instead of collapsing everything into
  // "denied". PERMISSION_DENIED (1) really is permission; POSITION_UNAVAILABLE
  // (2) means no fix could be obtained (bad signal / no GPS chip / no
  // network for WiFi positioning); TIMEOUT (3) means it took too long and
  // watchPosition will keep trying on its own.
  useEffect(() => {
    if (!gate) return;

    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setAccuracy(
          typeof position.coords.accuracy === "number"
            ? position.coords.accuracy
            : null
        );
        setGpsStatus("granted");
      },
      (geoError) => {
        switch (geoError?.code) {
          case 1: // PERMISSION_DENIED
            setGpsStatus("denied");
            break;
          case 3: // TIMEOUT
            setGpsStatus("timeout");
            break;
          case 2: // POSITION_UNAVAILABLE
          default:
            setGpsStatus("unavailable");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [gate]);

  const distance = useMemo(() => {
    if (!gate || !coords) return null;
    return calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      gate.latitude,
      gate.longitude
    );
  }, [gate, coords]);

  // A fix only "counts" if it's both within radius AND precise enough to
  // trust. Without the accuracy check, a rough WiFi-based fix (common on
  // laptops or with weak signal) could wrongly pass or fail the check.
  const isAccuracyAcceptable = useMemo(() => {
    return accuracy === null || accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS;
  }, [accuracy]);

  const gpsVerified = useMemo(() => {
    return (
      gpsStatus === "granted" &&
      gate &&
      distance !== null &&
      distance <= (gate.radius || 200) &&
      isAccuracyAcceptable
    );
  }, [gpsStatus, gate, distance, isAccuracyAcceptable]);

  // Which list applies depends on direction: inside campus -> about to
  // EXIT -> exit reasons; outside campus -> about to ENTER -> entry reasons.
  const standardOptions = useMemo(() => {
    const list = user?.isInsideCampus ? exitReasons : entryReasons;
    return list.filter((r) => r !== NOTE_REASON);
  }, [user?.isInsideCampus, exitReasons, entryReasons]);

  const canSubmit = Boolean(reason) && gpsVerified && !submitting;

  const handleSubmit = useCallback(async () => {
    setError("");

    if (!reason) {
      setError("Please select a reason before submitting.");
      return;
    }

    if (gpsStatus === "denied") {
      setError("Location permission is denied. Enable it in browser settings and reload.");
      return;
    }

    if (gpsStatus === "unavailable" || gpsStatus === "timeout" || !coords) {
      setError("Still trying to get a GPS fix. Please wait a moment and try again.");
      return;
    }

    if (!isAccuracyAcceptable) {
      setError(
        `GPS signal too weak to verify (±${Math.round(accuracy)}m). Move to an open area and try again.`
      );
      return;
    }

    if (!gpsVerified) {
      setError(
        `Outside gate area. You are ${Math.round(distance)}m away (Radius limit: ${gate?.radius || 200
        }m).`
      );
      return;
    }

    try {
      setSubmitting(true);

      // Matches the backend contract exactly — the server derives the
      // ENTRY/EXIT action and distance itself, it doesn't take them
      // from the client.
      const payload = {
        slug,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy,
        reason,
        additionalNote: reason === NOTE_REASON ? note : undefined,
        transportMode,
      };

      const response = await verifyGateWithResilience(payload);

      // verifyGate's response IS the log summary — no nested "pass" key.
      setVerification(response.data);

      if (typeof loadUser === "function") {
        await loadUser();
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const message = err.response?.data?.message;

      if (code === "COOLDOWN") {
        const match = /(\d+)s/.exec(message || "");
        const waitSeconds = match ? parseInt(match[1], 10) : 30;
        setBlockedState({ type: "COOLDOWN", waitSeconds });
      } else if (code === "DAILY_LIMIT") {
        setBlockedState({
          type: "DAILY_LIMIT",
          action: user?.isInsideCampus ? "EXIT" : "ENTRY",
        });
      } else if (!err.response) {
        // No server response after retries — genuine connectivity issue.
        setError(
          "Couldn't reach the server. Please check your internet connection and try again."
        );
      } else {
        setError(
          message ||
          "Verification failed. Please check network connection and try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    reason,
    gpsStatus,
    coords,
    gpsVerified,
    isAccuracyAcceptable,
    accuracy,
    distance,
    gate,
    slug,
    note,
    transportMode,
    loadUser,
    user?.isInsideCampus,
  ]);

  const handleGoToDashboard = useCallback(() => {
    navigate("/student/dashboard");
  }, [navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated) {
    sessionStorage.setItem("redirectAfterLogin", `/gate/${slug}`);
    return <Navigate to="/" replace />;
  }

  if (loadingGate) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!gate) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-sm w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 text-center shadow-xl">
          <p className="text-rose-400 font-semibold text-sm mb-4">
            {error || "Gate not found or invalid URL."}
          </p>
          <button
            onClick={handleGoToDashboard}
            className="w-full py-2.5 bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isInside = user?.isInsideCampus;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Header gateName={gate.gateName} now={now} onBack={handleGoToDashboard} />

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-36">
        <CampusStatusCard isInsideCampus={isInside} />

        <StudentProfileCard user={user} />

        <GpsCard
          gpsStatus={gpsStatus}
          gpsVerified={gpsVerified}
          distance={distance}
          allowedRadius={gate.radius || 200}
          accuracy={accuracy}
        />

        {/* Transport Mode Selection Card */}
        <TransportModeCard
          transportMode={transportMode}
          setTransportMode={setTransportMode}
        />

        <StandardReasonsCard
          isInside={isInside}
          options={standardOptions}
          reason={reason}
          setReason={setReason}
        />

        <OtherReasonCard
          reason={reason}
          setReason={setReason}
          note={note}
          setNote={setNote}
        />

        {error && <ErrorBanner message={error} />}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 p-4 z-20 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all duration-200 active:scale-98
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isInside
                ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Logging {isInside ? "Exit" : "Entry"}...
              </span>
            ) : isInside ? (
              "Confirm Exit Campus"
            ) : (
              "Confirm Entry Campus"
            )}
          </button>

          <button
            onClick={handleGoToDashboard}
            type="button"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel & Return to Dashboard
          </button>
        </div>
      </div>

      {verification && (
        <SuccessPopup
          verification={verification}
          user={user}
          onDone={handleGoToDashboard}
        />
      )}

      {blockedState?.type === "COOLDOWN" && (
        <CooldownPopup
          waitSeconds={blockedState.waitSeconds}
          onClose={() => setBlockedState(null)}
        />
      )}

      {blockedState?.type === "DAILY_LIMIT" && (
        <DailyLimitPopup
          action={blockedState.action}
          onClose={() => setBlockedState(null)}
        />
      )}
    </div>
  );
};

export default GateScanner;