import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUserAdd, HiRefresh } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const ViewCollectors = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setCollectors(d.collectors);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>View Collectors</h1>
          <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{collectors.length} collectors registered</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchCollectors}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition ${dk(
              'border-gray-700 text-slate-400 hover:text-green-400 hover:border-green-700',
              'border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-300'
            )}`}
          >
            <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/add-collector')}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-500 transition shadow-sm"
          >
            <HiUserAdd className="h-4 w-4" /> Add New
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : collectors.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No collectors yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('border-gray-800 text-slate-500', 'border-slate-100 text-slate-500')}`}>
                  {['ID', 'Name', 'Leader', 'Mobile', 'Email', 'City', 'Area', 'Ward', 'Size', 'Status', 'Added'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collectors.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}
                  >
                    <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap ${dk('text-green-400', 'text-green-700')}`}>
                      {c.collectorId}
                    </td>
                    <td className={`px-4 py-3 font-medium whitespace-nowrap ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.teamLeader || '—'}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.mobile}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.email || '—'}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.city}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.area}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${dk('text-slate-400', 'text-slate-600')}`}>{c.ward}</td>
                    <td className={`px-4 py-3 text-center ${dk('text-slate-400', 'text-slate-600')}`}>{c.teamSize}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${dk('text-slate-500', 'text-slate-400')}`}>
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

export default ViewCollectors;
