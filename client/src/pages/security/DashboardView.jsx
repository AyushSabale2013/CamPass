import GuardProfileCard from "../../components/security/GuardProfileCard";

const DashboardView = ({ user, guardInitial, setView, setBusDate, getTodayDateStr }) => {
  return (
    <div className="space-y-4">
      {/* Guard Profile Summary Card */}
      <GuardProfileCard user={user} guardInitial={guardInitial} />

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

        {/* Row of 2 small blocks: Bus Entries / Bus Exits */}
        <div className="grid grid-cols-2 gap-3">
          {/* Button 5: Bus Entries */}
          <button
            onClick={() => {
              setBusDate(getTodayDateStr());
              setView("bus_entries");
            }}
            className="w-full bg-cyan-600 active:bg-cyan-700 text-white p-3 rounded-2xl shadow transition-all flex flex-col items-start text-left"
          >
            <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-700 text-cyan-100 px-2 py-0.5 rounded">
              Via Bus
            </span>
            <h3 className="text-sm font-black mt-1">Bus Entries</h3>
            <p className="text-[10px] text-cyan-100">Today's entries by bus</p>
          </button>

          {/* Button 6: Bus Exits */}
          <button
            onClick={() => {
              setBusDate(getTodayDateStr());
              setView("bus_exits");
            }}
            className="w-full bg-rose-600 active:bg-rose-700 text-white p-3 rounded-2xl shadow transition-all flex flex-col items-start text-left"
          >
            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-700 text-rose-100 px-2 py-0.5 rounded">
              Via Bus
            </span>
            <h3 className="text-sm font-black mt-1">Bus Exits</h3>
            <p className="text-[10px] text-rose-100">Today's exits by bus</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;