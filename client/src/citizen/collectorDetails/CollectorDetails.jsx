import { useEffect, useState } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { HiPhone, HiTruck, HiClock, HiLocationMarker, HiUser, HiCheckCircle, HiCalendar, HiExclamationCircle } from 'react-icons/hi';

const STATUS_MAP = {
  'Available': { color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  'On Duty': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  'Busy': { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  'Offline': { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
};

const CollectorsDetails = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [collector, setCollector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCollector = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/user/assigned-collector', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCollector(await res.json());
        } else {
          const data = await res.json();
          setError(data.message || 'No collector assigned.');
        }
      } catch {
        setError('Unable to load collector information.');
      } finally {
        setLoading(false);
      }
    };
    fetchCollector();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 pt-6 pb-6">
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${dk('bg-amber-900/20 border-amber-800 text-amber-300', 'bg-amber-50 border-amber-200 text-amber-700')}`}>
          <HiExclamationCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (!collector) return null;

  const c = collector;
  const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.Offline;
  const memberSince = c.createdAt
    ? new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '-';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-6 sm:p-8 shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-lg overflow-hidden border-4 border-white/40 shadow-lg bg-white/20">
              {c.photo ? (
                <img src={c.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-3xl font-bold">
                  {(c.name || 'C')[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${statusInfo.dot}`} />
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{c.name || 'Collector'}</h1>
            <p className="text-green-100 text-sm mt-0.5">{c.teamLeader ? `Led by ${c.teamLeader}` : 'Collector'}</p>
            <p className="text-green-200 text-xs mt-1">Assigned to your village</p>
          </div>
          <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusInfo.color}`}>
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
            {c.status}
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiUser className="h-4 w-4 text-green-500" /> Contact Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Collector / Team Name</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.name || '-'}</p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Team Leader</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.teamLeader || '-'}</p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Mobile Number</p>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.mobile || '-'}</p>
              {c.mobile && (
                <a href={`tel:${c.mobile}`} className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition min-h-[38px] ${dk('bg-green-900/40 text-green-400 hover:bg-green-800', 'bg-green-50 text-green-700 hover:bg-green-100')}`}>
                  <HiPhone className="h-3.5 w-3.5" /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiTruck className="h-4 w-4 text-blue-500" /> Vehicle Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Vehicle Type</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.vehicleType || '-'}</p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Vehicle Number</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.vehicleNumber || '-'}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiClock className="h-4 w-4 text-amber-500" /> Work Schedule
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Shift Timing</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Array.isArray(c.workingShift) ? c.workingShift : []).map((s) => (
                <span key={s} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${dk('bg-amber-900/40 text-amber-300 border border-amber-700', 'bg-amber-50 text-amber-700 border border-amber-200')}`}>
                  {s}
                </span>
              ))}
              {(!c.workingShift || c.workingShift.length === 0) && <span className="text-sm">-</span>}
            </div>
          </div>
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Active Tasks</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.activeTasks ?? 0} currently assigned</p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiLocationMarker className="h-4 w-4 text-purple-500" /> Service Area
        </h2>
        <div>
          <p className={`text-xs mb-2 ${dk('text-slate-400', 'text-slate-500')}`}>Assigned Villages</p>
          <div className="flex flex-wrap gap-1.5">
            {(Array.isArray(c.villages) ? c.villages : []).map((v) => (
              <span key={v} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${dk('bg-green-900/50 text-green-300 border border-green-700', 'bg-green-50 text-green-700 border border-green-200')}`}>
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectorsDetails;