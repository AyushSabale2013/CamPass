import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getGateHistory } from "../../services/gateService";
import { formatLogDate, formatLogTime } from "../../utils/logFormat";
import Loader from "../../components/common/Loader";
import CollegeLogo from "../../assets/iiitp_logo.png";

/** Clean skeleton row shown while history is loading */
const HistorySkeletonRow = () => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-slate-200 rounded" />
        <div className="h-2.5 w-20 bg-slate-200 rounded" />
      </div>
    </div>
    <div className="space-y-1.5 text-right">
      <div className="h-3 w-16 bg-slate-200 rounded ml-auto" />
      <div className="h-2.5 w-10 bg-slate-200 rounded ml-auto" />
    </div>
  </div>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [showNotice, setShowNotice] = useState(false);

  // Clock tick for live display
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadHistory = async () => {
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const response = await getGateHistory(5);
      setHistory(response.data.logs || []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.message || "Couldn't load recent activity."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isInside = user?.isInsideCampus ?? true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={CollegeLogo}
              alt="College Logo"
              className="w-8 h-8 rounded-xl object-contain bg-slate-100 p-0.5 border border-slate-200 shrink-0"
            />
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                CamPass
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wide block uppercase">
                IIIT Pune
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <button
              onClick={logout}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-12">
        
        {/* Student Profile Overview Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center gap-4">
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
            <h1 className="text-base font-bold text-slate-900 truncate">
              {user?.name || "Student Dashboard"}
            </h1>
            <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
              MIS: {user?.mis || "N/A"} &bull; Room: {user?.room || "N/A"}
            </p>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {user?.email || "student@college.edu"}
            </p>
          </div>
        </div>

        {/* Live Campus Status Banner */}
        <div
          className={`rounded-2xl p-4 shadow-xs border transition-all ${
            isInside
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
              : "bg-blue-50/60 border-blue-200 text-blue-950"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                Current Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isInside ? "bg-emerald-600 animate-pulse" : "bg-blue-600"
                  }`}
                />
                <span className="text-base font-bold tracking-tight">
                  {isInside ? "INSIDE CAMPUS" : "OUTSIDE CAMPUS"}
                </span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isInside
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isInside ? "Exit Allowed" : "Entry Allowed"}
            </span>
          </div>
        </div>

        {/* Warning / Important Notice Button */}
        <button
          onClick={() => setShowNotice(true)}
          className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 hover:bg-amber-100/60 transition-colors active:scale-[0.98] shadow-xs text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 font-bold">
              !
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Daily Limit: 30 Entries & 30 Exits</p>
              <p className="text-[11px] text-amber-700 font-medium">Tap to read safety rules & warnings</p>
            </div>
          </div>
          <span className="text-amber-700 font-bold text-sm pr-1">&rarr;</span>
        </button>

        {/* Request Gate Pass Section (Larger Buttons with Custom SVGs) */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Request Gate Pass
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a gate for security approval.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Main Gate Request Button */}
            <button
              onClick={() => navigate("/gate/main-gate/request")}
              className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-95 text-left shadow-xs h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Main Gate</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Request Approval &rarr;</p>
              </div>
            </button>

            {/* Godavari Gate Request Button */}
            <button
              onClick={() => navigate("/gate/godavari-gate/request")}
              className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-95 text-left shadow-xs h-32"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Godavari Gate</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Request Approval &rarr;</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Pass Logs History Section */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Pass Logs</h2>
            <button
              onClick={() => navigate("/student/history")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {historyLoading && (
            <div className="space-y-2.5">
              <HistorySkeletonRow />
              <HistorySkeletonRow />
              <HistorySkeletonRow />
            </div>
          )}

          {!historyLoading && historyError && (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-red-600 font-medium mb-2">
                {historyError}
              </p>
              <button
                onClick={loadHistory}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-600">
                No gate activity recorded yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your entries and exits will appear here.
              </p>
            </div>
          )}

          {!historyLoading && !historyError && history.length > 0 && (
            <div className="space-y-2.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        item.status === "IN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.status === "IN" ? "IN" : "OUT"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {item.gateName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <p className="font-semibold text-slate-800">
                      {formatLogTime(item.createdAt)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatLogDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-3 px-4 bg-white text-center border-t border-slate-200">
        <p className="text-[11px] text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} IIIT Pune. All rights reserved. &bull;{" "}
          Developed by <span className="text-slate-800 font-semibold">Ayush Sabale</span>
        </p>
      </footer>

      {/* --- IMPORTANT NOTICE MODAL --- */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-center text-white">
              <h3 className="text-base font-bold">Important Notice</h3>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-xs text-slate-700 font-medium leading-relaxed">
              <p>
                You are allotted a strict limit of <strong className="text-slate-900 font-bold">30 Outside passes</strong> and <strong className="text-slate-900 font-bold">30 Inside passes</strong>.
              </p>
              <p>
                Please use them carefully and <strong className="text-slate-900 font-bold">only in necessary cases</strong>. Do not use your passes unnecessarily.
              </p>

              {/* Warning Box */}
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 text-[11px]">
                <strong className="block mb-1 font-bold text-red-950">Strict Action Warning:</strong>
                If you are found making false entries or misusing the gate pass system, you will be liable for strict disciplinary actions from the college administration.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setShowNotice(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xs"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;