import { useState, useMemo } from "react";
import LogCard from "../../components/security/LogCard";

// Time-of-day slot boundaries — shared by the "Time of Day" filter buttons
// below. Comparison is plain string comparison against "HH:MM", same
// approach the codebase already uses elsewhere for time-range filtering.
const TIME_SLOTS = [
  { id: "morning", label: "Morning", sub: "6 AM–12 PM", start: "06:00", end: "12:00" },
  { id: "afternoon", label: "Afternoon", sub: "12–5 PM", start: "12:00", end: "17:00" },
  { id: "evening", label: "Evening", sub: "5–9 PM", start: "17:00", end: "21:00" },
  { id: "night", label: "Night", sub: "9 PM–12 AM", start: "21:00", end: "23:59" },
];

// Local YYYY-MM-DD (matches the format <input type="date"> uses, and the
// same local-time formatting the filter already applies to log dates).
const toDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const AllLogsView = ({ logs, fetching, setView }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "IN" | "OUT"
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("all"); // "all" | "morning" | "afternoon" | "evening" | "night"
  const [showAdvanced, setShowAdvanced] = useState(false);

  const todayValue = useMemo(() => toDateInputValue(new Date()), []);
  const yesterdayValue = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateInputValue(d);
  }, []);

  // Filter logs based on search term, status pill tab, specific date, and time-of-day slot.
  const filteredLogs = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const activeSlot = timeSlot !== "all" ? TIME_SLOTS.find((s) => s.id === timeSlot) : null;
    // Skip parsing/formatting createdAt entirely when no date/time filter
    // is active — avoids a `new Date()` + string-pad on every row for the
    // most common view state (just search/status, no date narrowing).
    const needsDateInfo = Boolean(selectedDate) || Boolean(activeSlot);

    return logs.filter((log) => {
      const name = (log.studentName || log.student?.name || log.name || "").toLowerCase();
      const mis = (log.studentMis || log.student?.mis || log.mis || "").toLowerCase();
      const email = (log.studentEmail || log.student?.email || log.email || "").toLowerCase();

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

      if (!needsDateInfo) return true;
      if (!log.createdAt) return false;

      const logDateObj = new Date(log.createdAt);

      // Match Selected Date, if set
      if (selectedDate) {
        const logDateString = toDateInputValue(logDateObj);
        if (logDateString !== selectedDate) return false;
      }

      // Match Time-of-Day Slot, if set
      if (activeSlot) {
        const hours = String(logDateObj.getHours()).padStart(2, "0");
        const minutes = String(logDateObj.getMinutes()).padStart(2, "0");
        const logTimeString = `${hours}:${minutes}`;
        if (logTimeString < activeSlot.start || logTimeString > activeSlot.end) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, statusFilter, selectedDate, timeSlot]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedDate("");
    setTimeSlot("all");
  };

  const clearDateAndTimeFilters = () => {
    setSelectedDate("");
    setTimeSlot("all");
  };

  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (selectedDate ? 1 : 0) +
    (timeSlot !== "all" ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Complete Access History</h2>
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

        {/* Row for Status Tabs and Filters Toggle */}
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

          {/* Toggle Date & Time Filters Button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
              showAdvanced || selectedDate || timeSlot !== "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filters
            {(selectedDate || timeSlot !== "all") && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Expandable Date + Time-of-Day Filter Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 space-y-4 animate-fadeIn">
            {/* --- Date Section --- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Filter by Date
                </h3>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
                  >
                    Reset Date
                  </button>
                )}
              </div>

              {/* Quick date shortcuts — both just set selectedDate, the
                  actual "selector" stays the single native date input below */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedDate(todayValue)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    selectedDate === todayValue
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(yesterdayValue)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    selectedDate === yesterdayValue
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Yesterday
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-sm cursor-pointer"
                />
                {selectedDate && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* --- Time of Day Section --- */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Filter by Time of Day
                </h3>
                {timeSlot !== "all" && (
                  <button
                    onClick={() => setTimeSlot("all")}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isActive = timeSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setTimeSlot(isActive ? "all" : slot.id)}
                      className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all active:scale-95 ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs font-bold">{slot.label}</span>
                      <span className={`text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                        {slot.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(selectedDate || timeSlot !== "all") && (
              <button
                onClick={clearDateAndTimeFilters}
                className="w-full text-center text-[11px] font-bold text-rose-600 hover:text-rose-700 transition pt-1"
              >
                Clear Date & Time Filters
              </button>
            )}
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

export default AllLogsView;