const LogCard = ({ log, idx }) => {
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
      key={log._id || log.id || idx}
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
};

export default LogCard;