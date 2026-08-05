import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { useAuth } from "../../context/AuthContext";
import { exportSystemLogs } from "../../services/adminService";

const ExportLogs = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await exportSystemLogs();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading system logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `system_access_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to download logs file.");
    }
  };

  // Filter logs based on search query
  const filteredLogs = logs.filter((log) => 
    JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">System Logs Archive</h1>
            <p className="text-[11px] text-slate-400">Total Entries: {logs.length}</p>
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
          
          {/* Action Bar: Download JSON & Search */}
          <div className="space-y-2">
            <button 
              onClick={handleDownloadJSON}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              ↓ Download Complete JSON File
            </button>
            <input 
              type="text" 
              placeholder="Search logs archive..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-blue-600 shadow-sm"
            />
          </div>

          {/* Logs Feed Preview List */}
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 animate-pulse">Loading system logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No logs found.</p>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.slice(0, 50).map((log, index) => (
                <div key={log._id || index} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                      {log.action || log.type || "Access Event"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Recent"}
                    </span>
                  </div>
                  <p className="text-slate-600 truncate text-[11px]">
                    {log.description || log.message || JSON.stringify(log)}
                  </p>
                </div>
              ))}
              {filteredLogs.length > 50 && (
                <p className="text-[11px] text-center text-slate-400 pt-2">Showing first 50 records. Download JSON for full archive.</p>
              )}
            </div>
          )}

        </main>

      </div>
    </PageContainer>
  );
};

export default ExportLogs;