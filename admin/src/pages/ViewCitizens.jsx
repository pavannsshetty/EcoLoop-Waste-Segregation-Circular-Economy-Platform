import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiSearch, HiEye, HiX, HiOutlineUser, HiOutlineUserCircle } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { dataTableStyles } from '../utils/dataTableStyles';

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

const ViewCitizens = () => {
  const { dark } = useTheme();
  const { socket } = useSocket();
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const token = localStorage.getItem('admin-token');
  const baseClass = dark ? 'text-slate-200' : 'text-slate-900';
  const borderClass = dark ? 'border-slate-700' : 'border-slate-200';
  const bgClass = dark ? 'bg-slate-900' : 'bg-white';
  const cardBg = dark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200';

  const fetchCitizens = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/admin/citizens${query ? `?search=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Unable to load citizens');
      }
      const data = await res.json();
      setCitizens(data.citizens || []);
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
      const res = await fetch(`/api/admin/citizen/${id}`, { headers: { Authorization: `Bearer ${token}` } });
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

  useEffect(() => {
    fetchCitizens(search);
  }, [fetchCitizens, search]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => fetchCitizens(search);
    const events = ['collector_updated', 'report_created', 'report_updated', 'profile_updated', 'approval_request_updated'];
    events.forEach((event) => socket.on(event, refresh));
    return () => {
      events.forEach((event) => socket.off(event, refresh));
    };
  }, [socket, fetchCitizens, search]);

  const filteredCitizens = useMemo(() => citizens, [citizens]);

  const openDetails = (id) => fetchCitizenDetails(id);
  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedCitizen(null);
    setDetailError('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${baseClass}`}>Citizens</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{citizens.length} citizens registered</p>
        </div>
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group w-full sm:max-w-md ${dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'}`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, mobile, or village"
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={dataTableStyles.card(dark)}>
        <div className={dataTableStyles.cardHeader(dark)}>
          <h2 className={`text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>All Citizens</h2>
          <span className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{citizens.length} registered</span>
        </div>
        {loading ? (
          <div className={dataTableStyles.loadingWrapper}>
            <div className={dataTableStyles.loadingSpinner} />
          </div>
        ) : error ? (
          <div className={`p-8 text-center ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
            <p className="text-lg font-semibold">Unable to load citizens</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button type="button" onClick={() => fetchCitizens(search)} className="mt-4 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
              Retry
            </button>
          </div>
        ) : filteredCitizens.length === 0 ? (
          <div className={`${dataTableStyles.emptyState} ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            <HiOutlineUser className="mx-auto h-10 w-10 text-green-500" />
            <p className="mt-4 text-base font-semibold">No citizens found</p>
            <p className="mt-2 text-sm text-slate-400">Try adjusting the search term or refresh the page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className={dataTableStyles.headerRow(dark)}>
                  <tr>
                    <th className={dataTableStyles.headCell}>Citizen ID</th>
                    <th className={dataTableStyles.headCell}>Full Name</th>
                    <th className={dataTableStyles.headCell}>Village</th>
                    <th className={dataTableStyles.headCell}>Status</th>
                    <th className={`${dataTableStyles.headCell} text-right`}>View Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCitizens.map((citizen) => (
                    <tr key={citizen._id} className={dataTableStyles.bodyRow(dark)}>
                      <td className={dataTableStyles.bodyCell + ' align-middle text-sm text-slate-500'}>{citizen._id.slice(-8)}</td>
                      <td className={dataTableStyles.bodyCell + ' align-middle'}>
                        <div className="flex items-center gap-3">
                          <div className={`${dataTableStyles.avatar} ${dark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}> 
                            {citizen.profilePhoto ? (
                              <img src={citizen.profilePhoto} alt={citizen.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-green-600">{citizen.name?.[0]?.toUpperCase() || 'C'}</span>
                            )}
                          </div>
                          <div>
                            <p className={`font-semibold ${baseClass}`}>{citizen.name || 'Unnamed citizen'}</p>
                            <p className="text-xs text-slate-400">{citizen.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className={dataTableStyles.bodyCell + ' align-middle text-sm text-slate-500'}>{citizen.village || 'Unknown'}</td>
                      <td className={dataTableStyles.bodyCell + ' align-middle'}>
                        <span className={`${dataTableStyles.badgeBase} ${dataTableStyles.badge(citizen.accountStatus === 'Active', dark)}`}>
                          {citizen.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td className={dataTableStyles.bodyCell + ' align-middle text-right'}>
                        <button
                          type="button"
                          onClick={() => openDetails(citizen._id)}
                          className={dataTableStyles.actionButton(dark)}
                        >
                          <HiEye className={`mr-2 ${dataTableStyles.actionIcon}`} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={dataTableStyles.mobileDivider + ' md:hidden'}>
              {filteredCitizens.map((citizen) => (
                <div key={citizen._id} className={`${dataTableStyles.mobileCard} ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`${'h-12 w-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center'} ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      {citizen.profilePhoto ? (
                        <img src={citizen.profilePhoto} alt={citizen.name} className="h-full w-full object-cover" />
                      ) : (
                        <HiOutlineUserCircle className="h-6 w-6 text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${baseClass}`}>{citizen.name || 'Unnamed citizen'}</p>
                      <p className="text-sm text-slate-400">{citizen.email || 'No email'}</p>
                      <p className="text-sm text-slate-400 mt-1">{citizen.village || 'Unknown village'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className={`${dataTableStyles.badgeBase} ${dataTableStyles.badge(citizen.accountStatus === 'Active', dark)}`}>
                      {citizen.accountStatus || 'Active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openDetails(citizen._id)}
                      className={`inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-600`}
                    >
                      <HiEye className="h-4 w-4" /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                <div className={`h-24 w-24 rounded-3xl overflow-hidden border ${borderClass} ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  {selectedCitizen.citizen.profilePhoto ? (
                    <img src={selectedCitizen.citizen.profilePhoto} alt={selectedCitizen.citizen.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-green-500 text-3xl font-bold text-white">
                      {selectedCitizen.citizen.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                </div>
                <div className="sm:flex-1">
                  <h3 className={`text-xl font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{selectedCitizen.citizen.name || 'Unknown Citizen'}</h3>
                  <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedCitizen.citizen.email || 'No email available'}</p>
                  <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedCitizen.citizen.phone || 'No mobile number'}</p>
                </div>
              </div>

              <div className={`grid gap-4 md:grid-cols-2 ${dark ? 'bg-slate-900/80 border border-slate-700' : 'bg-slate-50 border border-slate-200'} rounded-3xl p-4`}>
                <Detail label="Full Name" value={selectedCitizen.citizen.name} dark={dark} />
                <Detail label="Email" value={selectedCitizen.citizen.email} dark={dark} />
                <Detail label="Mobile Number" value={selectedCitizen.citizen.phone} dark={dark} />
                <Detail label="Village" value={selectedCitizen.citizen.village} dark={dark} />
                <Detail label="Address" value={formatAddress(selectedCitizen.citizen)} dark={dark} />
                <Detail label="Registration Date" value={formatDate(selectedCitizen.citizen.createdAt)} dark={dark} />
                <Detail label="Account Status" value={selectedCitizen.citizen.accountStatus || 'Active'} dark={dark} />
                <Detail label="Total Reports" value={selectedCitizen.stats?.reportCount ?? 0} dark={dark} />
              </div>
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
};

export default ViewCitizens;
