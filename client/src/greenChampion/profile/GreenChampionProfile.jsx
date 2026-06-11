import { useState, useEffect, useMemo } from 'react';
import { HiShieldCheck, HiBadgeCheck, HiCalendar, HiLocationMarker, HiClipboardList, HiOfficeBuilding, HiCheckCircle, HiLockClosed, HiClock } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import socket from '../../socket';
import { API } from '../../shared/constants';

const Label = ({ dark, children }) => (
  <p className={`text-xs mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{children}</p>
);

const Value = ({ dark, children }) => (
  <p className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{children || 'Not Provided'}</p>
);


const BadgeItem = ({ label, earned, dark }) => (
  <div className={`rounded-lg border p-3 text-center space-y-1.5 ${earned ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : dark ? 'bg-white/5 border-slate-700 opacity-50' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
    <HiBadgeCheck className={`h-8 w-8 mx-auto ${earned ? 'text-green-600' : 'text-slate-400'}`} />
    <p className={`text-xs font-bold ${earned ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>{label}</p>
    {earned && <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Earned</span>}
  </div>
);

const InfoRow = ({ label, value, dark }) => (
  <div className={`py-2.5 border-b last:border-0 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
    <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
    <p className={`text-sm font-medium mt-0.5 ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{value || 'Not Provided'}</p>
  </div>
);

const GreenChampionProfile = () => {
  const { dark } = useTheme();
  const { user: ctxUser } = useUser();
  const dk = (d, l) => dark ? d : l;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const inp = `w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${dk('bg-white/5 border-slate-700 text-slate-200 placeholder-slate-500 disabled:bg-white/5 disabled:text-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400')}`;

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/api/green-champion/my-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else if (res.status === 403) {
        setError('Green Champion access only. Please log in with a Green Champion account.');
      } else {
        setError('Unable to load profile');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchProfile();
    socket.on('profile_updated', handler);
    return () => { socket.off('profile_updated', handler); };
  }, []);

  const p = profile?.user;
  const app = profile?.application;
  const stats = profile?.stats;

  const memberSince = p?.createdAt
    ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recently joined';

  const approvedDate = app?.approvedAt
    ? new Date(app.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const reviewDate = app?.reviewedAt
    ? new Date(app.reviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const lastActive = p?.lastActiveDate
    ? new Date(p.lastActiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const levelColor = (level) => {
    const map = {
      'Green Beginner': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Eco Warrior': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Recycling Hero': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Green Champion Supporter': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return map[level] || map['Green Beginner'];
  };

  const statusColor = (status) => {
    const map = {
      'Active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Inactive': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      'Suspended': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Deleted': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  const badges = useMemo(() => [
    { label: 'Green Champion', earned: true },
    { label: 'Verified by Admin', earned: app?.status === 'APPROVED' },
    { label: 'First Campaign', earned: (stats?.campaignsParticipated || 0) >= 1 },
    { label: 'Reports Verified', earned: (stats?.reportsVerified || 0) >= 5 },
    { label: 'Awareness Creator', earned: (stats?.awarenessPosts || 0) >= 3 },
    { label: 'Eco Leader', earned: (stats?.leaderboardRank || 999) <= 3 },
  ], [app, stats]);

  if (loading) return (
    <div className="p-4 sm:p-6 flex items-center justify-center min-h-[50vh]">
      <div className="h-10 w-10 rounded-full border-4 border-[#0BAF2A] border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-4 sm:p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">

      {/* ─── Profile Header ─── */}
      <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-6 sm:p-8 shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden border-4 border-white/40 shadow-lg bg-white/20">
              {p?.profilePhoto
                ? <img src={p.profilePhoto} alt="avatar" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-white text-3xl font-bold">{(p?.name || 'G')[0].toUpperCase()}</div>
              }
            </div>
            <div className={`absolute -bottom-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center shadow border-2 border-white/40 ${statusColor(p?.accountStatus || 'Active')}`}>
              <HiCheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{p?.name || 'Green Champion'}</h1>
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                <HiShieldCheck className="h-3.5 w-3.5" /> Green Champion
              </span>
              {p?.greenChampionId && (
                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white/10 text-green-100 px-2.5 py-0.5 rounded-full">
                  {p.greenChampionId}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor(p?.accountStatus || 'Active')}`}>
                {p?.accountStatus || 'Active'}
              </span>
            </div>
            <p className="text-green-100 text-xs mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
              <HiLocationMarker className="h-3.5 w-3.5" /> {p?.village ? `${p.village} Village` : 'No village assigned'}
            </p>
            <p className="text-green-200 text-xs mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
              <HiCalendar className="h-3.5 w-3.5" /> Joined {memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Personal Information ─── */}
      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-slate-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiOfficeBuilding className="h-4 w-4 text-green-500" /> Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label dark={dark}>Full Name</Label>
            <input type="text" value={p?.name || ''} readOnly className={inp} />
          </div>
          <div>
            <Label dark={dark}>Email Address</Label>
            <input type="text" value={p?.email || ''} readOnly className={inp} />
          </div>
          <div>
            <Label dark={dark}>Mobile Number</Label>
            <input type="text" value={p?.phone || app?.mobile || ''} readOnly className={inp} />
          </div>
          <div>
            <Label dark={dark}>Gender</Label>
            <input type="text" value={app?.gender || ''} readOnly className={inp} />
          </div>
          <div className="sm:col-span-2">
            <Label dark={dark}>Village</Label>
            <input type="text" value={p?.village || app?.village || ''} readOnly className={inp} />
          </div>
          {p?.assignedAreas?.length > 0 && (
            <div className="sm:col-span-2">
              <Label dark={dark}>Coverage Areas</Label>
              <div className="flex flex-wrap gap-2">
                {p.assignedAreas.map((area, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${dk('bg-green-900/30 text-green-400 border border-green-800', 'bg-green-50 text-green-700 border border-green-200')}`}>
                    <HiLocationMarker className="h-3 w-3" /> {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Application Details ─── */}
      {app && (
        <div className={`rounded-lg border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-slate-700', 'bg-white border-slate-200')}`}>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
            <HiClipboardList className="h-4 w-4 text-green-500" /> Green Champion Application Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Application ID" value={app.requestId} dark={dark} />
            <InfoRow label="Application Date" value={app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null} dark={dark} />
            <InfoRow label="Approval Date" value={approvedDate} dark={dark} />
            <InfoRow label="Approved By" value={app.reviewedBy || 'N/A'} dark={dark} />
            <InfoRow label="Application Status" value={app.status} dark={dark} />
            <InfoRow label="Assigned Village" value={app.village} dark={dark} />
            {app.reason && <InfoRow label="Reason for Applying" value={app.reason} dark={dark} />}
            {app.otherReason && <InfoRow label="Custom Reason" value={app.otherReason} dark={dark} />}
            {app.rejectionReason && <InfoRow label="Rejection Reason" value={app.rejectionReason} dark={dark} />}
          </div>
        </div>
      )}


      {/* ─── Badges ─── */}
      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-slate-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiBadgeCheck className="h-4 w-4 text-green-500" /> Rewards & Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {badges.map((b, i) => (
            <BadgeItem key={i} label={b.label} earned={b.earned} dark={dark} />
          ))}
        </div>
      </div>

      {/* ─── Account Information ─── */}
      <div className={`rounded-lg border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-slate-700', 'bg-white border-slate-200')}`}>
        <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200', 'text-slate-700')}`}>
          <HiLockClosed className="h-4 w-4 text-green-500" /> Account Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Account Status" value={p?.accountStatus || 'Active'} dark={dark} />
          <InfoRow label="Last Active" value={lastActive} dark={dark} />
          <InfoRow label="Registration Date" value={memberSince} dark={dark} />
          <InfoRow label="Role" value="Green Champion" dark={dark} />
          <InfoRow label="Green Champion ID" value={p?.greenChampionId || 'N/A'} dark={dark} />
          <InfoRow label="GC Request ID" value={app?.requestId || 'N/A'} dark={dark} />
        </div>
      </div>

      {/* ─── Footer note ─── */}
      <p className={`text-xs text-center ${dk('text-slate-500', 'text-slate-400')}`}>
        <HiClock className="h-3.5 w-3.5 inline mr-1" />
        Profile data updates in real-time. Last synced with server.
      </p>
    </div>
  );
};

export default GreenChampionProfile;