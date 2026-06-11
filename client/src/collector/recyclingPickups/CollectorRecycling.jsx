import { useState, useEffect } from 'react';
import { HiRefresh, HiPhone, HiLocationMarker, HiUser, HiCheckCircle, HiX } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import socket from '../../socket';

const fmtDt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const staCls = (st, dk) => {
  const map = {
    Requested: dk('bg-amber-900/40 text-amber-400', 'bg-amber-100 text-amber-800'),
    Accepted:  dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    Collected: dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Cancelled: dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700'),
  };
  return map[st] || map.Requested;
};

const DetailModal = ({ pickup, onClose, dk }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`rounded-lg border w-full max-w-lg p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto ${panel}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Pickup Details</p>
          <button type="button" onClick={onClose} className={dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-800')}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className={`text-xs ${label}`}>Citizen</p>
            <div className={`flex items-center gap-2 ${value}`}>
              <HiUser className="h-4 w-4 text-green-500" />
              <span className="font-medium">{pickup.citizen?.name || 'Unknown'}</span>
            </div>
          </div>
          {pickup.citizen?.phone && (
            <div>
              <p className={`text-xs ${label}`}>Phone</p>
              <a href={`tel:${pickup.citizen.phone}`} className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:underline">
                <HiPhone className="h-4 w-4" /> {pickup.citizen.phone}
              </a>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Waste Type</p>
            <p className={`text-sm font-medium ${value}`}>{pickup.type}</p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Quantity</p>
            <p className={`text-sm font-medium ${value}`}>{pickup.quantity}</p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Address</p>
            <p className={`text-sm ${value}`}>{pickup.address}</p>
          </div>
          {pickup.notes && (
            <div>
              <p className={`text-xs ${label}`}>Notes</p>
              <p className={`text-sm ${value}`}>{pickup.notes}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(pickup.status, dk)}`}>{pickup.status}</span>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Requested</p>
            <p className={`text-sm ${value}`}>{fmtDt(pickup.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CollectorRecycling = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const token = localStorage.getItem('token');

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/recycling`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPickups(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPickups(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (updated) => {
      setPickups((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    };
    socket.on('recycling_updated', handler);
    socket.on('recycling_request_updated', handler);
    return () => {
      socket.off('recycling_updated', handler);
      socket.off('recycling_request_updated', handler);
    };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/collector/recycling/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPickups((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      }
    } catch {}
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      {detail && <DetailModal pickup={detail} onClose={() => setDetail(null)} dk={dk} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Recycling Pickups</h1>
          <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage recyclable waste collection requests</p>
        </div>
        <button type="button" onClick={fetchPickups} className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')} aria-label="Refresh">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : pickups.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No recycling pickups found in your area.</div>
      ) : (
        pickups.map((p) => (
          <div key={p._id} className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-700 text-white">Recycling</span>
                  <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{p.type}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(p.status, dk)}`}>{p.status}</span>
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                  <HiUser className="h-3 w-3 text-green-500 shrink-0" />
                  {p.citizen?.name || 'Unknown Citizen'}
                  {p.citizen?.phone && <span className={`font-normal ${dk('text-slate-400', 'text-slate-500')}`}> · {p.citizen.phone}</span>}
                </p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                  <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">{p.address}</span>
                </p>
                <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {p.quantity}</p>
              </div>
              <div className="flex items-start gap-2 shrink-0">
                {p.citizen?.phone && (
                  <a href={`tel:${p.citizen.phone}`} className={`flex items-center justify-center h-8 w-8 rounded-full border transition ${dk('border-green-700 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')}`} title={`Call ${p.citizen.phone}`}>
                    <HiPhone className="h-4 w-4" />
                  </a>
                )}
                <button type="button" onClick={() => setDetail(p)} className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>View</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status === 'Requested' && (
                <button type="button" onClick={() => updateStatus(p._id, 'Accepted')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">Accept Pickup</button>
              )}
              {p.status === 'Accepted' && (
                <button type="button" onClick={() => updateStatus(p._id, 'Collected')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition flex items-center gap-1.5">
                  <HiCheckCircle className="h-3.5 w-3.5" /> Mark Collected
                </button>
              )}
              {p.status === 'Collected' && (
                <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                  <HiCheckCircle className="h-3.5 w-3.5" /> Completed {fmtDt(p.updatedAt)}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CollectorRecycling;
