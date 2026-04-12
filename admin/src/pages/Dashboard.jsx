import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUsers, HiClipboardList, HiCheckCircle, HiUserAdd } from 'react-icons/hi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats,    setStats]    = useState({ totalCollectors: 0, activeCollectors: 0, totalReports: 0, collectors: [] });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('admin-token');
        const res   = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch { }
      finally { setLoading(false); }
    };
    fetch_();
  }, []);

  const STAT_CARDS = [
    { label: 'Total Collectors',  value: stats.totalCollectors,  icon: HiUsers,         color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800'   },
    { label: 'Active Collectors', value: stats.activeCollectors, icon: HiCheckCircle,   color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800' },
    { label: 'Total Reports',     value: stats.totalReports,     icon: HiClipboardList, color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">EcoLoop Admin Overview</p>
        </div>
        <button onClick={() => navigate('/admin/add-collector')}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-500 transition active:scale-95">
          <HiUserAdd className="h-4 w-4" /> Add Collector
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-400">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className={`text-3xl font-extrabold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">All Collectors</h2>
          <span className="text-xs text-slate-500">{stats.collectors.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : stats.collectors.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No collectors yet. Add your first collector.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  {['Collector ID', 'Name', 'Mobile', 'City', 'Area', 'Ward', 'Status', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.collectors.map(c => (
                  <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-green-400 text-xs">{c.collectorId}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400">{c.mobile}</td>
                    <td className="px-4 py-3 text-slate-400">{c.city}</td>
                    <td className="px-4 py-3 text-slate-400">{c.area}</td>
                    <td className="px-4 py-3 text-slate-400">{c.ward}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
