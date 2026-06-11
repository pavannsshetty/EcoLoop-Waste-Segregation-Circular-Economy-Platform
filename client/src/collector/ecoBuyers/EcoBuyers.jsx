import { useEffect, useState, useCallback } from 'react';
import { HiSearch, HiX, HiRefresh, HiPhone, HiMap, HiEye, HiTag, HiUser, HiLocationMarker, HiCheckCircle, HiCube } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import { useSocket } from '../../shared/context/SocketContext';

const STATUSES = ['All', 'Pending', 'Assigned', 'Out for Delivery', 'Delivered'];

const staCls = (st, dk) => {
  const map = {
    'Pending': dk('bg-gray-900/40 text-gray-400', 'bg-gray-100 text-gray-700'),
    'Assigned': dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'Out for Delivery': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    'Delivered': dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || '';
};

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const EcoBuyers = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const token = localStorage.getItem('token');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'All') params.set('status', status);
      const res = await fetch(`${API}/api/collector/eco-buyers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch {} finally { setLoading(false); }
  }, [search, status, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchOrders();
    socket.on('ECO_SHOPPING_ORDER_UPDATED', handler);
    socket.on('new_delivery', handler);
    return () => {
      socket.off('ECO_SHOPPING_ORDER_UPDATED', handler);
      socket.off('new_delivery', handler);
    };
  }, [socket, fetchOrders]);

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/api/collector/delivery/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
    } catch {}
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
  }`;

  const selectCls = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
  }`;

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      {selected && (
        <OrderDetailModal order={selected} dark={dark} dk={dk} onClose={() => setSelected(null)}
          onStatusUpdate={updateStatus} onRefresh={fetchOrders} />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Eco Buyers</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Orders from your assigned villages</p>
        </div>
        <button type="button" onClick={fetchOrders}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')} aria-label="Refresh">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
          <input type="text" placeholder="Search by name, phone, order ID, address..." value={search}
            onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9`} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <HiX className={`h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
            </button>
          )}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} sm:w-44`}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No buyers found for your villages.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-inherit">
          <table className="w-full text-sm">
            <thead className={dk('bg-white/5 text-slate-400', 'bg-slate-50 text-slate-500')}>
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider">Order</th>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider hidden sm:table-cell">Product</th>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider hidden md:table-cell">Village</th>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</th>
                <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {orders.map((o) => (
                <tr key={o._id} className={`transition ${dk('hover:bg-white/[0.03]', 'hover:bg-slate-50')}`}>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-mono font-bold ${dk('text-slate-400', 'text-slate-500')}`}>
                      #{o._id.toString().slice(-8)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700')}`}>
                        {(o.userId?.name || '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{o.userId?.name || 'Unknown'}</p>
                        {o.userId?.phone && (
                          <p className={`text-[10px] ${dk('text-slate-500', 'text-slate-400')}`}>{o.userId.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <p className={`text-xs ${dk('text-slate-300', 'text-slate-700')}`}>{o.itemId?.itemName || 'Unknown'}</p>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{o.deliveryVillage || '-'}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{fmt(o.createdAt)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${staCls(o.deliveryStatus, dk)}`}>
                      {o.deliveryStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelected(o)}
                        className={`p-1.5 rounded-lg transition ${dk('text-slate-400 hover:text-green-400 hover:bg-white/5', 'text-slate-500 hover:text-green-600 hover:bg-slate-100')}`}
                        title="View Details">
                        <HiEye className="h-4 w-4" />
                      </button>
                      {o.userId?.phone && (
                        <a href={`tel:${o.userId.phone}`}
                          className={`p-1.5 rounded-lg transition ${dk('text-slate-400 hover:text-blue-400 hover:bg-white/5', 'text-slate-500 hover:text-blue-600 hover:bg-slate-100')}`}
                          title="Call Customer">
                          <HiPhone className="h-4 w-4" />
                        </a>
                      )}
                      {o.deliveryLatitude && o.deliveryLongitude && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLatitude},${o.deliveryLongitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className={`p-1.5 rounded-lg transition ${dk('text-slate-400 hover:text-purple-400 hover:bg-white/5', 'text-slate-500 hover:text-purple-600 hover:bg-slate-100')}`}
                          title="Open Navigation">
                          <HiMap className="h-4 w-4" />
                        </a>
                      )}
                      {o.deliveryStatus === 'Assigned' && (
                        <button onClick={() => updateStatus(o._id, 'Out for Delivery')}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition"
                          title="Mark Out for Delivery">Go</button>
                      )}
                      {o.deliveryStatus === 'Out for Delivery' && (
                        <button onClick={() => updateStatus(o._id, 'Delivered')}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                          title="Mark Delivered">Deliver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const OrderDetailModal = ({ order: o, dark, dk, onClose, onStatusUpdate }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden ${dk('bg-gray-900 border-gray-700', 'bg-white border-slate-200')}`}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-inherit">
        <h2 className={`text-sm font-bold ${dk('text-slate-200', 'text-slate-800')}`}>Order Details</h2>
        <button onClick={onClose} className={dk('text-slate-500 hover:text-slate-300', 'text-slate-400 hover:text-slate-600')}>
          <HiX className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold ${dk('text-slate-400', 'text-slate-500')}`}>#{o._id.toString().slice(-8)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${staCls(o.deliveryStatus, dk)}`}>{o.deliveryStatus}</span>
          </div>
        </div>

        {o.itemId && (
          <div className="flex items-center gap-3">
            {o.itemId.image && (
              <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-black/10">
                <img src={o.itemId.image} alt={o.itemId.itemName} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{o.itemId.itemName}</p>
              <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>
                <HiTag className="inline h-3 w-3 mr-0.5" />₹{o.finalAmount} &middot; Qty: {o.quantity || 1}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Customer</p>
            <div className="flex items-center gap-2">
              <HiUser className={`h-4 w-4 shrink-0 ${dk('text-green-400', 'text-green-600')}`} />
              <span className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{o.userId?.name || 'Unknown'}</span>
            </div>
            {o.userId?.phone && (
              <div className="flex items-center gap-2 mt-1">
                <HiPhone className={`h-4 w-4 shrink-0 ${dk('text-green-400', 'text-green-600')}`} />
                <span className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>{o.userId.phone}</span>
              </div>
            )}
          </div>

          <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Delivery Address</p>
            <div className="flex items-start gap-2">
              <HiLocationMarker className={`h-4 w-4 shrink-0 mt-0.5 ${dk('text-green-400', 'text-green-600')}`} />
              <div className="min-w-0">
                <p className={`text-sm ${dk('text-slate-200', 'text-slate-800')}`}>{o.deliveryAddress || 'No address'}</p>
                {o.deliveryVillage && (
                  <p className={`text-xs mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Village: {o.deliveryVillage}</p>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk('text-slate-500', 'text-slate-400')}`}>Order Info</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className={dk('text-slate-400', 'text-slate-500')}>Amount:</span>
              <span className={`font-semibold text-right ${dk('text-slate-200', 'text-slate-800')}`}>₹{o.finalAmount}</span>
              <span className={dk('text-slate-400', 'text-slate-500')}>Payment:</span>
              <span className={`font-semibold text-right ${dk('text-slate-200', 'text-slate-800')}`}>{o.paymentMethod}</span>
              <span className={dk('text-slate-400', 'text-slate-500')}>Date:</span>
              <span className={`font-semibold text-right ${dk('text-slate-200', 'text-slate-800')}`}>{fmt(o.createdAt)}</span>
              <span className={dk('text-slate-400', 'text-slate-500')}>Qty:</span>
              <span className={`font-semibold text-right ${dk('text-slate-200', 'text-slate-800')}`}>{o.quantity || 1}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {o.userId?.phone && (
            <a href={`tel:${o.userId.phone}`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
              <HiPhone className="h-3.5 w-3.5" /> Call
            </a>
          )}
          {o.deliveryLatitude && o.deliveryLongitude && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLatitude},${o.deliveryLongitude}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition">
              <HiMap className="h-3.5 w-3.5" /> Navigate
            </a>
          )}
          {o.deliveryStatus === 'Assigned' && (
            <button onClick={() => { onStatusUpdate(o._id, 'Out for Delivery'); onClose(); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition">
              Out for Delivery
            </button>
          )}
          {o.deliveryStatus === 'Out for Delivery' && (
            <button onClick={() => { onStatusUpdate(o._id, 'Delivered'); onClose(); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
              Mark Delivered
            </button>
          )}
          {o.deliveryStatus === 'Delivered' && (
            <span className={`flex items-center gap-1 text-xs font-medium ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-4 w-4" /> Delivered
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default EcoBuyers;
