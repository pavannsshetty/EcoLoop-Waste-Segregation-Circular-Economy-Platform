import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiLocationMarker, HiClock, HiRefresh } from 'react-icons/hi';
import { MdWaterDrop, MdRecycling, MdDevices, MdWarning, MdDelete } from 'react-icons/md';
import EcoLoopLogo from '../components/EcoLoopLogo';

const STATUS_STYLES = {
  Pending:   'bg-yellow-100 text-yellow-700',
  Assigned:  'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
};

const WASTE_ICONS = {
  'Wet Waste':     MdWaterDrop,
  'Dry Waste':     MdRecycling,
  'E-Waste':       MdDevices,
  'Plastic Waste': MdRecycling,
  'Mixed Waste':   MdWarning,
};

const WASTE_COLORS = {
  'Wet Waste':     'bg-green-100 text-green-600',
  'Dry Waste':     'bg-blue-100 text-blue-600',
  'E-Waste':       'bg-purple-100 text-purple-600',
  'Plastic Waste': 'bg-cyan-100 text-cyan-600',
  'Mixed Waste':   'bg-orange-100 text-orange-600',
};

const MyReports = () => {
  const navigate  = useNavigate();
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/waste/my-reports', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch reports.');
      const data = await res.json();
      setReports(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#F7FDF8]">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition">
            <HiArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <EcoLoopLogo height={32} />
        </div>
        <h1 className="text-base font-semibold text-slate-800">My Reports</h1>
        <button onClick={fetchReports} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition">
          <HiRefresh className="h-5 w-5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <MdDelete className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium">No reports yet.</p>
            <p className="text-sm text-slate-400">Submit your first waste report from the dashboard.</p>
            <button onClick={() => navigate('/dashboard')}
              className="mt-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition">
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && reports.map((r) => {
          const Icon = WASTE_ICONS[r.wasteType] || MdWarning;
          const iconCls = WASTE_COLORS[r.wasteType] || 'bg-slate-100 text-slate-500';
          return (
            <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{r.wasteType}</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600'}`}>
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <HiLocationMarker className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{r.location?.address || 'N/A'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <HiClock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {formatDate(r.pickupTime)} at {formatTime(r.pickupTime)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-xs text-slate-400 sm:text-right">
                Reported<br />
                <span className="font-medium text-slate-600">{formatDate(r.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default MyReports;
