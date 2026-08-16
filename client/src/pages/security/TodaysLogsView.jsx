import { useState, useMemo } from "react";
import LogCard from "../../components/security/LogCard";

// Reads a log's gate name from whichever shape the API sends it in —
// mirrors the same "try a few known field names" pattern already used
// for studentName/mis/email below, so it stays consistent even if the
// backend nests gate info differently across endpoints.
const getGateName = (log) =>
  log.gateName || log.gate?.name || log.gate?.gateName || log.gate || "";

const TodaysLogsView = ({ logs, fetching, total, setView }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "IN" | "OUT"
  const [gateFilter, setGateFilter] = useState("all"); // "all" | exact gate name
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Unique gate names present in today's logs, so the filter always
  // matches real data (e.g. "Main Gate", "Godavari") instead of a
  // hardcoded list that could drift if gates are renamed or added.
  const availableGates = useMemo(() => {
    const names = new Set();
    logs.forEach((log) => {
      const gateName = getGateName(log);
      if (gateName) names.add(gateName);
    });
    return Array.from(names).sort();
  }, [logs]);

  // Filter logs based on search term, status pill tab, gate, and time range
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const name = (log.studentName || log.student?.name || log.name || "").toLowerCase();
      const mis = (log.studentMis || log.student?.mis || log.mis || "").toLowerCase();
      const email = (log.studentEmail || log.student?.email || log.email || "").toLowerCase();

      const query = searchTerm.toLowerCase().trim();
      
      // Match Search Term across name, mis, or email
      const matchesSearch =
        !query ||
        name.includes(query) ||
        mis.includes(query) ||
        email.includes(query);

      if (!matchesSearch) return false;

      // Match Status Filter (IN / OUT)
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      // Match Gate Filter
      if (gateFilter !== "all" && getGateName(log) !== gateFilter) {
        return false;
      }

      // Match Time Range if log has a createdAt timestamp
      if (!log.createdAt) return true;

      const logDateObj = new Date(log.createdAt);
      const logHours = String(logDateObj.getHours()).padStart(2, "0");
      const logMinutes = String(logDateObj.getMinutes()).padStart(2, "0");
      const logTimeString = `${logHours}:${logMinutes}`;

      if (startTime && logTimeString < startTime) {
        return false;
      }
      if (endTime && logTimeString > endTime) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, statusFilter, gateFilter, startTime, endTime]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setGateFilter("all");
    setStartTime("");
    setEndTime("");
  };

  const applyPreset = (start, end) => {
    if (startTime === start && endTime === end) {
      setStartTime("");
      setEndTime("");
    } else {
      setStartTime(start);
      setEndTime(end);
    }
  };

  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (gateFilter !== "all" ? 1 : 0) +
    (startTime || endTime ? 1 : 0);

  const timePresets = [
    { label: "Morning", sub: "6 AM–12 PM", start: "06:00", end: "12:00" },
    { label: "Afternoon", sub: "12–5 PM", start: "12:00", end: "17:00" },
    { label: "Evening", sub: "5–9 PM", start: "17:00", end: "21:00" },
    { label: "Night", sub: "9 PM–12 AM", start: "21:00", end: "23:59" },
  ];

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Today's Access Logs</h2>
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

        {/* Row for Status Tabs and Advanced Filter Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Status Pill Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl flex-1">
            {[
              { id: "all", label: "All" },
              { id: "IN", label: "Entries" },
              { id: "OUT", label: "Exits" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
              showAdvanced || startTime || endTime || gateFilter !== "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            More Filters
            {(startTime || endTime || gateFilter !== "all") && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Expandable Gate + Time Range Filter Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
            {/* Gate Filter */}
            {availableGates.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Filter by Gate
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGateFilter("all")}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
                      gateFilter === "all"
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    All Gates
                  </button>
                  {availableGates.map((gateName) => (
                    <button
                      key={gateName}
                      onClick={() =>
                        setGateFilter(gateFilter === gateName ? "all" : gateName)
                      }
                      className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
                        gateFilter === gateName
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {gateName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Time Presets (Only 4 options) */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                Filter by Time Slot
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {timePresets.map((preset) => {
                  const isActive = startTime === preset.start && endTime === preset.end;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset.start, preset.end)}
                      className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all active:scale-95 ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs font-bold">{preset.label}</span>
                      <span className={`text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                        {preset.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Clear Filters Action Bar */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              {activeFiltersCount} active filter{activeFiltersCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-all"
            >
              Clear All Filters
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

export default TodaysLogsView;