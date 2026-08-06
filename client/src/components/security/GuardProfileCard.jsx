const GuardProfileCard = ({ user, guardInitial }) => {
  return (
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
  );
};

export default GuardProfileCard;