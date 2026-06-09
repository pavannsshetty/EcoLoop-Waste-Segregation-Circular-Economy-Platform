import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import { apiUrl } from '../../shared/utils/api';
import { HiCalendar, HiCheckCircle, HiShieldCheck, HiLocationMarker, HiTruck, HiClock } from 'react-icons/hi';

const CollectorProfile = () => {
  const { dark } = useTheme();
  const { user: ctx } = useUser();
  const dk = (d, l) => (dark ? d : l);
  const [collector, setCollector] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(apiUrl('/api/collector/profile'), { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCollector(await res.json());
      } catch {} finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const c = collector || {};
  const memberSince = c.createdAt
    ? new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '-';
  const joinedDate = c.createdAt
    ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 overflow-hidden">
      <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-6 sm:p-8 shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-lg overflow-hidden border-4 border-white/40 shadow-lg bg-white/20">
              {c.photo || c.profilePhoto ? (
                <img src={c.photo || c.profilePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-3xl font-bold">
                  {(c.name || 'C')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{c.name || 'Collector'}</h1>
            <p className="text-green-100 text-sm mt-0.5">{c.collectorId} - {c.collectorType || 'Collector'}</p>
            <p className="text-green-200 text-xs mt-1">Member since {memberSince}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${c.status === 'Active' ? 'bg-green-500/30 text-white' : 'bg-red-500/30 text-white'}`}>
              <HiCheckCircle className="h-3.5 w-3.5" /> {c.status || 'Active'}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${c.availability === 'Available' ? 'bg-green-500/30 text-white' : c.availability === 'Busy' ? 'bg-amber-500/30 text-white' : 'bg-slate-500/30 text-white'}`}>
              {c.availability || 'Available'}
            </span>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiShieldCheck className="h-4 w-4 text-green-500" /> Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Collector / Team Name', value: c.name },
            { label: 'Team Leader', value: c.teamLeader },
            { label: 'Mobile Number', value: c.mobile || c.phone },
            { label: 'Email', value: c.email },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>{label}</p>
              <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{value || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiTruck className="h-4 w-4 text-blue-500" /> Work Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Vehicle Type', value: c.vehicleType },
            { label: 'Vehicle Number', value: c.vehicleNumber },
            { label: 'Working Shift', value: Array.isArray(c.workingShift) ? c.workingShift.join(', ') : c.workingShift },
            { label: 'Team Size', value: c.collectorType === 'Team' ? c.teamSize : 'Individual' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>{label}</p>
              <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{value || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiLocationMarker className="h-4 w-4 text-amber-500" /> Service Area
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>Assigned Villages</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Array.isArray(c.villages) ? c.villages : c.village ? [c.village] : []).map((v) => (
                <span key={v} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${dk('bg-green-900/50 text-green-300 border border-green-700', 'bg-green-50 text-green-700 border border-green-200')}`}>
                  {v}
                </span>
              ))}
              {(!c.villages || c.villages.length === 0) && <span className="text-sm">-</span>}
            </div>
          </div>
          <div>
            <p className={`text-xs mb-1 ${dk('text-slate-400', 'text-slate-500')}`}>City / Area</p>
            <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{c.city || c.area || '-'}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiClock className="h-4 w-4 text-purple-500" /> Stats & Activity
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Completed Tasks', value: c.completedTasks ?? 0, color: 'text-green-500' },
            { label: 'Performance Score', value: c.performanceScore ?? 0, color: 'text-blue-500' },
            { label: 'Availability', value: c.availability || 'Available', color: 'text-amber-500' },
            { label: 'Joined Date', value: joinedDate, color: 'text-purple-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-lg border p-3 text-center ${dk('border-slate-800 bg-slate-900/40', 'border-slate-100 bg-slate-50/70')}`}>
              <p className={`text-lg font-extrabold ${color}`}>{value}</p>
              <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectorProfile;