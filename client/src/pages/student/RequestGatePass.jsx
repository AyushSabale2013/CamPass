import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getGateDetails, submitGateRequest, getMyRequests } from "../../services/gateService";

import Loader from "../../components/common/Loader";

// ==========================================
// 1. CONSTANTS & UTILS
// ==========================================

const NOTE_REASON = "Other";
const POLL_INTERVAL_MS = 4000;
const COOLDOWN_MS = 30 * 1000; // 30s between any two requests (entry or exit)
const TICKET_AUTO_REDIRECT_MS = 5 * 60 * 1000; // 5 min

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatClock = (totalSeconds) => {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// localStorage is only used as an instant local fallback so the lock/cooldown
// still work immediately after this tab acts, before the server round-trip
// on next mount confirms it. The server response (getMyRequests) is always
// treated as the source of truth on mount.
const cooldownStorageKey = (userId) => `campass_cooldown_until_${userId || "anon"}`;

const readLocalCooldown = (userId) => {
  try {
    const raw = localStorage.getItem(cooldownStorageKey(userId));
    const until = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
};

const writeLocalCooldown = (userId, until) => {
  try {
    localStorage.setItem(cooldownStorageKey(userId), String(until));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
};

// ==========================================
// 2. SUB-COMPONENTS (Bright Professional Theme)
// ==========================================

const Header = ({ gateName, now, onBack }) => (
  <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md text-slate-900 border-b border-slate-200 px-4 py-3 shadow-xs">
    <div className="max-w-md mx-auto flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
        aria-label="Back to Dashboard"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Dashboard
      </button>

      <div className="text-right">
        <h1 className="text-xs font-bold tracking-tight text-slate-900">
          {gateName || "CamPass Gate"}
        </h1>
        <p className="text-[11px] font-medium text-slate-500">
          {now.toLocaleDateString([], { month: "short", day: "numeric" })} &bull;{" "}
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  </header>
);

const GateNameBanner = ({ gateName }) => (
  <div className="flex items-center gap-3 px-1">
    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    </div>
    <div className="min-w-0">
      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        Requesting At
      </span>
      <h2 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
        {gateName || "CamPass Gate"}
      </h2>
    </div>
  </div>
);

const CampusStatusCard = ({ isInsideCampus }) => (
  <div
    className={`rounded-2xl p-4 shadow-xs border transition-all duration-300 ${
      isInsideCampus
        ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
        : "bg-blue-50/60 border-blue-200 text-blue-950"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
          Current Live Status
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isInsideCampus ? "bg-emerald-600 animate-pulse" : "bg-blue-600"}`}
          />
          <span className="text-base font-bold tracking-tight">
            {isInsideCampus ? "INSIDE CAMPUS" : "OUTSIDE CAMPUS"}
          </span>
        </div>
      </div>

      <span
        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
          isInsideCampus ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-blue-100 text-blue-800 border border-blue-200"
        }`}
      >
        {isInsideCampus ? "Exit Allowed" : "Entry Allowed"}
      </span>
    </div>
  </div>
);

const StudentProfileCard = ({ user }) => (
  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
    <div className="flex items-center gap-4">
      {user?.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.name || "Student"}
          referrerPolicy="no-referrer"
          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shadow-xs">
          {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-slate-900 truncate">{user?.name || "Student Name"}</h2>
        <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
          MIS: {user?.mis || "N/A"} &bull; Room: {user?.room || "N/A"}
        </p>
        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
      </div>
    </div>
  </div>
);

const GpsCard = ({ gpsStatus, gpsVerified, distance, allowedRadius }) => {
  const roundedDist = distance !== null ? Math.round(distance) : null;
  const isOk = gpsVerified;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
          GPS Verification
        </span>
        <div className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOk ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOk ? "bg-emerald-500" : "bg-amber-500"}`} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div>
          {gpsStatus === "pending" && (
            <>
              <h3 className="text-xs font-bold text-slate-800">Searching signal...</h3>
              <p className="text-[11px] text-slate-500">Locking onto GPS location coordinates.</p>
            </>
          )}
          {gpsStatus === "denied" && (
            <>
              <h3 className="text-xs font-bold text-red-600">Permission Denied</h3>
              <p className="text-[11px] text-slate-500">Enable location permissions in your browser settings.</p>
            </>
          )}
          {gpsStatus === "granted" && gpsVerified && (
            <>
              <h3 className="text-xs font-bold text-emerald-700">GPS Verified</h3>
              <p className="text-[11px] text-slate-500">Distance: <strong className="text-slate-800">{roundedDist}m</strong> (&le; {allowedRadius}m)</p>
            </>
          )}
          {gpsStatus === "granted" && !gpsVerified && (
            <>
              <h3 className="text-xs font-bold text-amber-700">Outside Allowed Radius</h3>
              <p className="text-[11px] text-slate-500">Distance: <strong className="text-slate-800">{roundedDist}m</strong> (Must be within {allowedRadius}m)</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TransportModeCard = ({ transportMode, setTransportMode }) => (
  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
    <div className="mb-2.5">
      <h3 className="text-xs font-bold text-slate-900">Mode of Transport</h3>
      <p className="text-[11px] text-slate-500">Select how you are traveling</p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => setTransportMode("SELF")}
        className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
          transportMode === "SELF"
            ? "border-slate-900 bg-slate-900 text-white font-bold shadow-xs"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs"
        }`}
      >
        Self
      </button>

      <button
        type="button"
        onClick={() => setTransportMode("SCHOOL_BUS")}
        className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
          transportMode === "SCHOOL_BUS"
            ? "border-slate-900 bg-slate-900 text-white font-bold shadow-xs"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs"
        }`}
      >
        College Bus
      </button>
    </div>
  </div>
);

const StandardReasonsCard = ({ isInside, options, reason, setReason }) => (
  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
    <div className="mb-3">
      <h3 className="text-xs font-bold text-slate-900">Standard Reasons for {isInside ? "Exit" : "Entry"}</h3>
      <p className="text-[11px] text-slate-500">Select standard activity option</p>
    </div>

    <div className="grid grid-cols-2 gap-2">
      {options.map((val) => {
        const selected = reason === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => setReason(val)}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 text-xs ${
              selected
                ? "border-slate-900 bg-slate-900 text-white font-bold shadow-xs"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium"
            }`}
          >
            <span className="truncate block">{val}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const OtherReasonCard = ({ reason, setReason, note, setNote }) => {
  const selected = reason === NOTE_REASON;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
      <div className="mb-2.5">
        <h3 className="text-xs font-bold text-slate-900">Something Else</h3>
        <p className="text-[11px] text-slate-500">Select for custom reasons</p>
      </div>

      <button
        type="button"
        onClick={() => setReason(NOTE_REASON)}
        className={`w-full p-3 rounded-xl border text-left transition-all active:scale-95 flex items-center justify-between text-xs ${
          selected
            ? "border-slate-900 bg-slate-900 text-white font-bold shadow-xs"
            : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 font-semibold"
        }`}
      >
        <span>Other Reason</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-md ${selected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
          Custom
        </span>
      </button>

      {selected && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Specify Note / Details</label>
          <textarea
            rows={2}
            maxLength={100}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Briefly state your reason..."
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none bg-slate-50"
          />
          <p className="text-[10px] text-slate-400 text-right mt-0.5 font-mono">{note.length}/100</p>
        </div>
      )}
    </div>
  );
};

const ErrorBanner = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-red-900 text-xs font-semibold shadow-xs">
    <span className="text-red-700 font-bold">!</span>
    <div>{message}</div>
  </div>
);

// ==========================================
// 3. PENDING / REJECTED STATUS MODAL
// ==========================================

const RequestStatusModal = ({ activeRequest, onExpired, onDone }) => {
  const isPending = activeRequest.status === "PENDING";

  const [secondsLeft, setSecondsLeft] = useState(() =>
    isPending ? Math.max(0, Math.ceil((new Date(activeRequest.expiresAt).getTime() - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!isPending) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(activeRequest.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        onExpired();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPending, activeRequest.expiresAt, onExpired]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200 p-6 text-center">

        {isPending ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              Awaiting Security Guard Review
            </span>

            <h3 className="text-base font-bold text-slate-900 mt-3 mb-1">
              {activeRequest.action === "EXIT" ? "Exit" : "Entry"} Request Sent
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Please wait while the guard verifies your request at {activeRequest.gateName}.
              {" "}You cannot open another gate&apos;s request page until this is resolved.
            </p>

            <div className="mx-auto w-20 h-20 rounded-full border-4 border-amber-500 flex items-center justify-center mb-4 bg-amber-50/50">
              <span className="text-lg font-black text-amber-700 font-mono">{formatClock(secondsLeft)}</span>
            </div>
            <p className="text-[11px] text-slate-400">Request auto-rejects if not reviewed in time.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-700 border border-red-200">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>

            <h3 className="text-base font-bold mb-1 text-red-900">
              {activeRequest.autoRejected ? "Request Timed Out" : "Request Rejected"}
            </h3>

            <p className="text-xs text-slate-600 my-2">
              {activeRequest.autoRejected
                ? "Nobody reviewed your request within 5 minutes."
                : activeRequest.rejectionNote
                  ? `Guard note: "${activeRequest.rejectionNote}"`
                  : "Your gate pass request was declined by security."}
            </p>

            <button
              onClick={onDone}
              className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98"
            >
              Done & Return to Dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
};

// ==========================================
// 3b. APPROVED TICKET MODAL
// ==========================================

const TicketModal = ({ activeRequest, user, onDone }) => {
  const isExit = activeRequest.action === "EXIT";
  const ticketDate = new Date(activeRequest.resolvedAt || activeRequest.updatedAt || Date.now());

  const [secondsLeft, setSecondsLeft] = useState(Math.floor(TICKET_AUTO_REDIRECT_MS / 1000));

  useEffect(() => {
    const deadline = Date.now() + TICKET_AUTO_REDIRECT_MS;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        onDone();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">

        <div className={`px-6 pt-6 pb-5 text-center ${isExit ? "bg-blue-50" : "bg-emerald-50"} border-b border-slate-200`}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isExit ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
            {isExit ? "Exit Approved" : "Entry Approved"}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2 truncate">
            {user?.name || "Student"}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">MIS: {user?.mis || "N/A"}</p>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-left">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hostel</span>
              <span className="text-xs font-bold text-slate-800">{user?.hostel || "N/A"}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Room</span>
              <span className="text-xs font-bold text-slate-800">{user?.room || "N/A"}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gate</span>
              <span className="text-xs font-bold text-slate-800">{activeRequest.gateName || "N/A"}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Transport</span>
              <span className="text-xs font-bold text-slate-800">{activeRequest.transportMode === "SCHOOL_BUS" ? "College Bus" : "Self"}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reason</span>
              <span className="text-xs font-bold text-slate-800">
                {activeRequest.reason}
                {activeRequest.reason === NOTE_REASON && activeRequest.additionalNote ? ` — ${activeRequest.additionalNote}` : ""}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</span>
              <span className="text-xs font-bold text-slate-800">{ticketDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time</span>
              <span className="text-xs font-bold text-slate-800">{ticketDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          </div>

          <button
            onClick={onDone}
            className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98"
          >
            Done & Return to Dashboard
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Auto-returning to dashboard in <span className="font-mono font-semibold text-slate-500">{formatClock(secondsLeft)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3c. 30s COOLDOWN MODAL (between any two requests)
// ==========================================

const CooldownModal = ({ cooldownUntil, onFinished }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        onFinished();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [cooldownUntil, onFinished]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 text-center shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Please Wait</h3>
        <p className="text-xs text-slate-500 mb-4">
          For security review reasons, you must wait a short moment between requests.
        </p>
        <div className="mx-auto w-20 h-20 rounded-full border-4 border-blue-500 flex items-center justify-center bg-blue-50/50">
          <span className="text-lg font-black text-blue-700 font-mono">{secondsLeft}s</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN CONTAINER COMPONENT
// ==========================================

const RequestGatePass = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const userId = user?._id || user?.id;

  const [now, setNow] = useState(new Date());
  const [gate, setGate] = useState(null);
  const [entryReasons, setEntryReasons] = useState([]);
  const [exitReasons, setExitReasons] = useState([]);
  const [loadingGate, setLoadingGate] = useState(true);

  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("pending");

  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [transportMode, setTransportMode] = useState("SELF");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [activeRequest, setActiveRequest] = useState(null);

  // Cross-request-cycle status check: has a request been fetched from the
  // server yet? Blocks the form (and submit) until we know for sure whether
  // there's a pending request at ANY gate, or an active cooldown.
  const [statusChecked, setStatusChecked] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const pollRef = useRef(null);
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
          setError(err.response?.data?.message || "Invalid or unreachable gate.");
        }
      } finally {
        if (!cancelled) setLoadingGate(false);
      }
    };
    if (slug) loadGate();
    return () => { cancelled = true; };
  }, [slug]);

  // --- CROSS-GATE PENDING LOCK + COOLDOWN CHECK -----------------------------
  // Runs once auth is known. This is what makes the "one pending request at a
  // time, across every gate" rule hold even if the student closes this tab,
  // opens a different gate's link, or refreshes the page mid-flow.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;

    const checkExistingStatus = async () => {
      // Instant local fallback so the button doesn't flash "enabled" for a
      // moment before the network call resolves.
      const localUntil = readLocalCooldown(userId);
      if (localUntil > Date.now()) setCooldownUntil(localUntil);

      try {
        const response = await getMyRequests(1);
        const latest = response.data?.requests?.[0];
        if (cancelled || !latest) return;

        if (latest.status === "PENDING") {
          setActiveRequest({ ...latest, autoRejected: false, rejectionNote: latest.rejectionNote || "" });
          return;
        }

        // Not pending: figure out if we're still inside the 30s cooldown
        // window from whenever that request was resolved.
        const resolvedAtRaw = latest.resolvedAt || latest.updatedAt;
        if (resolvedAtRaw) {
          const resolvedAtMs = new Date(resolvedAtRaw).getTime();
          const until = resolvedAtMs + COOLDOWN_MS;
          if (!Number.isNaN(until) && until > Date.now()) {
            setCooldownUntil(until);
          }
        }
      } catch {
        // If the status check fails, fail safe by NOT blocking the student
        // indefinitely — but we also don't clear an existing local cooldown.
      } finally {
        if (!cancelled) setStatusChecked(true);
      }
    };

    checkExistingStatus();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, userId]);

  useEffect(() => {
    if (!gate) return;
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGpsStatus("granted");
      },
      (geoError) => {
        if (geoError?.code === 1) setGpsStatus("denied");
        else if (geoError?.code === 3) setGpsStatus("timeout");
        else setGpsStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [gate]);

  const distance = useMemo(() => {
    if (!gate || !coords) return null;
    return calculateDistanceMeters(coords.latitude, coords.longitude, gate.latitude, gate.longitude);
  }, [gate, coords]);

  const gpsVerified = useMemo(() => {
    return gpsStatus === "granted" && gate && distance !== null && distance <= (gate.radius || 200);
  }, [gpsStatus, gate, distance]);

  const isInside = user?.isInsideCampus ?? true;
  const standardOptions = useMemo(() => {
    const list = isInside ? exitReasons : entryReasons;
    return list.filter((r) => r !== NOTE_REASON);
  }, [isInside, exitReasons, entryReasons]);

  const cooldownActive = cooldownUntil > Date.now();

  const canSubmit = Boolean(reason) && gpsVerified && !submitting && statusChecked && !cooldownActive && !activeRequest;

  // --- POLL WHILE PENDING ----------------------------------------------------
  useEffect(() => {
    if (!activeRequest || activeRequest.status !== "PENDING") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const response = await getMyRequests(1);
        const latest = response.data.requests?.[0];
        if (latest && latest.id === activeRequest.id && latest.status !== "PENDING") {
          // Process resolved (approved/rejected) -> stop polling next render
          // since the effect's guard condition will no longer match PENDING.
          setActiveRequest((prev) => ({ ...prev, ...latest }));
        }
      } catch {
        // transient network hiccup
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [activeRequest]);

  const handleSubmit = useCallback(async () => {
    setError("");
    if (activeRequest) {
      setError("You already have an active request in progress.");
      return;
    }
    if (cooldownActive) {
      setError("Please wait for the cooldown to finish before submitting again.");
      return;
    }
    if (!reason) {
      setError("Please select a reason before submitting.");
      return;
    }
    if (!gpsVerified || !coords) {
      setError("You must be within the allowed gate radius with active GPS.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        slug,
        latitude: coords.latitude,
        longitude: coords.longitude,
        reason,
        additionalNote: reason === NOTE_REASON ? note : undefined,
        transportMode,
      };
      const response = await submitGateRequest(payload);
      const req = response.data.request;
      setActiveRequest({
        ...req,
        gateName: req.gateName || gate?.gateName,
        reason: req.reason || reason,
        transportMode: req.transportMode || transportMode,
        additionalNote: req.additionalNote ?? (reason === NOTE_REASON ? note : undefined),
        status: "PENDING",
        autoRejected: false,
        rejectionNote: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [activeRequest, cooldownActive, reason, gpsVerified, coords, slug, note, transportMode, gate]);

  // Starts a fresh 30s lockout (persisted so it survives navigation/refresh)
  // any time a request cycle ends, whatever the outcome.
  const startCooldown = useCallback(() => {
    const until = Date.now() + COOLDOWN_MS;
    setCooldownUntil(until);
    writeLocalCooldown(userId, until);
  }, [userId]);

  const handleExpiredLocally = useCallback(() => {
    // 5-minute pending timeout with no guard review -> auto-reject and kill
    // the polling process (guarded by the poll effect's status check).
    setActiveRequest((prev) => (prev ? { ...prev, status: "REJECTED", autoRejected: true } : prev));
  }, []);

  const handleGoToDashboard = useCallback(() => {
    navigate("/student/dashboard");
  }, [navigate]);

  // Called when the student dismisses a resolved (approved/rejected) request,
  // OR when the ticket/rejection screen auto-times-out. Kills the process,
  // starts the 30s cooldown, resets the form, and returns to dashboard.
  const handleDone = useCallback(() => {
    startCooldown();
    setActiveRequest(null);
    setReason("");
    setNote("");
    navigate("/student/dashboard");
  }, [navigate, startCooldown]);

  if (authLoading || loadingGate || (isAuthenticated && !statusChecked)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated) {
    sessionStorage.setItem("redirectAfterLogin", `/gate/${slug}/request`);
    return <Navigate to="/" replace />;
  }

  if (!gate) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <p className="text-red-600 font-semibold text-xs mb-3">
            {error || "Gate not found or invalid URL."}
          </p>
          <button
            onClick={handleGoToDashboard}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isApproved = activeRequest?.status === "APPROVED";
  const isResolvedNonApproved = activeRequest && activeRequest.status !== "PENDING" && !isApproved;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header gateName={gate.gateName} now={now} onBack={handleGoToDashboard} />

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-3.5 pb-12">
        <GateNameBanner gateName={gate.gateName} />

        <CampusStatusCard isInsideCampus={isInside} />

        <StudentProfileCard user={user} />

        <GpsCard
          gpsStatus={gpsStatus}
          gpsVerified={gpsVerified}
          distance={distance}
          allowedRadius={gate.radius || 200}
        />

        <TransportModeCard transportMode={transportMode} setTransportMode={setTransportMode} />

        <StandardReasonsCard
          isInside={isInside}
          options={standardOptions}
          reason={reason}
          setReason={setReason}
        />

        <OtherReasonCard reason={reason} setReason={setReason} note={note} setNote={setNote} />

        {error && <ErrorBanner message={error} />}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider text-white shadow-xs transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
        >
          {submitting ? "Submitting..." : "Submit for Approval"}
        </button>

        <button
          onClick={handleGoToDashboard}
          type="button"
          className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Cancel & Return to Dashboard
        </button>
      </main>

      {/* Pending / rejected popup */}
      {activeRequest && !isApproved && (
        <RequestStatusModal
          activeRequest={activeRequest}
          onExpired={handleExpiredLocally}
          onDone={handleDone}
        />
      )}

      {/* Approved ticket popup */}
      {activeRequest && isApproved && (
        <TicketModal
          activeRequest={activeRequest}
          user={user}
          onDone={handleDone}
        />
      )}

      {/* 30s cooldown popup, shown whenever no active request is blocking the
          page but the student is still inside the post-request lockout.
          When it finishes, send them back to the dashboard rather than
          silently unblocking the form on stale GPS/reason state. */}
      {!activeRequest && cooldownActive && (
        <CooldownModal
          cooldownUntil={cooldownUntil}
          onFinished={() => {
            setCooldownUntil(0);
            navigate("/student/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default RequestGatePass;