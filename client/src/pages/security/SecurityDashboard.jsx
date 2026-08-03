import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";
import { getSecurityLogs } from "../../services/gateService";

const SecurityDashboard = () => {
  const { user, loading, logout } = useAuth();

  // views: "dashboard" | "today" | "hostelers_outside" | "dayscholars_inside" | "all"
  const [view, setView] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Safe letter extract for guard avatar
  const guardInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "S";

  useEffect(() => {
    if (view !== "dashboard") {
      const fetchLogs = async () => {
        try {
          setFetching(true);

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

            // Ensure client-side deduplication (Only 1 latest entry per student)
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

            // Client-side status checks
            if (view === "hostelers_outside") {
              fetchedLogs = fetchedLogs.filter(
                (log) => log.userType === "hosteller" && log.isInsideCampus === false
              );
            } else if (view === "dayscholars_inside") {
              fetchedLogs = fetchedLogs.filter(
                (log) => log.userType === "dayscholar" && log.isInsideCampus === true
              );
            }

            // Sort descending by date/time (Most recent scan first)
            fetchedLogs.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            setLogs(fetchedLogs);
          }
        } catch (err) {
          console.error("Failed to fetch real-time logs from DB:", err);
        } finally {
          setFetching(false);
        }
      };

      fetchLogs();
    }
  }, [view]);

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
        {/* VIEW 1: MAIN MOBILE DASHBOARD */}
        {view === "dashboard" && (
          <div className="space-y-4">
            {/* Guard Profile Summary Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow shrink-0">
                {guardInitial}
              </div>

              <div className="space-y-0.5 text-left overflow-hidden">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 truncate">
                    {user?.name || "Security Guard"}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 uppercase">
                    {user?.role || "SECURITY"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  MSF ID: <strong className="text-slate-900 font-mono">{user?.mis || "MSF-9999"}</strong>
                </p>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {user?.email || "N/A"}
                </p>
              </div>
            </div>

            {/* Mobile Nav Action Buttons */}
            <div className="space-y-3">
              {/* Button 1: Today's Stream */}
              <button
                onClick={() => setView("today")}
                className="w-full bg-emerald-600 active:bg-emerald-700 text-white p-4 rounded-2xl shadow transition-all flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded">
                    Daily Stream
                  </span>
                  <h3 className="text-base font-black mt-1">Today's Logs</h3>
                  <p className="text-xs text-emerald-100">
                    All entry & exit activity for today
                  </p>
                </div>
                <span className="text-xl font-black">&rarr;</span>
              </button>

              {/* Button 2: Hostelers Outside Campus */}
              <button
                onClick={() => setView("hostelers_outside")}
                className="w-full bg-amber-600 active:bg-amber-700 text-white p-4 rounded-2xl shadow transition-all flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-700 text-amber-100 px-2 py-0.5 rounded">
                    Active Outside
                  </span>
                  <h3 className="text-base font-black mt-1">Hostelers Outside</h3>
                  <p className="text-xs text-amber-100">
                    All hostellers currently outside campus
                  </p>
                </div>
                <span className="text-xl font-black">&rarr;</span>
              </button>

              {/* Button 3: Day Scholars Inside Campus */}
              <button
                onClick={() => setView("dayscholars_inside")}
                className="w-full bg-teal-600 active:bg-teal-700 text-white p-4 rounded-2xl shadow transition-all flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-teal-700 text-teal-100 px-2 py-0.5 rounded">
                    Active Inside
                  </span>
                  <h3 className="text-base font-black mt-1">Day Scholars Inside</h3>
                  <p className="text-xs text-teal-100">
                    All day scholars currently on campus
                  </p>
                </div>
                <span className="text-xl font-black">&rarr;</span>
              </button>

              {/* Button 4: All Logs */}
              <button
                onClick={() => setView("all")}
                className="w-full bg-indigo-600 active:bg-indigo-700 text-white p-4 rounded-2xl shadow transition-all flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-700 text-indigo-100 px-2 py-0.5 rounded">
                    Full Archive
                  </span>
                  <h3 className="text-base font-black mt-1">All Logs</h3>
                  <p className="text-xs text-indigo-100">
                    Search complete log history
                  </p>
                </div>
                <span className="text-xl font-black">&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: LOG CARDS LIST */}
        {view !== "dashboard" && (
          <div className="space-y-3">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {view === "today" && "Today's Access Logs"}
                  {view === "hostelers_outside" && "Hostelers Outside Campus"}
                  {view === "dayscholars_inside" && "Day Scholars Inside Campus"}
                  {view === "all" && "Complete Access History"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Total Students: <strong>{logs.length}</strong>
                </p>
              </div>

              <button
                onClick={() => setView("dashboard")}
                className="px-3 py-1.5 bg-slate-900 text-white active:bg-slate-800 rounded-lg text-xs font-bold transition-all"
              >
                &larr; Back
              </button>
            </div>

            {fetching ? (
              <div className="bg-white p-6 rounded-xl border text-center text-slate-500 text-xs">
                Fetching records from database...
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border text-center text-slate-400 text-xs font-medium">
                No records found for this view.
              </div>
            ) : (
              /* Mobile Card Stack List */
              <div className="space-y-3">
                {logs.map((log) => {
                  const name = log.studentName || log.student?.name || log.name || "N/A";
                  const mis = log.studentMis || log.student?.mis || log.mis || "N/A";
                  const phone = log.studentPhone || log.student?.phone || log.phone || "N/A";
                  const userType = log.userType || log.student?.userType;

                  const isDayScholar =
                    userType === "dayscholar" ||
                    log.hostel === "Day Scholar" ||
                    log.student?.hostel === "Day Scholar";

                  const hostel = isDayScholar ? "DS" : log.hostel || log.student?.hostel || "N/A";
                  const room = isDayScholar ? "DS" : log.room || log.student?.room || "N/A";

                  const logDate = log.createdAt
                    ? new Date(log.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "N/A";

                  const logTime = log.createdAt
                    ? new Date(log.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "N/A";

                  return (
                    <div
                      key={log._id || log.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs"
                    >
                      {/* Card Row 1: Action Badge & Date/Time */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            log.status === "IN"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {log.status === "IN" ? "ENTRY" : "EXIT"}
                        </span>

                        <div className="text-right">
                          <span className="font-bold text-slate-800 block text-[11px]">{logTime}</span>
                          <span className="text-[10px] text-slate-400 block">{logDate}</span>
                        </div>
                      </div>

                      {/* Card Row 2: Student Name & MIS */}
                      <div className="flex justify-between items-start pt-1">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Student Name</p>
                          <p className="font-extrabold text-slate-900 text-sm">{name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">MIS</p>
                          <p className="font-mono font-bold text-slate-800">{mis}</p>
                        </div>
                      </div>

                      {/* Card Row 3: Phone & Hostel/Room */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Phone</p>
                          <a href={`tel:${phone}`} className="font-bold text-blue-600 underline">
                            {phone}
                          </a>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Hostel & Room</p>
                          <p className="font-bold text-slate-800">
                            {hostel} / {room}
                          </p>
                        </div>
                      </div>

                      {/* Card Row 4: Reason */}
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Reason</p>
                        <p className="font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {log.reason || "N/A"}
                          {log.additionalNote && (
                            <span className="block text-[10px] text-slate-500 italic mt-0.5">
                              Note: {log.additionalNote}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SecurityDashboard;