import { useState, useMemo } from "react";
import LogCard from "../../components/security/LogCard";

const HostelersOutsideView = ({ logs, fetching, setView }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Get today's date string in YYYY-MM-DD format
  const todayString = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Filter logs for today and search term with performance optimization
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Strict Today's Date Check
      if (!log.createdAt) return false;
      const logDateObj = new Date(log.createdAt);
      const year = logDateObj.getFullYear();
      const month = String(logDateObj.getMonth() + 1).padStart(2, "0");
      const day = String(logDateObj.getDate()).padStart(2, "0");
      if (`${year}-${month}-${day}` !== todayString) return false;

      // 2. Search Term Check
      const name = (log.studentName || log.student?.name || log.name || "").toLowerCase();
      const mis = (log.studentMis || log.student?.mis || log.mis || "").toLowerCase();
      const email = (log.studentEmail || log.student?.email || log.email || "").toLowerCase();

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        name.includes(query) ||
        mis.includes(query) ||
        email.includes(query);

      return matchesSearch;
    });
  }, [logs, searchTerm, todayString]);

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Hostelers Outside Campus (Today)</h2>
          <p className="text-[11px] text-slate-500">
            Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> records
          </p>
        </div>
        <button
          onClick={() => setView("dashboard")}
          className="px-3 py-1.5 bg-slate-900 text-white active:bg-slate-800 rounded-lg text-xs font-bold transition-all"
        >
          &larr; Back
        </button>
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Search Bar with Optional Clear Icon */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, MIS, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Clear Filters Action Bar */}
        {searchTerm && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              1 active filter
            </span>
            <button
              onClick={() => setSearchTerm("")}
              className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-all"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Log Feed */}
      {fetching ? (
        <div className="bg-white p-6 rounded-xl border text-center text-slate-500 text-xs">
          Fetching records from database...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border text-center text-slate-400 text-xs font-medium">
          No records match your search criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, idx) => (
            <LogCard key={log._id || log.id || idx} log={log} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HostelersOutsideView;