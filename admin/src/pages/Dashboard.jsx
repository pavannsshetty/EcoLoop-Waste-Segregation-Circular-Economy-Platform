import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUsers, HiClipboardList, HiCheckCircle, HiUserAdd } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [stats, setStats] = useState({ totalCollectors: 0, activeCollectors: 0, totalReports: 0, collectors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('admin-token');
        const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const statCards = [
    { label: 'Total Collectors', value: stats.totalCollectors, icon: HiUsers, color: 'text-blue-600' },
    { label: 'Active Collectors', value: stats.activeCollectors, icon: HiCheckCircle, color: 'text-green-600' },
    { label: 'Total Reports', value: stats.totalReports, icon: HiClipboardList, color: 'text-yellow-600' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Dashboard</h1>
          <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>EcoLoop admin overview</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/add-collector')}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-500 transition active:scale-95 shadow-sm"
        >
          <HiUserAdd className="h-4 w-4" /> Add Collector
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`rounded-2xl border shadow-sm p-4 text-center hover:shadow-md transition ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}
          >
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-extrabold ${color}`}>{loading ? '—' : value}</p>
            <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{label}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Collectors</h2>
          <span className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{stats.collectors.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : stats.collectors.length === 0 ? (
          <div className={`text-center py-12 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            No collectors yet. Add your first collector.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('border-gray-800 text-slate-500', 'border-slate-100 text-slate-500')}`}>
                  {['Collector ID', 'Name', 'Mobile', 'City', 'Area', 'Ward', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.collectors.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}
                  >
                    <td className={`px-4 py-3 font-mono text-xs ${dk('text-green-400', 'text-green-700')}`}>{c.collectorId}</td>
                    <td className={`px-4 py-3 font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{c.mobile}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{c.city}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{c.area}</td>
                    <td className={`px-4 py-3 ${dk('text-slate-400', 'text-slate-600')}`}>{c.ward}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.status === 'Active'
                            ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                            : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-700')
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${dk('text-slate-500', 'text-slate-400')}`}>
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
