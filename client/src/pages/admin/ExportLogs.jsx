import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { fetchAllUsers, exportSystemLogs } from "../../services/adminService";

// ── Shared CSV download utility (DRY, proper quote-escaping) ───────────────
const downloadCSV = (headers, rows, filename) => {
  const escape = (val) => {
    const str = val == null ? "" : String(val);
    return `"${str.replace(/"/g, '""')}"`;         // escape " → ""
  };
  const csv = [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const PREVIEW_LIMIT = 50;

const ExportLogs = () => {
  const navigate = useNavigate();

  const [students, setStudents]   = useState([]);
  const [entryLogs, setEntryLogs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("students");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, logsData] = await Promise.all([
        fetchAllUsers(),
        exportSystemLogs(),
      ]);
      setStudents((usersData.users || []).filter(u => u.role === "student"));
      setEntryLogs(logsData.logs || []);
    } catch (err) {
      console.error("Error loading export data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Download handlers ───────────────────────────────────────────────────
  const handleDownloadStudentsCSV = () => {
    if (!students.length) return;
    downloadCSV(
      ["Name", "Email", "MIS", "Phone", "User Type", "Hostel", "Room"],
      students.map(s => [s.name, s.email, s.mis, s.phone, s.userType, s.hostel, s.room]),
      `students_directory_${Date.now()}.csv`
    );
  };

  const handleDownloadEntriesCSV = () => {
    if (!entryLogs.length) return;
    downloadCSV(
      [
        "Log ID", "User ID", "Gate ID", "Name", "Email", "MIS", "Phone",
        "Hostel", "Room", "Gate Name", "Status", "Reason", "Additional Note",
        "Latitude", "Longitude", "Distance", "Created At", "Updated At",
      ],
      entryLogs.map(l => [
        l._id, l.userId, l.gateId, l.name, l.email, l.mis, l.phone,
        l.hostel, l.room, l.gateName, l.status, l.reason, l.additionalNote,
        l.latitude, l.longitude, l.distance,
        l.createdAt ? new Date(l.createdAt).toISOString() : "",
        l.updatedAt ? new Date(l.updatedAt).toISOString() : "",
      ]),
      `entry_logs_${Date.now()}.csv`
    );
  };

  // ── Filtered lists (targeted fields only — no JSON.stringify shotgun) ───
  const term = searchTerm.toLowerCase();

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(term) ||
    s.email?.toLowerCase().includes(term) ||
    s.mis?.toLowerCase().includes(term) ||
    s.phone?.toLowerCase().includes(term)
  );

  const filteredEntries = entryLogs.filter(l =>
    l.name?.toLowerCase().includes(term) ||
    l.mis?.toLowerCase().includes(term) ||
    l.email?.toLowerCase().includes(term) ||
    l.gateName?.toLowerCase().includes(term) ||
    l.status?.toLowerCase().includes(term) ||
    l.reason?.toLowerCase().includes(term) ||
    l.hostel?.toLowerCase().includes(term)
  );

  const activeList  = activeTab === "students" ? filteredStudents : filteredEntries;
  const totalCount  = activeTab === "students" ? students.length  : entryLogs.length;
  const canDownload = !loading && (activeTab === "students" ? students.length > 0 : entryLogs.length > 0);

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-x-hidden border-x border-slate-200">

        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Data Exports</h1>
            <p className="text-[11px] text-indigo-200 font-medium">
              Students: {students.length} · Logs: {entryLogs.length}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Dashboard
          </button>
        </header>

        <main className="p-4 space-y-4 pb-12 flex-1">

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-1 rounded-2xl">
            {["students", "entries"].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchTerm(""); }}
                className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white text-indigo-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "students" ? "Students Directory" : "Entry Logs"}
              </button>
            ))}
          </div>

          {/* Download + Search */}
          <div className="space-y-2">
            <button
              onClick={activeTab === "students" ? handleDownloadStudentsCSV : handleDownloadEntriesCSV}
              disabled={!canDownload}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-xs font-black shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Download {activeTab === "students" ? "Students" : "Entry Logs"} CSV
            </button>

            <input
              type="text"
              placeholder={
                activeTab === "students"
                  ? "Search by name, email, MIS, phone…"
                  : "Search by name, MIS, gate, status, reason…"
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm transition"
            />
          </div>

          {/* Filtered count hint */}
          {!loading && !error && searchTerm && (
            <p className="text-[11px] text-slate-400 font-medium -mt-1">
              {activeList.length === totalCount
                ? `${totalCount} record${totalCount !== 1 ? "s" : ""}`
                : `${activeList.length} of ${totalCount} records`}
            </p>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading data…</p>
            </div>

          ) : error ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-rose-200 p-6 space-y-3">
              <p className="text-xs font-bold text-rose-700">{error}</p>
              <button
                onClick={loadData}
                className="text-xs font-bold text-indigo-600 underline underline-offset-2"
              >
                Retry
              </button>
            </div>

          ) : activeList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6 space-y-1">
              <p className="text-xs font-bold text-slate-700">
                {searchTerm
                  ? "No results for that search"
                  : activeTab === "students" ? "No students found" : "No entry logs found"}
              </p>
              {searchTerm && (
                <p className="text-[11px] text-slate-400">Try a different term.</p>
              )}
            </div>

          ) : activeTab === "students" ? (
            <div className="space-y-2">
              {filteredStudents.slice(0, PREVIEW_LIMIT).map((s, i) => (
                <div key={s._id || i} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-xs truncate">{s.name}</span>
                    <span className="shrink-0 text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">
                      {s.mis || "N/A"}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate text-[11px]">{s.email} · {s.phone || "N/A"}</p>
                  <p className="text-slate-400 text-[11px]">
                    {s.hostel && s.hostel !== "N/A"
                      ? `${s.hostel} · Room ${s.room || "N/A"}`
                      : "Day Scholar"}
                  </p>
                </div>
              ))}
              {filteredStudents.length > PREVIEW_LIMIT && (
                <p className="text-[11px] text-center text-slate-400 pt-1">
                  Showing {PREVIEW_LIMIT} of {filteredStudents.length}. Download CSV for all records.
                </p>
              )}
            </div>

          ) : (
            <div className="space-y-2">
              {filteredEntries.slice(0, PREVIEW_LIMIT).map((l, i) => (
                <div key={l._id || i} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-slate-900 text-xs truncate">{l.name || "Unknown"}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                        l.status === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        {l.status || "—"}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                      {l.createdAt
                        ? new Date(l.createdAt).toLocaleString("en-IN", {
                            day: "2-digit", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Gate: <span className="font-semibold text-slate-800">{l.gateName || "N/A"}</span>
                    {" · "}MIS: <span className="font-semibold text-slate-800">{l.mis || "N/A"}</span>
                  </p>
                  {(l.reason || (l.hostel && l.hostel !== "N/A")) && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {l.reason || "No reason"}
                      {l.hostel && l.hostel !== "N/A" ? ` · ${l.hostel} (${l.room || "N/A"})` : ""}
                    </p>
                  )}
                </div>
              ))}
              {filteredEntries.length > PREVIEW_LIMIT && (
                <p className="text-[11px] text-center text-slate-400 pt-1">
                  Showing {PREVIEW_LIMIT} of {filteredEntries.length}. Download CSV for all records.
                </p>
              )}
            </div>
          )}

        </main>
      </div>
    </PageContainer>
  );
};

export default ExportLogs;