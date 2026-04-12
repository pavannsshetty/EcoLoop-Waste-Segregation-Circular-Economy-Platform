import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiClipboardList, HiClock, HiCheckCircle, HiExclamation, HiRefresh } from 'react-icons/hi';

const AVAIL_OPTIONS = ['Available', 'Busy', 'Offline'];
const AVAIL_COLORS  = { Available: 'bg-green-500', Busy: 'bg-yellow-500', Offline: 'bg-slate-500' };

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const [stats,  setStats]  = useState({ assigned: 0, inProgress: 0, completedToday: 0, total: 0, collector: null });
  const [avail,  setAvail]  = useState('Available');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collector/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setStats(d);
        if (d.collector?.availability) setAvail(d.collector.availability);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const updateAvailability = async (val) => {
    setAvail(val);
    try {
      await fetch('/api/collector/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: val }),
      });
    } catch { }
  };

  const CARDS = [
    { label: 'Assigned',        value: stats.assigned,       Icon: HiClipboardList, color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800',    path: '/collector/assigned'  },
    { label: 'In Progress',     value: stats.inProgress,     Icon: HiClock,         color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800', path: '/collector/tasks'     },
    { label: 'Completed Today', value: stats.completedToday, Icon: HiCheckCircle,   color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800',   path: '/collector/completed' },
    { label: 'Total Tasks',     value: stats.total,          Icon: HiExclamation,   color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800', path: '/collector/assigned'  },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Collector Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {stats.collector ? `${stats.collector.area}, ${stats.collector.city}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${AVAIL_COLORS[avail]}`} />
            <select value={avail} onChange={e => updateAvailability(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500">
              {AVAIL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <button onClick={fetchStats} className="text-slate-400 hover:text-green-400 transition">
            <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CARDS.map(({ label, value, Icon, color, bg, path }) => (
          <button key={label} onClick={() => navigate(path)}
            className={`rounded-2xl border p-5 text-left hover:scale-[1.02] transition ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className={`text-3xl font-extrabold ${color}`}>{loading ? '—' : value}</p>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'View Assigned Reports', path: '/collector/assigned', color: 'bg-blue-600 hover:bg-blue-500' },
            { label: 'My Active Tasks',        path: '/collector/tasks',    color: 'bg-yellow-600 hover:bg-yellow-500' },
            { label: 'Nearby Issues',          path: '/collector/nearby',   color: 'bg-green-600 hover:bg-green-500' },
          ].map(({ label, path, color }) => (
            <button key={label} onClick={() => navigate(path)}
              className={`${color} text-white text-sm font-semibold py-3 rounded-xl transition active:scale-95`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;
