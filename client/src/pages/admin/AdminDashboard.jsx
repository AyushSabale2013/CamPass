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
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden font-sans">

        {/* Top Header with Logout */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-100">Admin Portal</h1>
            <p className="text-[11px] text-slate-400 font-medium">Campus Access Control Center</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </header>

        {/* Main Feed Container */}
        <main className="p-4 space-y-4 pb-12 flex-1">

          {/* Profile Card */}
          {dashboardData && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold tracking-wider shadow-md shadow-blue-500/20">
                {dashboardData.admin?.name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-base truncate">{dashboardData.admin?.name || "Administrator"}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 tracking-wide uppercase">Admin</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">ID: {dashboardData.admin?.mis || "ADMIN-01"}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{dashboardData.admin?.email}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide">Loading dashboard menu...</p>
            </div>
          ) : (
            <div className="space-y-3.5">

              {/* Manage Users Block */}
              <div
                onClick={() => navigate("/admin/users")}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Directory</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">Manage Users ({userCount})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Students and security personnel</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Manage Gates Block */}
              <div
                onClick={() => navigate("/admin/gates")}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Checkpoints</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">Manage Gates ({gateCount})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Coordinates, locations, and radiuses</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Export Logs Block */}
              <div
                onClick={() => navigate("/admin/logs")}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">Archives</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">Export All Logs</h3>
                    <p className="text-xs text-slate-500 mt-0.5">System records and activity logs</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Reset System Block */}
              <div
                onClick={() => navigate("/admin/reset")}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 tracking-wider uppercase">Sensitive Operation</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">Reset System Data</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Clear temporal logs and history</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

            </div>
          )}

        </main>
        {/* Footer */}
        <footer className="mt-auto py-3 px-4 bg-[#0a1128] text-center border-t border-slate-800/60">
          <p className="text-[10px] text-slate-400 font-medium truncate">
            &copy; {new Date().getFullYear()} IIIT Pune. All rights reserved. &bull; Designed & Developed by <span className="text-white">Ayush Sabale</span>
          </p>
        </footer>

      </div>
    </PageContainer>
  );
};

export default AdminDashboard;