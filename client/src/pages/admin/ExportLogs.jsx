import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { useAuth } from "../../context/AuthContext";
import { fetchAllUsers, exportSystemLogs } from "../../services/adminService";

const ExportLogs = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [students, setStudents] = useState([]);
  const [entryLogs, setEntryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students"); // "students" or "entries"
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, logsData] = await Promise.all([
        fetchAllUsers(),
        exportSystemLogs()
      ]);
      
      const studentList = (usersData.users || []).filter(u => u.role === "student");
      setStudents(studentList);
      setEntryLogs(logsData.logs || []);
    } catch (error) {
      console.error("Error loading export data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trimmed to only the fields needed: Name, Email, MIS, Phone, Hostel, Room.
  const handleDownloadStudentsCSV = () => {
    try {
      if (students.length === 0) {
        alert("No student data available to export.");
        return;
      }

      const headers = ["Name", "Email", "MIS", "Phone", "Hostel", "Room"];
      const rows = students.map(s => [
        `"${s.name || ""}"`,
        `"${s.email || ""}"`,
        `"${s.mis || ""}"`,
        `"${s.phone || ""}"`,
        `"${s.hostel || ""}"`,
        `"${s.room || ""}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `students_directory_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download students CSV file.");
    }
  };

  const handleDownloadEntriesCSV = () => {
    try {
      if (entryLogs.length === 0) {
        alert("No entry log data available to export.");
        return;
      }

      const headers = [
        "Log ID", 
        "User ID", 
        "Gate ID", 
        "Name", 
        "Email", 
        "MIS", 
        "Phone", 
        "Hostel", 
        "Room", 
        "Gate Name", 
        "Status", 
        "Reason", 
        "Additional Note", 
        "Latitude", 
        "Longitude", 
        "Distance", 
        "Created At", 
        "Updated At"
      ];

      const rows = entryLogs.map(l => [
        `"${l._id || ""}"`,
        `"${l.userId || ""}"`,
        `"${l.gateId || ""}"`,
        `"${l.name || ""}"`,
        `"${l.email || ""}"`,
        `"${l.mis || ""}"`,
        `"${l.phone || ""}"`,
        `"${l.hostel || ""}"`,
        `"${l.room || ""}"`,
        `"${l.gateName || ""}"`,
        `"${l.status || ""}"`,
        `"${l.reason || ""}"`,
        `"${l.additionalNote || ""}"`,
        `"${l.latitude ?? ""}"`,
        `"${l.longitude ?? ""}"`,
        `"${l.distance ?? ""}"`,
        `"${l.createdAt ? new Date(l.createdAt).toISOString() : ""}"`,
        `"${l.updatedAt ? new Date(l.updatedAt).toISOString() : ""}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `entry_logs_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download entry logs CSV file.");
    }
  };

  const filteredStudents = students.filter((s) => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.mis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEntries = entryLogs.filter((l) => 
    JSON.stringify(l).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">Data Exports</h1>
            <p className="text-[11px] text-slate-400">Students: {students.length} | Logs: {entryLogs.length}</p>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4 pb-12 flex-1">
          
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 gap-1 bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab("students"); setSearchTerm(""); }}
              className={`py-2 rounded-lg text-xs font-bold transition ${activeTab === "students" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Students Directory
            </button>
            <button
              onClick={() => { setActiveTab("entries"); setSearchTerm(""); }}
              className={`py-2 rounded-lg text-xs font-bold transition ${activeTab === "entries" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Entry Logs
            </button>
          </div>

          {/* Action Bar */}
          <div className="space-y-2">
            {activeTab === "students" ? (
              <button 
                onClick={handleDownloadStudentsCSV}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download Students CSV
              </button>
            ) : (
              <button 
                onClick={handleDownloadEntriesCSV}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download Entry Logs CSV
              </button>
            )}

            <input 
              type="text" 
              placeholder={activeTab === "students" ? "Search students by name, email, MIS..." : "Search entry logs by name, MIS, gate..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-blue-600 shadow-sm"
            />
          </div>

          {/* Feed Preview List */}
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 animate-pulse">Loading data...</p>
          ) : activeTab === "students" ? (
            filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No students found.</p>
            ) : (
              <div className="space-y-2.5">
                {filteredStudents.slice(0, 50).map((student, index) => (
                  <div key={student._id || index} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate text-xs">{student.name}</span>
                      <span className="font-semibold text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">{student.mis || "N/A"}</span>
                    </div>
                    <p className="text-slate-500 truncate text-[11px]">
                      {student.email} | {student.phone || "N/A"}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {student.hostel && student.hostel !== "N/A"
                        ? `${student.hostel} • Room ${student.room || "N/A"}`
                        : "No hostel assigned"}
                    </p>
                  </div>
                ))}
                {filteredStudents.length > 50 && (
                  <p className="text-[11px] text-center text-slate-400 pt-2">Showing first 50 records. Download CSV for full archive.</p>
                )}
              </div>
            )
          ) : (
            filteredEntries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No entry logs found.</p>
            ) : (
              <div className="space-y-2.5">
                {filteredEntries.slice(0, 50).map((log, index) => (
                  <div key={log._id || index} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{log.name || "Unknown"}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${log.status === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {log.status || "EVENT"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Recent"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Gate: <span className="font-semibold text-slate-800">{log.gateName || "N/A"}</span> | MIS: <span className="font-semibold text-slate-800">{log.mis || "N/A"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Reason: {log.reason || "N/A"} {log.hostel ? `| Hostel: ${log.hostel} (${log.room})` : ""}
                    </p>
                  </div>
                ))}
                {filteredEntries.length > 50 && (
                  <p className="text-[11px] text-center text-slate-400 pt-2">Showing first 50 records. Download CSV for full archive.</p>
                )}
              </div>
            )
          )}

        </main>

      </div>
    </PageContainer>
  );
};

export default ExportLogs;