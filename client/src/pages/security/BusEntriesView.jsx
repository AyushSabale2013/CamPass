import { useState, useMemo } from "react";
import LogCard from "../../components/security/LogCard";

// Shared field extraction — avoids re-deriving name/mis/email with the
// same fallback chain in multiple places (filter + count, if ever needed).
const getSearchableFields = (log) => ({
  name: (log.studentName || log.student?.name || log.name || "").toLowerCase(),
  mis: (log.studentMis || log.student?.mis || log.mis || "").toLowerCase(),
  email: (log.studentEmail || log.student?.email || log.email || "").toLowerCase(),
});

// Extracts "HH:MM" from a log's createdAt for time-range comparisons.
const getLogTimeString = (log) => {
  if (!log.createdAt) return null;
  const d = new Date(log.createdAt);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const BusEntriesView = ({
  logs,
  fetching,
  total,
  busDate,
  setBusDate,
  getTodayDateStr,
  setView,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter logs based on search term and time-of-day range.
  // Date is handled by the parent (busDate/setBusDate drive the actual
  // fetch from /bus-logs), so it isn't re-filtered here — only search
  // and time-of-day, both local state, same pattern as TodaysLogsView.
  const filteredLogs = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return logs.filter((log) => {
      if (query) {
        const { name, mis, email } = getSearchableFields(log);
        const matchesSearch = name.includes(query) || mis.includes(query) || email.includes(query);
        if (!matchesSearch) return false;
      }

      const logTimeString = getLogTimeString(log);
      if (logTimeString === null) return true;

      if (startTime && logTimeString < startTime) return false;
      if (endTime && logTimeString > endTime) return false;

      return true;
    });
  }, [logs, searchTerm, startTime, endTime]);

  // Formatted display of the currently selected date, for the count card.
  const formattedBusDate = useMemo(() => {
    if (!busDate) return "";
    const d = new Date(`${busDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return busDate;
    return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  }, [busDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setStartTime("");
    setEndTime("");
    if (typeof setBusDate === "function" && typeof getTodayDateStr === "function") {
      setBusDate(getTodayDateStr());
    }
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

  const isCustomDate = typeof getTodayDateStr === "function" && busDate !== getTodayDateStr();
  const activeFiltersCount =
    (searchTerm ? 1 : 0) + (startTime || endTime ? 1 : 0) + (isCustomDate ? 1 : 0);

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
          <h2 className="text-sm font-extrabold text-slate-900">Bus Entries</h2>
          <p className="text-[11px] text-slate-500">
            Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> records
            {typeof total === "number" && <> (Total DB: <strong>{total}</strong>)</>}
          </p>
        </div>
        <button
          onClick={() => setView("dashboard")}
          className="px-3 py-1.5 bg-slate-900 text-white active:bg-slate-800 rounded-lg text-xs font-bold transition-all"
        >
          &larr; Back
        </button>
      </div>

      {/* Bus Entries — Total Count for Selected Date */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6v6m8-6v6M3 12h18M4 12v6a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5" />
          </svg>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Bus Entries {formattedBusDate ? `— ${formattedBusDate}` : ""}
          </span>
          <span className="text-xl font-black text-slate-900 leading-tight">
            {logs.length}
          </span>
        </div>
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

        {/* Date Picker Row */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
          <label className="text-[11px] font-bold text-slate-600 uppercase shrink-0">
            Date
          </label>
          <input
            type="date"
            value={busDate}
            max={typeof getTodayDateStr === "function" ? getTodayDateStr() : undefined}
            onChange={(e) => setBusDate(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:border-slate-900 transition cursor-pointer"
          />
          {isCustomDate && (
            <button
              onClick={() => setBusDate(getTodayDateStr())}
              className="text-[10px] font-black text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:bg-cyan-100 transition"
            >
              Today
            </button>
          )}
        </div>

        {/* Row for Advanced Filter Toggle */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
              showAdvanced || startTime || endTime
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time Filter
            {(startTime || endTime) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Expandable Time Range Filter Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Filter by Time Slot
              </h3>
            </div>

            {/* Quick Presets (Only 4 options) */}
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

export default BusEntriesView;