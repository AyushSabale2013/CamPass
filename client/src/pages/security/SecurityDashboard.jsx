import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";
import { getSecurityLogs, getBusLogs, getPendingRequests } from "../../services/gateService";

// Import Views
import DashboardView from "./DashboardView";
import TodaysLogsView from "./TodaysLogsView";
import HostelersOutsideView from "./HostelersOutsideView";
import DayscholarsInsideView from "./DayscholarsInsideView";
import AllLogsView from "./AllLogsView";
import BusEntriesView from "./BusEntriesView";
import BusExitsView from "./BusExitsView";

// Returns today's date as YYYY-MM-DD in LOCAL time
const getTodayDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const SecurityDashboard = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // views: "dashboard" | "today" | "hostelers_outside" | "dayscholars_inside" | "all" | "bus_entries" | "bus_exits"
  const [view, setView] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [total, setTotal] = useState(0);

  // Live pending requests count badge state
  const [pendingCount, setPendingCount] = useState(0);

  // Date filter — only relevant for bus_entries / bus_exits views
  const [busDate, setBusDate] = useState(getTodayDateStr());

  const isBusView = view === "bus_entries" || view === "bus_exits";

  // Safe letter extract for guard avatar
  const guardInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "S";

  // =========================================================
  // FETCH PENDING REQUESTS COUNT (FOR BADGE)
  // =========================================================
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await getPendingRequests();
        if (res.data?.success) {
          const reqs = res.data.requests || res.data.data || [];
          setPendingCount(reqs.length);
        }
      } catch (err) {
        console.error("Failed to fetch pending requests count:", err);
      }
    };

    fetchPendingCount();
    // Optional: Poll every 30 seconds for live updates
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // BROWSER BACK-BUTTON INTERCEPTION
  // =========================================================
  useEffect(() => {
    if (view !== "dashboard") {
      window.history.pushState({ view }, "");

      const handlePopState = () => {
        setView("dashboard");
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      window.history.pushState({ view: "dashboard" }, "");

      const handleDashboardPopState = () => {
        window.history.pushState({ view: "dashboard" }, "");
      };

      window.addEventListener("popstate", handleDashboardPopState);
      return () => {
        window.removeEventListener("popstate", handleDashboardPopState);
      };
    }
  }, [view]);

  useEffect(() => {
    if (view === "dashboard") return;

    const fetchLogs = async () => {
      try {
        setFetching(true);

        // --- BUS VIEWS ---
        if (isBusView) {
          const status = view === "bus_entries" ? "IN" : "OUT";
          const res = await getBusLogs(busDate, status);

          if (res.data?.success) {
            setLogs(res.data.logs || []);
            setTotal(res.data.total ?? (res.data.logs || []).length);
          }
          return;
        }

        // --- SECURITY LOG VIEWS ---
        let reqType = "all";
        let sectionParam = "all";

        if (view === "today") {
          reqType = "today";
        } else if (view === "hostelers_outside") {
          reqType = "today";
          sectionParam = "hostelers_outside";
        } else if (view === "dayscholars_inside") {
          reqType = "today";
          sectionParam = "dayscholars_inside";
        }

        const res = await getSecurityLogs(reqType, sectionParam);

        if (res.data?.success) {
          let fetchedLogs = res.data.logs || [];

          if (view === "hostelers_outside" || view === "dayscholars_inside") {
            const uniqueStudentMap = new Map();

            for (const log of fetchedLogs) {
              const studentKey = log.studentMis || log.mis || log._id;
              if (!uniqueStudentMap.has(studentKey)) {
                uniqueStudentMap.set(studentKey, log);
              }
            }

            fetchedLogs = Array.from(uniqueStudentMap.values());
          }

          if (view === "hostelers_outside") {
            fetchedLogs = fetchedLogs.filter(
              (log) => log.userType === "hosteller" && log.isInsideCampus === false
            );
          } else if (view === "dayscholars_inside") {
            fetchedLogs = fetchedLogs.filter(
              (log) => log.userType === "dayscholar" && log.isInsideCampus === true
            );
          }

          fetchedLogs.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          setLogs(fetchedLogs);
          setTotal(fetchedLogs.length);
        }
      } catch (err) {
        console.error("Failed to fetch real-time logs from DB:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchLogs();
  }, [view, busDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-sm font-medium">Session expired. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col max-w-md mx-auto shadow-2xl">
      {/* Mobile Top Header */}
      <header className="bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="text-sm font-extrabold tracking-tight">Security Portal</h1>
          <p className="text-[10px] text-slate-400">CamPass Access Management</p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold bg-slate-800 hover:bg-rose-900/50 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {view === "dashboard" && (
          <DashboardView
            user={user}
            guardInitial={guardInitial}
            setView={setView}
            setBusDate={setBusDate}
            getTodayDateStr={getTodayDateStr}
            navigate={navigate}
            pendingCount={pendingCount}
          />
        )}

        {view === "today" && (
          <TodaysLogsView logs={logs} fetching={fetching} total={total} setView={setView} />
        )}

        {view === "hostelers_outside" && (
          <HostelersOutsideView logs={logs} fetching={fetching} setView={setView} />
        )}

        {view === "dayscholars_inside" && (
          <DayscholarsInsideView logs={logs} fetching={fetching} setView={setView} />
        )}

        {view === "all" && (
          <AllLogsView logs={logs} fetching={fetching} setView={setView} />
        )}

        {view === "bus_entries" && (
          <BusEntriesView
            logs={logs}
            fetching={fetching}
            total={total}
            busDate={busDate}
            setBusDate={setBusDate}
            getTodayDateStr={getTodayDateStr}
            setView={setView}
          />
        )}

        {view === "bus_exits" && (
          <BusExitsView
            logs={logs}
            fetching={fetching}
            total={total}
            busDate={busDate}
            setBusDate={setBusDate}
            getTodayDateStr={getTodayDateStr}
            setView={setView}
          />
        )}
      </main>

      {/* Footer Credit */}
      <footer className="mt-auto py-3 bg-[#0a1128] text-center">
        <p className="text-[10px] text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} IIIT Pune. All rights reserved. &bull; Designed & Developed by <span className="text-white">Ayush Sabale</span>
        </p>
      </footer>
    </div>
  );
};

export default SecurityDashboard;