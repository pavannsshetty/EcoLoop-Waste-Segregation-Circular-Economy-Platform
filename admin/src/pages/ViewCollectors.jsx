import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUserAdd, HiRefresh } from 'react-icons/hi';

const ViewCollectors = () => {
  const navigate = useNavigate();
  const [collectors, setCollectors] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res   = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setCollectors(d.collectors); }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCollectors(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">View Collectors</h1>
          <p className="text-sm text-slate-400 mt-0.5">{collectors.length} collectors registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCollectors} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-green-400 transition">
            <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => navigate('/admin/add-collector')}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-500 transition">
            <HiUserAdd className="h-4 w-4" /> Add New
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : collectors.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">No collectors yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  {['ID', 'Name', 'Leader', 'Mobile', 'Email', 'City', 'Area', 'Ward', 'Size', 'Status', 'Added'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collectors.map(c => (
                  <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-green-400 text-xs whitespace-nowrap">{c.collectorId}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.teamLeader || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.mobile}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.city}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.area}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.ward}</td>
                    <td className="px-4 py-3 text-slate-400 text-center">{c.teamSize}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
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
