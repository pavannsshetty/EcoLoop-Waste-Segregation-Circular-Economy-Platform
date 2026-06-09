import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiRefresh, HiSearch, HiEye, HiX, HiUser, HiPhone, HiLocationMarker } from 'react-icons/hi';

const fmtDt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AdminRecycling = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const token = localStorage.getItem('adminToken');
  const [data, setData] = useState({ stats: {}, requests: [], villages: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (villageFilter) params.set('village', villageFilter);
      const res = await fetch(apiUrl(`/api/admin/recycling?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, statusFilter, villageFilter]);

  const { stats, requests, villages, pagination } = data;

  const statCard = (label, value, color) => (
    <div className={`rounded-lg border p-4 ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className={`text-xs font-medium mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>{label}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`rounded-lg border w-full max-w-lg p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Pickup Details</p>
              <button type="button" onClick={() => setDetail(null)} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}><HiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Citizen</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.citizen?.name || 'Unknown'}</p></div>
              {detail.citizen?.phone && <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Phone</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.citizen.phone}</p></div>}
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Village</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.village || detail.citizen?.village || 'N/A'}</p></div>
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Waste Type</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.type}</p></div>
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Quantity</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.quantity}</p></div>
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Address</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.address}</p></div>
              {detail.notes && <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Notes</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.notes}</p></div>}
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Status</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                detail.status === 'Requested' ? dk('bg-amber-900/40 text-amber-400', 'bg-amber-100 text-amber-800') :
                detail.status === 'Accepted' ? dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700') :
                dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700')
              }`}>{detail.status}</span></div>
              {detail.assignedGC && <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Assigned GC</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{detail.assignedGC?.name || 'N/A'}</p></div>}
              <div><p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Requested</p><p className={`font-medium ${dk('text-slate-100', 'text-slate-800')}`}>{fmtDt(detail.createdAt)}</p></div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Recycling Management</h1>
        <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Monitor and manage recyclable waste collection requests across villages.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCard('Total Requests', stats.totalRequests || 0, dk('text-slate-100', 'text-slate-900'))}
        {statCard('Pending', stats.pendingPickups || 0, 'text-amber-500')}
        {statCard('In Progress', stats.inProgressPickups || 0, 'text-blue-500')}
        {statCard('Completed', stats.completedPickups || 0, 'text-green-500')}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={`rounded-lg border px-3 py-2 text-sm ${dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-800')}`}>
          <option value="">All Statuses</option>
          <option value="Requested">Requested</option>
          <option value="Accepted">Accepted</option>
          <option value="Collected">Collected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}
          className={`rounded-lg border px-3 py-2 text-sm ${dk('bg-white/5 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-800')}`}>
          <option value="">All Villages</option>
          {villages.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button onClick={fetchData} className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}><HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {loading ? (
        <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
      ) : requests.length === 0 ? (
        <div className={`py-20 text-center rounded-lg border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
          <p>No recycling requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full text-sm border-collapse ${dk('text-slate-300', 'text-slate-700')}`}>
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${dk('border-gray-800 text-slate-500', 'border-slate-200 text-slate-500')}`}>
                <th className="text-left py-3 px-2">Request ID</th>
                <th className="text-left py-3 px-2">Citizen</th>
                <th className="text-left py-3 px-2">Collector / GC</th>
                <th className="text-left py-3 px-2">Village</th>
                <th className="text-left py-3 px-2">Waste Type</th>
                <th className="text-left py-3 px-2">Quantity</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Date</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className={`border-b ${dk('border-gray-800 hover:bg-white/[0.03]', 'border-slate-100 hover:bg-slate-50')}`}>
                  <td className="py-3 px-2 text-xs font-mono">{r._id.toString().slice(-8)}</td>
                  <td className="py-3 px-2">{r.citizen?.name || 'Unknown'}</td>
                  <td className="py-3 px-2">{r.assignedGC?.name || '-'}</td>
                  <td className="py-3 px-2">{r.village || r.citizen?.village || '-'}</td>
                  <td className="py-3 px-2">{r.type}</td>
                  <td className="py-3 px-2">{r.quantity}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'Requested' ? dk('bg-amber-900/40 text-amber-400', 'bg-amber-100 text-amber-800') :
                      r.status === 'Accepted' ? dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700') :
                      r.status === 'Collected' ? dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700') :
                      dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700')
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-2 text-xs">{fmtDt(r.createdAt)}</td>
                  <td className="py-3 px-2">
                    <button onClick={() => setDetail(r)} className={`flex items-center gap-1 text-xs font-semibold ${dk('text-green-400 hover:text-green-300', 'text-green-600 hover:text-green-500')}`}>
                      <HiEye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')} disabled:opacity-40`}>Previous</button>
          <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>Page {pagination.page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${dk('border-gray-700 text-slate-300 hover:bg-white/5', 'border-slate-200 text-slate-600 hover:bg-slate-50')} disabled:opacity-40`}>Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminRecycling;
