import { useState, useMemo } from "react";
import LogCard from "../../components/security/LogCard";

// Time-of-day slots — sent to the backend as startTime/endTime query
// params so filtering happens in the DB query, not in the browser.
const TIME_SLOTS = [
  { id: "morning", label: "Morning", sub: "6 AM–12 PM", start: "06:00", end: "12:00" },
  { id: "afternoon", label: "Afternoon", sub: "12–5 PM", start: "12:00", end: "17:00" },
  { id: "evening", label: "Evening", sub: "5–9 PM", start: "17:00", end: "21:00" },
  { id: "night", label: "Night", sub: "9 PM–12 AM", start: "21:00", end: "23:59" },
];

const BusEntriesView = ({
  logs,
  fetching,
  total,
  busDate,
  setBusDate,
  busTimeSlot,
  setBusTimeSlot,
  getTodayDateStr,
  setView,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter logs based on search term with performance optimization
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

      return matchesSearch;
    });
  }, [logs, searchTerm]);

  const activeFiltersCount = (searchTerm ? 1 : 0) + (busTimeSlot !== "all" ? 1 : 0) + (busDate !== getTodayDateStr() ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm("");
    setBusTimeSlot("all");
    setBusDate(getTodayDateStr());
  };

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Bus Entries</h2>
          <p className="text-[11px] text-slate-500">
            Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> records (Total DB: <strong>{total}</strong>)
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

        {/* Date Picker Row */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
          <label className="text-[11px] font-bold text-slate-600 uppercase shrink-0">
            Date
          </label>
          <input
            type="date"
            value={busDate}
            max={getTodayDateStr()}
            onChange={(e) => setBusDate(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:border-slate-900 transition cursor-pointer"
          />
          {busDate !== getTodayDateStr() && (
            <button
              onClick={() => setBusDate(getTodayDateStr())}
              className="text-[10px] font-black text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:bg-cyan-100 transition"
            >
              Today
            </button>
          )}
        </div>

        {/* Time of Day Filter */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase">
              Time of Day
            </span>
            {busTimeSlot !== "all" && (
              <button
                onClick={() => setBusTimeSlot("all")}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
              >
                Reset Slot
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setBusTimeSlot("all")}
              className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                busTimeSlot === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Day
            </button>
            {TIME_SLOTS.map((slot) => {
              const isActive = busTimeSlot === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setBusTimeSlot(isActive ? "all" : slot.id)}
                  title={slot.sub}
                  className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>

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