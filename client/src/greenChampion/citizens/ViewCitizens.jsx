import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiSearch, HiEye, HiX, HiOutlineUser, HiOutlineUserCircle, HiUsers, HiBadgeCheck } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';

const ModalShell = ({ title, children, onClose, dark, width = 'max-w-3xl' }) => (
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} max-h-[90vh] overflow-hidden rounded-lg border shadow-2xl ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
          <button type="button" onClick={onClose} className={`rounded-lg p-2 transition ${dark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
);

const Detail = ({ label, value, dark }) => (
  <div>
    <p className={`text-[11px] uppercase tracking-wide font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
    <p className={`mt-1 text-sm ${dark ? 'text-slate-100' : 'text-slate-700'}`}>{value || '-'}</p>
  </div>
);

const formatAddress = (citizen) => {
  const parts = [];
  if (citizen.addressType) parts.push(citizen.addressType);
  if (citizen.houseNo) parts.push(citizen.houseNo);
  if (citizen.streetArea) parts.push(citizen.streetArea);
  if (citizen.homeAddress) parts.push(citizen.homeAddress);
  if (citizen.landmark) parts.push(`Landmark: ${citizen.landmark}`);
  return parts.filter(Boolean).join(', ');
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const StatCard = ({ label, value, icon: Icon, gradient }) => (
  <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: gradient }}>
    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-medium tracking-wider text-white/70">{label}</p>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

const ViewCitizens = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [citizens, setCitizens] = useState([]);
  const [stats, setStats] = useState({ totalCitizens: 0, activeCitizens: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const token = localStorage.getItem('token');
  const baseClass = dark ? 'text-slate-200' : 'text-slate-900';

  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/green-champion/citizens`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Unable to load citizens');
      }
      const data = await res.json();
      setCitizens(data.citizens || []);
      setStats(data.stats || { totalCitizens: 0, activeCitizens: 0 });
    } catch (err) {
      setError(err.message || 'Server error while fetching citizens.');
      setCitizens([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCitizenDetails = useCallback(async (id) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const res = await fetch(`${API}/api/green-champion/citizens/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Unable to load details');
      }
      const data = await res.json();
      setSelectedCitizen(data);
      setIsDetailOpen(true);
    } catch (err) {
      setDetailError(err.message || 'Server error while loading details.');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCitizens(); }, [fetchCitizens]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchCitizens();
    ['profile_updated', 'report_created', 'report_updated'].forEach((e) => socket.on(e, refresh));
    return () => { ['profile_updated', 'report_created', 'report_updated'].forEach((e) => socket.off(e, refresh)); };
  }, [socket, fetchCitizens]);

  const filteredCitizens = useMemo(() => {
    if (!search.trim()) return citizens;
    const q = search.toLowerCase();
    return citizens.filter((c) =>
      [c.name, c.phone, c.email, c.village, c._id]
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [citizens, search]);

  const openDetails = (id) => fetchCitizenDetails(id);
  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedCitizen(null);
    setDetailError('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${baseClass}`}>Citizens</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>View citizens in your assigned village</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Citizens"
          value={stats.totalCitizens}
          icon={HiUsers}
          gradient={dark ? 'linear-gradient(135deg, #2563c4 0%, #3b7fd4 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'}
        />
        <StatCard
          label="Active Citizens"
          value={stats.activeCitizens}
          icon={HiBadgeCheck}
          gradient={dark ? 'linear-gradient(135deg, #157a50 0%, #22a06b 100%)' : 'linear-gradient(135deg, #22C55E 0%, #059669 100%)'}
        />
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group w-full sm:max-w-md ${dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'}`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, mobile, or ID..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Citizens</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredCitizens.length} of ${citizens.length}` : `${citizens.length} registered`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className={`p-8 text-center ${dk('text-slate-200', 'text-slate-700')}`}>
            <p className="text-lg font-semibold">Unable to load citizens</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button type="button" onClick={fetchCitizens} className="mt-4 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
              Retry
            </button>
          </div>
        ) : filteredCitizens.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            <HiOutlineUser className="mx-auto h-10 w-10 text-green-500 mb-4" />
            {search ? `No citizens matching "${search}".` : 'No citizens found in your village.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Citizen ID</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Name</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Mobile Number</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Total Reports</th>
                    <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-right font-semibold whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCitizens.map((citizen) => (
                    <tr key={citizen._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                      <td className={`px-5 py-4 font-mono text-xs font-bold whitespace-nowrap ${dk('text-green-500', 'text-green-600')}`}>
                        {citizen._id.slice(-8)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            {citizen.profilePhoto ? (
                              <img src={citizen.profilePhoto} alt={citizen.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className={`text-sm font-semibold ${dk('text-green-400', 'text-green-600')}`}>{citizen.name?.[0]?.toUpperCase() || 'C'}</span>
                            )}
                          </div>
                          <div>
                            <p className={`font-semibold ${baseClass}`}>{citizen.name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-400">{citizen.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{citizen.phone || '-'}</td>
                      <td className={`px-5 py-4 whitespace-nowrap text-sm font-semibold ${dk('text-slate-300', 'text-slate-700')}`}>{citizen.totalReports}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex min-w-[4rem] justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                          citizen.accountStatus === 'Active'
                            ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                            : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')
                        }`}>
                          {citizen.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => openDetails(citizen._id)}
                          className={`p-2 rounded-lg border transition inline-flex items-center gap-1.5 ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`}
                        >
                          <HiEye className="h-4 w-4" /> <span className="text-xs font-medium">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`md:hidden divide-y ${dk('divide-gray-800', 'divide-slate-100')}`}>
              {filteredCitizens.map((citizen) => (
                <div key={citizen._id} className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      {citizen.profilePhoto ? (
                        <img src={citizen.profilePhoto} alt={citizen.name} className="h-full w-full object-cover" />
                      ) : (
                        <HiOutlineUserCircle className="h-6 w-6 text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${baseClass}`}>{citizen.name || 'Unnamed'}</p>
                      <p className="text-xs text-slate-400">{citizen.phone || '-'}</p>
                      <p className="text-xs text-slate-400 mt-1">{citizen.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex min-w-[4rem] justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                        citizen.accountStatus === 'Active'
                          ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800')
                          : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')
                      }`}>
                        {citizen.accountStatus || 'Active'}
                      </span>
                      <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{citizen.totalReports} reports</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDetails(citizen._id)}
                      className="inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-600"
                    >
                      <HiEye className="h-4 w-4" /> View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isDetailOpen && selectedCitizen && (
        <ModalShell title="Citizen Details" onClose={closeDetails} dark={dark}>
          {detailLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : detailError ? (
            <div className="text-center text-sm text-red-400">{detailError}</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left sm:items-start">
                <div className={`h-24 w-24 rounded-3xl overflow-hidden border ${dark ? 'border-slate-700' : 'border-slate-200'} ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  {selectedCitizen.citizen?.profilePhoto ? (
                    <img src={selectedCitizen.citizen.profilePhoto} alt={selectedCitizen.citizen.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-green-500 text-3xl font-bold text-white">
                      {selectedCitizen.citizen?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                </div>
                <div className="sm:flex-1">
                  <h3 className={`text-xl font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{selectedCitizen.citizen?.name || 'Unknown'}</h3>
                  <p className={`mt-1 text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{selectedCitizen.citizen?.phone || 'No mobile number'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedCitizen.citizen?.phone && (
                      <a href={`tel:${selectedCitizen.citizen.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                        Call
                      </a>
                    )}
                    {selectedCitizen.citizen?.email && (
                      <a href={`mailto:${selectedCitizen.citizen.email}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                        Email
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className={`grid gap-4 md:grid-cols-2 ${dk('bg-slate-900/80 border border-slate-700', 'bg-slate-50 border border-slate-200')} rounded-3xl p-4`}>
                <Detail label="Name" value={selectedCitizen.citizen?.name} dark={dark} />
                <Detail label="Mobile Number" value={selectedCitizen.citizen?.phone} dark={dark} />
                <Detail label="Address" value={formatAddress(selectedCitizen.citizen)} dark={dark} />
                <Detail label="Registration Date" value={formatDate(selectedCitizen.citizen?.createdAt)} dark={dark} />
                <Detail label="Total Reports" value={selectedCitizen.stats?.reportCount ?? 0} dark={dark} />
                <Detail label="Account Status" value={selectedCitizen.citizen?.accountStatus || 'Active'} dark={dark} />
              </div>
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
};

export default ViewCitizens;
