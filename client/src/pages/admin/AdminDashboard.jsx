import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { useAuth } from "../../context/AuthContext";
import { fetchAdminDashboard, fetchAllUsers, fetchAllGates } from "../../services/adminService";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [gateCount, setGateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminDashboard();
      setDashboardData(data);

      const usersData = await fetchAllUsers();
      setUserCount(usersData.users?.length || 0);

      const gatesData = await fetchAllGates();
      setGateCount(gatesData.gates?.length || 0);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        {/* Top Header with Logout */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">Admin Portal</h1>
            <p className="text-[11px] text-slate-400">Campus Access Control Center</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Logout
          </button>
        </header>

        {/* Main Feed Container */}
        <main className="p-4 space-y-4 pb-12 flex-1">
          
          {/* Profile Card */}
          {dashboardData && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-500/20">
                {dashboardData.admin?.name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-base truncate">{dashboardData.admin?.name || "Administrator"}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-600 uppercase">Admin</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">ID: {dashboardData.admin?.mis || "ADMIN-01"}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{dashboardData.admin?.email}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-slate-400 animate-pulse">Loading dashboard menu...</p>
            </div>
          ) : (
            <div className="space-y-3.5">

              {/* Manage Users Block */}
              <div 
                onClick={() => navigate("/admin/users")}
                className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md cursor-pointer hover:bg-emerald-700 transition flex items-center justify-between"
              >
                <div>
                  <span className="bg-emerald-800/60 text-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Directory</span>
                  <h3 className="text-lg font-bold mt-2">Manage Users ({userCount})</h3>
                  <p className="text-emerald-100 text-xs mt-0.5">Add, view, or remove students and security staff</p>
                </div>
                <span className="text-xl font-bold bg-emerald-700/50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">→</span>
              </div>

              {/* Manage Gates Block */}
              <div 
                onClick={() => navigate("/admin/gates")}
                className="bg-amber-600 text-white p-5 rounded-2xl shadow-md cursor-pointer hover:bg-amber-700 transition flex items-center justify-between"
              >
                <div>
                  <span className="bg-amber-800/60 text-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Checkpoints</span>
                  <h3 className="text-lg font-bold mt-2">Manage Gates ({gateCount})</h3>
                  <p className="text-amber-100 text-xs mt-0.5">Configure campus gates, coordinates, and radiuses</p>
                </div>
                <span className="text-xl font-bold bg-amber-700/50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">→</span>
              </div>

              {/* Export Logs Block */}
              <div 
                onClick={() => navigate("/admin/logs")}
                className="bg-blue-600 text-white p-5 rounded-2xl shadow-md cursor-pointer hover:bg-blue-700 transition flex items-center justify-between"
              >
                <div>
                  <span className="bg-blue-800/60 text-blue-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Archives</span>
                  <h3 className="text-lg font-bold mt-2">Export All Logs</h3>
                  <p className="text-blue-100 text-xs mt-0.5">View and download complete system record archives</p>
                </div>
                <span className="text-xl font-bold bg-blue-700/50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">↓</span>
              </div>

              {/* Reset System Block */}
              <div 
                onClick={() => navigate("/admin/reset")}
                className="bg-rose-600 text-white p-5 rounded-2xl shadow-md cursor-pointer hover:bg-rose-700 transition flex items-center justify-between"
              >
                <div>
                  <span className="bg-rose-800/60 text-rose-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Danger Zone</span>
                  <h3 className="text-lg font-bold mt-2">Reset System Data</h3>
                  <p className="text-rose-100 text-xs mt-0.5">Wipe logs and clear out temporal records</p>
                </div>
                <span className="text-xl font-bold bg-rose-700/50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">⚠️</span>
              </div>

            </div>
          )}

        </main>

      </div>
    </PageContainer>
  );
};

export default AdminDashboard;