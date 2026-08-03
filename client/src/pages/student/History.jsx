import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGateHistoryPage } from "../../services/gateService";
import { formatLogDate, formatLogTime } from "../../utils/logFormat";
import Loader from "../../components/common/Loader";

const LIMIT = 15;

const FILTERS = [
  { value: "", label: "All" },
  { value: "IN", label: "Entries" },
  { value: "OUT", label: "Exits" },
];

/** Skeleton row shown while a page is loading */
const HistorySkeletonRow = () => (
  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
      <div className="space-y-1.5">
        <div className="h-2.5 w-28 bg-slate-200 rounded" />
        <div className="h-2 w-16 bg-slate-200 rounded" />
      </div>
    </div>
    <div className="space-y-1.5 text-right">
      <div className="h-2.5 w-14 bg-slate-200 rounded ml-auto" />
    </div>
  </div>
);

const LogRow = ({ item }) => (
  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
    <div className="flex items-center gap-3 min-w-0">
      <span
        className={`w-8 h-8 rounded-xl font-black text-[10px] flex items-center justify-center shrink-0 ${
          item.status === "IN"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {item.status === "IN" ? "IN" : "OUT"}
      </span>
      <div className="min-w-0">
        <p className="font-bold text-slate-800 truncate">{item.gateName}</p>
        <p className="text-[10px] text-slate-400 font-medium truncate">
          {item.reason}
          {item.reason === "Other" && item.additionalNote
            ? ` — ${item.additionalNote}`
            : ""}
        </p>
      </div>
    </div>

    <div className="text-right shrink-0 pl-2">
      <p className="font-semibold text-slate-700">
        {formatLogTime(item.createdAt)}
      </p>
      {item.distance !== undefined && (
        <p className="text-[10px] text-slate-400">{item.distance}m</p>
      )}
    </div>
  </div>
);

const History = () => {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (pageNum, filter, replace) => {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");

      try {
        const response = await getGateHistoryPage({
          page: pageNum,
          limit: LIMIT,
          status: filter || undefined,
        });

        const { logs, hasMore: more } = response.data;

        setItems((prev) => (replace ? logs : [...prev, ...logs]));
        setHasMore(more);
        setPage(pageNum);
      } catch (err) {
        setError(
          err.response?.data?.message || "Couldn't load gate history."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial load + reload whenever the filter changes
  useEffect(() => {
    fetchPage(1, statusFilter, true);
  }, [statusFilter, fetchPage]);

  const groups = useMemo(() => {
    const map = new Map();

    for (const item of items) {
      const key = formatLogDate(item.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }

    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 px-3 py-1.5 rounded-full border border-slate-700 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Dashboard
          </button>

          <h1 className="text-sm font-bold tracking-tight text-slate-100">
            Gate History
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-12">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  active
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Log list */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          {loading && (
            <div className="space-y-3">
              <HistorySkeletonRow />
              <HistorySkeletonRow />
              <HistorySkeletonRow />
              <HistorySkeletonRow />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-xs text-rose-600 font-medium mb-3">{error}</p>
              <button
                onClick={() => fetchPage(1, statusFilter, true)}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-10">
              <p className="text-xs text-slate-400 font-medium">
                No {statusFilter === "IN" ? "entries" : statusFilter === "OUT" ? "exits" : "gate activity"} yet.
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-5">
              {groups.map(([dateLabel, logs]) => (
                <div key={dateLabel}>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                    {dateLabel}
                  </p>
                  <div className="space-y-3">
                    {logs.map((item) => (
                      <LogRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Load more */}
        {!loading && !error && hasMore && (
          <button
            onClick={() => fetchPage(page + 1, statusFilter, false)}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        )}
      </main>
    </div>
  );
};

export default History;