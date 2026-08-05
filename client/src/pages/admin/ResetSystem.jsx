import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { useAuth } from "../../context/AuthContext";
import { resetSystemData } from "../../services/adminService";

const ResetSystem = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (confirmText !== "RESET") {
      alert("Please type 'RESET' to confirm this action.");
      return;
    }

    if (window.confirm("⚠️ FINAL WARNING: This action is irreversible and will delete all access records.")) {
      try {
        setLoading(true);
        await resetSystemData();
        alert("System data has been successfully reset.");
        navigate("/admin/dashboard");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to reset system data.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">Danger Zone</h1>
            <p className="text-[11px] text-slate-400">System Reset Configuration</p>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4 pb-12 flex-1 flex flex-col justify-center">
          
          <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto shadow-inner">
              ⚠️
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900">Reset System Data</h2>
              <p className="text-xs text-slate-500">
                This will wipe out all historical access logs and temporary tracking archives. User profiles and gate configurations will remain safe.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Type <span className="text-rose-600 font-extrabold">RESET</span> to confirm:
                </label>
                <input 
                  type="text" 
                  placeholder="RESET" 
                  required 
                  value={confirmText} 
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-rose-600 tracking-wider text-center"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => navigate("/admin/dashboard")} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading || confirmText !== "RESET"}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold shadow-md transition"
                >
                  {loading ? "Wiping..." : "Execute Wipe"}
                </button>
              </div>
            </form>
          </div>

        </main>

      </div>
    </PageContainer>
  );
};

export default ResetSystem;