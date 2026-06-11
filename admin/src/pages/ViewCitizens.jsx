import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiCheckCircle,
  HiChevronDown,
  HiEye,
  HiSearch,
  HiX,
  HiUserGroup,
  HiShieldCheck,
  HiShieldExclamation,
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import ModalOverlay from '../components/ModalOverlay';
import { useSocket } from '../context/SocketContext';

const VILLAGES = [
  'Ajri','Albadi','Aloor','Amasebail','Ampar','Anagalli','Asodu','Badakere','Balkur','Basrur',
  'Beejadi','Bellal','Beloor','Belve','Bijoor','Byndoor','Chittoor','Devalkunda','Edmoge',
  'Gangolli','Golihole','Gopadi','Gujjadi','Gulvadi','Hadavu','Hekladi','Halady',
  'Hallady - Harkadi','Hallihole','Halnad','Hangaloor','Harady','Hardally - Mandally',
  'Harkoor','Hattiangadi','Hemmadi','Hengavalli','Heranjal','Heroor','Heskathoor',
  'Hombady - Mandadi','Hosadu','Hosangadi','Hosoor','Idurkunhadi','Jadkal','Japthi',
  'Kalavara','Kalthodu','Kamalashile','Kambadakone','Kandavara','Kanyana','Karkunje',
  'Kattabelthoor','Kavrady','Kedoor','Kenchanoor','Keradi','Kergal','Kirimanjeshwar',
  'Kodladi','Kollur','Koni','Korgi','Kulanje','Kumbashi','Kundabarandadi','Machattu',
  'Madammakki','Maravanthe','Molahalli','Mudoor','Nada','Nandanavana','Navunda','Noojadi',
  'Paduvari','Rattadi','Senapur','Shankaranarayana','Shedimane','Shiroor','Siddapur',
  'Tallur','Thagarasi','Thekkatte','Trashi','Ulloor','Ulthoor','Uppinakudru','Uppunda',
  'Vakwadi','Vandse','Yedthare','Yedyadi - Mathyadi','Yeljith',
].sort((a, b) => a.localeCompare(b));

const STATUS_OPTIONS = ['All Citizens', 'Active', 'Inactive', 'Verified', 'Unverified'];

const ModalShell = ({ title, children, onClose, dk, width = 'max-w-3xl' }) => (
  <ModalOverlay onClose={onClose} className="flex items-center justify-center p-4">
    <div className={`w-full max-w-[95vw] ${width} max-h-[90vh] overflow-hidden rounded-lg border shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
      <div className={`flex items-center justify-between px-5 py-4 border-b ${dk('border-slate-800', 'border-slate-100')}`}>
        <h2 className={`text-base font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{title}</h2>
        <button type="button" onClick={onClose} className={`p-1.5 rounded-lg ${dk('text-slate-400 hover:bg-slate-800', 'text-slate-500 hover:bg-slate-100')}`} aria-label="Close">
          <HiX className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(90vh-65px)] overflow-y-auto p-5">{children}</div>
    </div>
  </ModalOverlay>
);

const Detail = ({ label, value, dk }) => (
  <div>
    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>{label}</p>
    <p className={`mt-1 text-sm break-words ${dk('text-slate-200', 'text-slate-700')}`}>{value || '-'}</p>
  </div>
);

const ViewCitizens = () => {
  const { socket } = useSocket();
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewing, setViewing] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Citizens');
  const [villageFilter, setVillageFilter] = useState('All');
  const [statusOpen, setStatusOpen] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const statusRef = useRef(null);
  const villageRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
      if (villageRef.current && !villageRef.current.contains(e.target)) setVillageOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCitizens = useMemo(() => {
    let result = citizens;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        [c.name, c.email, c.phone, c.village, c._id]
          .some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'All Citizens') {
      if (statusFilter === 'Active') result = result.filter(c => c.accountStatus === 'Active');
      else if (statusFilter === 'Inactive') result = result.filter(c => c.accountStatus !== 'Active');
      else if (statusFilter === 'Verified') result = result.filter(c => c.isVerified);
      else if (statusFilter === 'Unverified') result = result.filter(c => !c.isVerified);
    }
    if (villageFilter !== 'All') {
      result = result.filter(c => c.village === villageFilter);
    }
    return result;
  }, [citizens, search, statusFilter, villageFilter]);

  const stats = useMemo(() => {
    const total = citizens.length;
    const active = citizens.filter(c => c.accountStatus === 'Active').length;
    const inactive = citizens.filter(c => c.accountStatus !== 'Active').length;
    const verified = citizens.filter(c => c.isVerified).length;
    return { total, active, inactive, verified };
  }, [citizens]);

  const section = dk('rounded-lg border border-slate-800 p-4 space-y-4', 'rounded-lg border border-slate-100 p-4 space-y-4');
  const sectionTitle = dk('text-xs font-semibold text-slate-500 uppercase tracking-wider', 'text-xs font-semibold text-slate-400 uppercase tracking-wider');

  const fetchCitizens = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin-token');
      const params = new URLSearchParams();
      if (statusFilter !== 'All Citizens') params.set('status', statusFilter);
      if (villageFilter !== 'All') params.set('village', villageFilter);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString();
      const res = await fetch(`/api/admin/citizens${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load citizens.');
      setCitizens(data.citizens || []);
    } catch (err) {
      setError(err.message || 'Failed to load citizens.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, villageFilter]);

  const fetchCitizenDetail = useCallback(async (id) => {
    setViewLoading(true);
    setViewDetail(null);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/citizen/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load citizen details.');
      setViewDetail(data.citizen);
    } catch (err) {
      setError(err.message || 'Failed to load citizen details.');
    } finally {
      setViewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCitizens(true);
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const sync = () => fetchCitizens(false);
    socket.on('citizen_updated', sync);
    socket.on('profile_updated', sync);
    return () => {
      socket.off('citizen_updated', sync);
      socket.off('profile_updated', sync);
    };
  }, [socket, fetchCitizens]);

  useEffect(() => {
    const onFocus = () => fetchCitizens(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCitizens]);

  const openView = (citizen) => {
    setViewing(citizen);
    setViewDetail(null);
    fetchCitizenDetail(citizen._id);
  };

  const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  const getInitial = (name) => (name || 'C')[0].toUpperCase();

  const selectedStatusLabel = statusFilter;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {viewing && (
        <ModalShell title="Citizen Details" onClose={() => { setViewing(null); setViewDetail(null); }} dk={dk} width="max-w-lg">
          {viewLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : viewDetail ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className={`h-20 w-20 rounded-lg overflow-hidden border-2 flex items-center justify-center shrink-0 ${dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')}`}>
                  {viewDetail.profilePhoto ? (
                    <img src={viewDetail.profilePhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className={`text-2xl font-bold ${dk('text-slate-600', 'text-slate-400')}`}>{getInitial(viewDetail.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-base font-bold truncate ${dk('text-slate-100', 'text-slate-800')}`}>{viewDetail.name}</p>
                  <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{viewDetail.email}</p>
                </div>
              </div>

              <div className={section}>
                <p className={sectionTitle}>Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <Detail label="Full Name" value={viewDetail.name} dk={dk} />
                  <Detail label="Email" value={viewDetail.email} dk={dk} />
                  <Detail label="Phone Number" value={viewDetail.phone} dk={dk} />
                </div>
              </div>

              <div className={section}>
                <p className={sectionTitle}>Location Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <Detail label="Village" value={viewDetail.village || '-'} dk={dk} />
                  <Detail label="Taluk" value={viewDetail.village ? 'Kundapura' : '-'} dk={dk} />
                  <Detail label="District" value={viewDetail.village ? 'Udupi' : '-'} dk={dk} />
                  <Detail label="State" value={viewDetail.village ? 'Karnataka' : '-'} dk={dk} />
                </div>
                {(viewDetail.homeAddress || viewDetail.houseNo || viewDetail.streetArea) && (
                  <div className="mt-4">
                    <Detail label="Address" value={[viewDetail.addressType, viewDetail.houseNo, viewDetail.streetArea, viewDetail.homeAddress, viewDetail.landmark ? `Landmark: ${viewDetail.landmark}` : ''].filter(Boolean).join(', ')} dk={dk} />
                  </div>
                )}
              </div>

              <div className={section}>
                <p className={sectionTitle}>Account Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <Detail label="Registration Date" value={formatDate(viewDetail.createdAt)} dk={dk} />
                  <Detail label="Last Login" value={viewDetail.lastActiveDate ? formatDate(viewDetail.lastActiveDate) : '-'} dk={dk} />
                  <Detail label="Account Status" value={viewDetail.accountStatus || 'Active'} dk={dk} />
                  <Detail label="Verification Status" value={viewDetail.isVerified !== false ? 'Verified' : 'Unverified'} dk={dk} />
                </div>
              </div>

              <div className={section}>
                <p className={sectionTitle}>EcoLoop Statistics</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  <Detail label="Total Reports" value={viewDetail.stats?.totalReports ?? 0} dk={dk} />
                  <Detail label="Pending Reports" value={viewDetail.stats?.pendingReports ?? 0} dk={dk} />
                  <Detail label="Resolved Reports" value={viewDetail.stats?.resolvedReports ?? 0} dk={dk} />
                  <Detail label="Total Eco Points" value={viewDetail.stats?.ecoPoints ?? viewDetail.ecoPoints ?? 0} dk={dk} />
                  <Detail label="Current Streak" value={`${viewDetail.stats?.streakCount ?? viewDetail.streakCount ?? 0} days`} dk={dk} />
                  <Detail label="Highest Streak" value={`${viewDetail.stats?.highestStreak ?? viewDetail.highestStreak ?? 0} days`} dk={dk} />
                  <Detail label="CO₂ Saved" value={`${viewDetail.stats?.co2Saved ?? 0} kg`} dk={dk} />
                  <Detail label="Recycled Waste" value={`${viewDetail.stats?.recycledWaste ?? 0} kg`} dk={dk} />
                </div>
              </div>

              {(viewDetail.recentReports && viewDetail.recentReports.length > 0) && (
                <div className={section}>
                  <p className={sectionTitle}>Recent Reports</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b text-xs uppercase tracking-wide ${dk('border-slate-700 text-slate-500', 'border-slate-100 text-slate-500')}`}>
                          <th className="px-3 py-2 font-semibold text-left">Title</th>
                          <th className="px-3 py-2 font-semibold text-left">Category</th>
                          <th className="px-3 py-2 font-semibold text-left">Status</th>
                          <th className="px-3 py-2 font-semibold text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDetail.recentReports.map((r) => (
                          <tr key={r._id} className={`border-b ${dk('border-slate-800/50', 'border-slate-100')}`}>
                            <td className={`px-3 py-2.5 font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{r.wasteType || r.reportId || 'Report'}</td>
                            <td className={`px-3 py-2.5 text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{r.reportType || 'Public'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                                r.status === 'Resolved' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') :
                                r.status === 'Rejected' ? dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800') :
                                dk('bg-amber-900/50 text-amber-400', 'bg-amber-100 text-amber-800')
                              }`}>{r.status}</span>
                            </td>
                            <td className={`px-3 py-2.5 text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{formatDate(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(!viewDetail.recentReports || viewDetail.recentReports.length === 0) && (
                <div className={`text-center py-6 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
                  No reports submitted yet.
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-6 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
              Could not load citizen details.
            </div>
          )}
        </ModalShell>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Citizens</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{stats.total} citizens registered</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Citizens', value: stats.total, gradient: 'linear-gradient(135deg, #0BAF2A 0%, #059669 100%)' },
          { label: 'Active Citizens', value: stats.active, gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' },
          { label: 'Inactive Citizens', value: stats.inactive, gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
          { label: 'Verified Citizens', value: stats.verified, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' },
        ].map((card) => (
          <div key={card.label} className="w-full p-4 rounded-lg flex items-center gap-4" style={{ background: card.gradient }}>
            <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <HiUserGroup className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70">{card.label}</p>
              <p className="text-2xl font-bold text-white truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group w-full sm:max-w-md ${
        dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
      }`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, village..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div ref={statusRef} className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm transition ${
              dark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HiShieldCheck className="h-4 w-4" />
            {selectedStatusLabel}
            <HiChevronDown className={`h-4 w-4 transition ${statusOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusOpen && (
            <div className={`absolute top-full left-0 mt-1 w-48 rounded-lg border shadow-lg z-20 text-sm ${dk('bg-slate-800 border-slate-700 text-slate-100', 'bg-white border-slate-200 text-slate-800')}`}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setStatusFilter(opt); setStatusOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 transition ${
                    statusFilter === opt
                      ? dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')
                      : dk('hover:bg-slate-700', 'hover:bg-slate-50')
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={villageRef} className="relative">
          <button
            type="button"
            onClick={() => setVillageOpen((o) => !o)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm transition ${
              dark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HiShieldExclamation className="h-4 w-4" />
            {villageFilter === 'All' ? 'All Villages' : villageFilter}
            <HiChevronDown className={`h-4 w-4 transition ${villageOpen ? 'rotate-180' : ''}`} />
          </button>
          {villageOpen && (
            <div className={`absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto rounded-lg border shadow-lg z-20 text-sm ${dk('bg-slate-800 border-slate-700 text-slate-100', 'bg-white border-slate-200 text-slate-800')}`}>
              <button
                type="button"
                onClick={() => { setVillageFilter('All'); setVillageOpen(false); }}
                className={`w-full text-left px-4 py-2.5 transition ${
                  villageFilter === 'All'
                    ? dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')
                    : dk('hover:bg-slate-700', 'hover:bg-slate-50')
                }`}
              >
                All Villages
              </button>
              {VILLAGES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setVillageFilter(v); setVillageOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 transition ${
                    villageFilter === v
                      ? dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')
                      : dk('hover:bg-slate-700', 'hover:bg-slate-50')
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-100 border border-green-200 px-4 py-3 text-sm text-green-800">
          <HiCheckCircle className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className={`rounded-lg border shadow-sm min-w-0 overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Citizens</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search || statusFilter !== 'All Citizens' || villageFilter !== 'All' ? `${filteredCitizens.length} of ${citizens.length}` : `${citizens.length} registered`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredCitizens.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search || statusFilter !== 'All Citizens' || villageFilter !== 'All' ? `No citizens matching your filters.` : 'No citizens yet.'}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  {['Profile', 'Citizen Name', 'Village', 'Joined Date', 'Reports', 'Eco Points', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={`px-5 py-3 font-semibold whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCitizens.map((c) => (
                  <tr key={c._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className={`h-9 w-9 rounded-lg overflow-hidden border-2 flex items-center justify-center shrink-0 ${
                        c.profilePhoto ? '' : dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')
                      }`}>
                        {c.profilePhoto ? (
                          <img src={c.profilePhoto} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className={`text-xs font-bold ${dk('text-slate-600', 'text-slate-400')}`}>{getInitial(c.name)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className={`font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{c.name || 'Unnamed'}</p>
                      <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{c.email || ''}</p>
                      {c.phone && <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{c.phone}</p>}
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap text-sm ${dk('text-slate-400', 'text-slate-600')}`}>{c.village || '-'}</td>
                    <td className={`px-5 py-4 text-xs whitespace-nowrap ${dk('text-slate-500', 'text-slate-400')}`}>{formatDate(c.createdAt)}</td>
                    <td className={`px-5 py-4 text-sm whitespace-nowrap ${dk('text-slate-300', 'text-slate-700')}`}>{c.reportsSubmitted || 0}</td>
                    <td className={`px-5 py-4 text-sm whitespace-nowrap ${dk('text-slate-300', 'text-slate-700')}`}>{c.ecoPoints || c.rewards?.points || 0}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex justify-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
                          c.accountStatus === 'Active'
                            ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                            : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')
                        }`}>
                          {c.accountStatus || 'Active'}
                        </span>
                        <span className={`inline-flex justify-center text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${
                          c.isVerified !== false
                            ? dk('bg-blue-900/50 text-blue-400', 'bg-blue-100 text-blue-800')
                            : dk('bg-gray-700 text-gray-400', 'bg-gray-100 text-gray-600')
                        }`}>
                          {c.isVerified !== false ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openView(c)} title="View" className={`p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`}>
                          <HiEye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredCitizens.map((c) => (
              <div key={c._id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-lg overflow-hidden border-2 flex items-center justify-center shrink-0 ${
                      c.profilePhoto ? '' : dk('border-slate-700 bg-slate-800', 'border-slate-200 bg-slate-50')
                    }`}>
                      {c.profilePhoto ? (
                        <img src={c.profilePhoto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className={`text-sm font-bold ${dk('text-slate-600', 'text-slate-400')}`}>{getInitial(c.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{c.name || 'Unnamed'}</p>
                      <p className={`text-xs truncate ${dk('text-slate-400', 'text-slate-500')}`}>{c.email || ''}</p>
                      <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{c.village || '-'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.accountStatus === 'Active'
                        ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                        : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')
                    }`}>
                      {c.accountStatus || 'Active'}
                    </span>
                    <span className={`inline-flex justify-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.isVerified !== false
                        ? dk('bg-blue-900/50 text-blue-400', 'bg-blue-100 text-blue-800')
                        : dk('bg-gray-700 text-gray-400', 'bg-gray-100 text-gray-600')
                    }`}>
                      {c.isVerified !== false ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Phone</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.phone || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Joined</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{formatDate(c.createdAt)}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Reports</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.reportsSubmitted || 0}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Eco Points</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.ecoPoints || c.rewards?.points || 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => openView(c)} title="View" className={`p-2.5 rounded-lg border ${dk('border-slate-700 text-slate-400', 'border-slate-200 text-slate-500')}`}><HiEye className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewCitizens;