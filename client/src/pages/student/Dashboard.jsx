import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getGateHistory } from "../../services/gateService";
import { formatLogDate, formatLogTime } from "../../utils/logFormat";
import Loader from "../../components/common/Loader";
import CollegeLogo from "../../assets/iiitp_logo.png";

/** Skeleton row shown while history is loading */
const HistorySkeletonRow = () => (
  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
      <div className="space-y-1.5">
        <div className="h-2.5 w-24 bg-slate-200 rounded" />
        <div className="h-2 w-16 bg-slate-200 rounded" />
      </div>
    </div>
    <div className="space-y-1.5 text-right">
      <div className="h-2.5 w-14 bg-slate-200 rounded ml-auto" />
      <div className="h-2 w-10 bg-slate-200 rounded ml-auto" />
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
  
  // State for the Important Notice Modal
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isInside = user?.isInsideCampus ?? true;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={CollegeLogo}
              alt="College Logo"
              className="w-8 h-8 rounded-xl object-contain bg-white shrink-0"
            />
            <span className="font-bold text-sm text-slate-100 tracking-tight">
              CamPass
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <button
              onClick={logout}
              className="text-xs font-semibold bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 active:scale-95 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-12">
        {/* Student Profile Overview */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
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
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {user?.name || "Student Dashboard"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              MIS: {user?.mis || "N/A"} • Room: {user?.room || "N/A"}
            </p>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {user?.email || "student@college.edu"}
            </p>
          </div>
        </div>

        {/* Warning / Important Notice Button */}
        <button
          onClick={() => setShowNotice(true)}
          className="flex items-center justify-between w-full p-3.5 rounded-3xl bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-sm border border-rose-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-rose-800">Important Rules & Warnings</p>
              <p className="text-[10px] text-rose-500 font-medium">Read before generating passes</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Live Campus Status Banner */}
        <div
          className={`rounded-3xl p-5 shadow-sm border transition-all duration-300 relative overflow-hidden ${
            isInside
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
                  className={`w-3 h-3 rounded-full ${
                    isInside ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"
                  }`}
                />
                <span
                  className={`text-lg font-black tracking-tight ${
                    isInside ? "text-emerald-700" : "text-indigo-700"
                  }`}
                >
                  {isInside ? "INSIDE CAMPUS" : "OUTSIDE CAMPUS"}
                </span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isInside
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {isInside ? "Exit Allowed" : "Entry Allowed"}
            </span>
          </div>
        </div>

        {/* Quick Scan Action Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Gate Verification
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Scan a QR code or select a gate to log your entry or exit.
          </p>

          {/* Choose Gate Grid */}
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Choose Gate
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Main Gate */}
              <button
                onClick={() => navigate("/gate/main-gate")}
                className="group p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all active:scale-95 text-left shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
                  <svg
                    className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                </div>

                <p className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                  Main Gate
                </p>

                <p className="text-xs text-slate-400 mt-1">College Main Entry</p>
              </button>

              {/* Godavari Gate */}
              <button
                onClick={() => navigate("/gate/godavari-gate")}
                className="group p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 transition-all active:scale-95 text-left shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
                  <svg
                    className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>

                <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">
                  Godavari Gate
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Godavari Hostel Entry
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Pass Logs History */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Pass Logs</h2>
            <button
              onClick={() => navigate("/student/history")}
              className="text-[11px] font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {historyLoading && (
            <div className="space-y-3">
              <HistorySkeletonRow />
              <HistorySkeletonRow />
              <HistorySkeletonRow />
            </div>
          )}

          {!historyLoading && historyError && (
            <div className="text-center py-6">
              <p className="text-xs text-rose-600 font-medium mb-3">
                {historyError}
              </p>
              <button
                onClick={loadHistory}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400 font-medium">
                No gate activity yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Scan a gate to see your entries and exits here.
              </p>
            </div>
          )}

          {!historyLoading && !historyError && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl font-black text-[10px] flex items-center justify-center shrink-0 ${
                        item.status === "IN"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {item.status === "IN" ? "IN" : "OUT"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {item.gateName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <p className="font-semibold text-slate-700">
                      {formatLogTime(item.createdAt)}
                    </p>
                    <p className="text-[10px] text-slate-400">
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
      <footer className="mt-auto py-3 px-4 bg-[#0a1128] text-center border-t border-slate-800/60">
        <p className="text-[10px] text-slate-400 font-medium truncate">
          &copy; {new Date().getFullYear()} IIIT Pune. All rights reserved. &bull;{" "}
          Developed by <span className="text-white">Ayush Sabale</span>
        </p>
      </footer>

      {/* --- MODAL OVERLAY --- */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-rose-500 p-6 text-center relative">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md text-rose-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-white">Important Notice</h3>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4 text-sm text-slate-600 font-medium">
              <p>
                You are allotted a strict limit of <strong className="text-slate-900">30 Outside passes</strong> and <strong className="text-slate-900">30 Inside passes</strong>.
              </p>
              <p>
                Please use them carefully and <strong className="text-slate-900">only in necessary cases</strong>. Do not use your passes unnecessarily.
              </p>
              
              {/* Strict Warning Box */}
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-800 text-[13px] leading-snug">
                <strong className="flex items-center gap-1.5 mb-1 text-rose-900">
                  <span className="text-rose-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Strict Action Warning:
                </strong>
                If you are found making false entries or misusing the gate pass system, you will be liable for strict disciplinary actions from the college administration.
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowNotice(false)}
                className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md"
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