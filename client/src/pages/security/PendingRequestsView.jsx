import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { getPendingRequests, approveGateRequest, rejectGateRequest } from "../../services/gateService";
import Loader from "../../components/common/Loader";

const POLL_INTERVAL_MS = 5000;

/** Large Live "Xm Ys left" timer display */
const CountdownLabel = ({ expiresAt }) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const urgent = secondsLeft <= 60;

  return (
    <span className={`text-base font-mono font-black ${urgent ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
};

const RequestCard = ({ request, onApprove, onReject, busy }) => {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  const isEntry = request.action === "ENTRY";
  const formattedDate = request.createdAt 
    ? new Date(request.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    : "N/A";

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 transition-all">
      {/* Top Header: Larger MIS Tag & Entry/Exit Highlight */}
      <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 text-base font-black tracking-wide bg-slate-900 text-white rounded-xl shadow-xs">
            {request.student?.mis || "MIS N/A"}
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">
            {request.student?.name || "Unknown Student"}
          </span>
        </div>

        <span
          className={`shrink-0 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg shadow-2xs ${
            isEntry 
              ? "bg-emerald-100 text-emerald-900 border border-emerald-300" 
              : "bg-blue-100 text-blue-900 border border-blue-300"
          }`}
        >
          {request.action}
        </span>
      </div>

      {/* Grid details block (phone removed) */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs text-slate-700 mb-3">
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400">Hostel & Room</span>
          <span className="font-semibold text-slate-900">{request.student?.hostel || "N/A"} • R-{request.student?.room || "N/A"}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400">Time & Date</span>
          <span className="font-semibold text-slate-900">{formattedDate}</span>
        </div>

        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400">Expires In</span>
          <CountdownLabel expiresAt={request.expiresAt} />
        </div>
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400">Gate Name</span>
          <span className="font-semibold text-slate-900 truncate">{request.gateName}</span>
        </div>

        <div className="col-span-2 pt-1 border-t border-slate-50">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Reason</span>
          <span className="font-semibold text-slate-900">
            {request.reason}
            {request.additionalNote ? ` — ${request.additionalNote}` : ""}
          </span>
        </div>

        <div className="col-span-2">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Transport</span>
          <span className="font-semibold text-slate-900">{request.transportMode === "SCHOOL_BUS" ? "College Bus" : "Self"}</span>
        </div>
      </div>

      {showRejectNote && (
        <input
          type="text"
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
          maxLength={200}
          placeholder="Optional note for the student..."
          className="w-full mb-2.5 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      )}

      {/* Action Buttons with fast snappy scale animations */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove(request.id)}
          className="py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 active:scale-90 transition-transform duration-75 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!showRejectNote) {
              setShowRejectNote(true);
              return;
            }
            onReject(request.id, rejectionNote);
          }}
          className="py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide text-white bg-rose-600 hover:bg-rose-700 active:scale-90 transition-transform duration-75 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {showRejectNote ? "Confirm Reject" : "Reject"}
        </button>
      </div>
    </div>
  );
};

const PendingRequestsView = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState(() => new Set());
  
  // Gate selection state: null = menu, "main" or "godavari" = respective list view
  const [selectedGate, setSelectedGate] = useState(null);

  const fetchRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await getPendingRequests();
      setRequests(response.data.requests || []);
      setError("");
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || "Could not load pending requests.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => fetchRequests({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const withBusy = async (id, action) => {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await action();
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Action failed. The list will refresh.");
      fetchRequests({ silent: true });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApprove = (id) => withBusy(id, () => approveGateRequest(id));
  const handleReject = (id, rejectionNote) => withBusy(id, () => rejectGateRequest(id, rejectionNote));

  // Count active pending requests per gate
  const mainGateCount = useMemo(() => 
    requests.filter((r) => r.gateName?.toLowerCase().includes("main")).length,
  [requests]);

  const godavariCount = useMemo(() => 
    requests.filter((r) => r.gateName?.toLowerCase().includes("godavari")).length,
  [requests]);

  // Filter requests when inside a specific gate view
  const filteredRequests = useMemo(() => {
    if (!selectedGate) return [];
    return requests.filter((req) => 
      req.gateName?.toLowerCase().includes(selectedGate)
    );
  }, [requests, selectedGate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md text-slate-900 border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedGate) {
                setSelectedGate(null);
              } else {
                navigate("/security/dashboard");
              }
            }}
            className="flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            {selectedGate ? "← Back to Gates" : "Dashboard"}
          </button>
          <h1 className="text-xs font-bold tracking-tight text-slate-900">
            {selectedGate ? `${selectedGate === "main" ? "Main Gate" : "Godavari Gate"} Requests` : "Select Gate"}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-3 pb-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-red-900 text-xs font-semibold">
            {error}
          </div>
        ) : !selectedGate ? (
          // Square Box Selection Menu
          <div className="grid grid-cols-2 gap-3.5 pt-4">
            <button
              type="button"
              onClick={() => setSelectedGate("main")}
              className="aspect-square bg-white border border-slate-200 hover:border-slate-400 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition-all relative group cursor-pointer"
            >
              {mainGateCount > 0 && (
                <span className="absolute top-3 right-3 bg-blue-600 text-white font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                  {mainGateCount}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-slate-900">Main Gate</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{mainGateCount} pending</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGate("godavari")}
              className="aspect-square bg-white border border-slate-200 hover:border-slate-400 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition-all relative group cursor-pointer"
            >
              {godavariCount > 0 && (
                <span className="absolute top-3 right-3 bg-blue-600 text-white font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                  {godavariCount}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-slate-900">Godavari Gate</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{godavariCount} pending</p>
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-xs border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">No pending requests for this gate right now.</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              busy={busyIds.has(request.id)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </main>
    </div>
  );
};

export default PendingRequestsView;