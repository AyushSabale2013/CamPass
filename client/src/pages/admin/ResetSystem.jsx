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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Custom Popup Notification State
  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (message, type = "error") => {
    setPopupMessage({ message, type });
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (confirmText !== "RESET") {
      showPopup("Please type 'RESET' exactly to proceed.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    try {
      setLoading(true);
      setShowConfirmModal(false);
      await resetSystemData();
      
      // Show success notification and navigate after acknowledgement or brief delay
      showPopup("Semester data reset successfully. Student profiles and access logs have been cleared.", "success");
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1500);
    } catch (err) {
      showPopup(err.response?.data?.message || "Failed to reset system data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden font-sans relative">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-500 flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">Sensitive Operation</h1>
              <p className="text-[11px] text-slate-400 font-medium">Semester Data Purge</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4 pb-12 flex-1 flex flex-col justify-center">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            
            <div className="border-l-4 border-rose-600 bg-rose-50/50 p-4 rounded-r-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mandatory Pre-Reset Protocol
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Before initiating a semester reset, ensure that all access archives and student logs are <strong>backed up and exported properly</strong>. Data deleted during this procedure cannot be recovered under any circumstances.
              </p>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">Scope of Deletion</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Executing this command will permanently erase all <strong>Student accounts</strong> and <strong>All Entry Logs</strong> to prepare the infrastructure for the new semester. Security personnel, guard accounts, admin credentials, and gate configurations will remain completely secure.
              </p>
            </div>

            <form onSubmit={handleInitialSubmit} className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Type <span className="text-rose-600 font-extrabold tracking-wider">RESET</span> to unlock confirmation:
                </label>
                <input 
                  type="text" 
                  placeholder="RESET(in uppercase)" 
                  required 
                  value={confirmText} 
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-rose-600 tracking-wider text-center uppercase"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
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
                  Proceed to Purge
                </button>
              </div>
            </form>
          </div>

        </main>

        {/* First Confirmation Popup Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Final Security Confirmation</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  You are about to execute a destructive semester wipe. All student profiles and entry archives will be permanently removed. Are you completely certain?
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="button"
                  disabled={loading}
                  onClick={handleFinalConfirm}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-bold shadow-md transition"
                >
                  {loading ? "Processing Purge..." : "Confirm and Wipe Data"}
                </button>
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-semibold transition"
                >
                  Abort Operation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* General Popup Notification Modal (Replaces browser alerts) */}
        {popupMessage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
              <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold ${
                popupMessage.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {popupMessage.type === "success" ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {popupMessage.type === "success" ? "Success" : "Notice"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {popupMessage.message}
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setPopupMessage(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default ResetSystem;