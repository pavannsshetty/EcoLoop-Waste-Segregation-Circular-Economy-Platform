import { useEffect, useState } from 'react';
import { HiCheckCircle, HiClock, HiChartBar, HiStar } from 'react-icons/hi';

const CollectorPerformance = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/collector/stats', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch { }
      finally { setLoading(false); }
    };
    fetch_();
  }, []);

  const efficiency = stats ? Math.min(100, Math.round((stats.completedToday / Math.max(stats.assigned + stats.inProgress + stats.completedToday, 1)) * 100)) : 0;

  const CARDS = [
    { label: 'Total Completed',   value: stats?.collector?.completedTasks ?? 0, Icon: HiCheckCircle, color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800'   },
    { label: 'Completed Today',   value: stats?.completedToday ?? 0,            Icon: HiClock,       color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800'     },
    { label: 'Active Tasks',      value: (stats?.assigned ?? 0) + (stats?.inProgress ?? 0), Icon: HiChartBar, color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800' },
    { label: 'Efficiency Score',  value: `${efficiency}%`,                      Icon: HiStar,        color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Performance</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CARDS.map(({ label, value, Icon, color, bg }) => (
              <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Efficiency Score</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Overall Efficiency</span><span>{efficiency}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-700" style={{ width: `${efficiency}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Collector ID',  value: stats?.collector?.collectorId || '—' },
                { label: 'Area',          value: stats?.collector?.area || '—'         },
                { label: 'City',          value: stats?.collector?.city || '—'         },
                { label: 'Availability',  value: stats?.collector?.availability || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{value}</p>
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
