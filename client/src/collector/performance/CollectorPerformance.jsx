import { useEffect, useState } from 'react';
import { HiCheckCircle, HiClock, HiChartBar, HiStar } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const CollectorPerformance = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/collector/stats', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [token]);

  const efficiency = stats
    ? Math.min(100, Math.round((stats.completedToday / Math.max(stats.assigned + stats.inProgress + stats.completedToday, 1)) * 100))
    : 0;

  const cards = [
    { label: 'Total Completed', value: stats?.collector?.completedTasks ?? 0, Icon: HiCheckCircle, color: 'text-green-600' },
    { label: 'Completed Today', value: stats?.completedToday ?? 0, Icon: HiClock, color: 'text-blue-600' },
    { label: 'Active Tasks', value: (stats?.assigned ?? 0) + (stats?.inProgress ?? 0), Icon: HiChartBar, color: 'text-yellow-600' },
    { label: 'Efficiency Score', value: `${efficiency}%`, Icon: HiStar, color: 'text-purple-600' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Performance</h1>
        <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Track your workload and efficiency</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((c) => {
              const CardIcon = c.Icon;
              return (
              <div
                key={c.label}
                className={`rounded-2xl border shadow-sm p-4 text-center hover:shadow-md transition ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}
              >
                <CardIcon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
                <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{c.label}</p>
              </div>
              );
            })}
          </div>

          <div className={`rounded-2xl border shadow-sm p-4 sm:p-5 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
            <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>Efficiency</h2>
            <div className="space-y-2">
              <div className={`flex justify-between text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                <span>Overall efficiency</span>
                <span className="font-semibold">{efficiency}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${dk('bg-slate-800', 'bg-slate-100')}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-700"
                  style={{ width: `${efficiency}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Collector ID', value: stats?.collector?.collectorId || '—' },
                { label: 'Area', value: stats?.collector?.area || '—' },
                { label: 'City', value: stats?.collector?.city || '—' },
                { label: 'Availability', value: stats?.collector?.availability || '—' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={`rounded-xl p-3 border ${dk('bg-black/20 border-gray-700', 'bg-slate-50 border-slate-100')}`}
                >
                  <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${dk('text-slate-200', 'text-slate-800')}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectorPerformance;
