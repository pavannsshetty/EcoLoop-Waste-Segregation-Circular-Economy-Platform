import { useEffect, useState } from 'react';
import { HiShoppingCart } from 'react-icons/hi';
import { useOutletContext } from 'react-router-dom';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';

const statusStyle = (status, dark) => {
  const map = {
    Pending:        dark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
    Submitted:      dark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
    Assigned:       dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800',
    'In Progress':  dark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-800',
    'Out for Delivery': dark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800',
    Delivered:      dark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800',
    Completed:      dark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-800',
    Cancelled:      dark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800',
    Rejected:       dark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-800',
  };
  return map[status] || (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700');
};

const MyOrders = () => {
  const { dark } = useTheme();
  const { toast } = useOutletContext() || {};
  const dk = (d, l) => (dark ? d : l);

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/eco-shopping/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Unable to load orders.');
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Please sign in to view your orders.');
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [token]);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filter === 'all' || order.deliveryStatus === filter;
    const normalizedSearch = search.trim().toLowerCase();
    if (!matchesStatus || !normalizedSearch) return matchesStatus;
    return [
      order.itemId?.itemName,
      order.deliveryAddress,
      order.assignedCollector?.name,
      order.assignedCollector?.collectorId,
      order._id,
    ].some((value) => value?.toString().toLowerCase().includes(normalizedSearch));
  });

  return (
    <div className="p-3 sm:p-5 space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className={`text-base font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>My Eco Shopping Orders</h1>
        <p className={`text-xs font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Track delivery status and assignment details for your orders.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by product, collector, or address"
            className={`w-full h-9 rounded-xl border px-3 text-xs outline-none ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Filter by Status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`h-9 rounded-lg border px-2 text-xs outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
            <option value="all">All</option>
            <option value="Submitted">Submitted</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className={`rounded-xl border p-4 text-xs ${dk('border-red-700/40 bg-red-900/20 text-red-200', 'border-red-200 bg-red-50 text-red-700')}`}>{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-8 text-center ${dk('border-white/10 bg-white/5 text-slate-300', 'border-slate-200 bg-slate-50 text-slate-500')}`}>
          <HiShoppingCart className="mx-auto h-8 w-8 text-green-500 mb-3" />
          <p className="text-xs font-medium">No orders match this status.</p>
          <p className="text-[11px] text-slate-400">Check your order history later or browse new eco products.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order._id} className={`rounded-2xl border p-3 sm:p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-white')}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusStyle(order.deliveryStatus, dark)}`}>{order.deliveryStatus}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Order ID</span>
                    <span className={`text-[10px] font-medium ${dk('text-slate-200', 'text-slate-600')}`}>{order._id.slice(-8)}</span>
                  </div>
                  <h2 className={`mt-2 text-base font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.itemId?.itemName || 'Eco product'}</h2>
                  <p className={`text-xs ${dk('text-slate-300', 'text-slate-600')}`}>{order.itemId?.category || ''}</p>
                </div>
                <div className="space-y-1 text-left sm:text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Placed</div>
                  <div className={`text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="grid gap-2 mt-3 grid-cols-2 lg:grid-cols-4">
                <div className={`rounded-xl border p-2.5 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[9px] uppercase tracking-widest text-slate-400">Payment</div>
                  <div className={`mt-1 text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.paymentMethod}</div>
                  <div className="text-[11px] text-slate-400">₹{order.finalAmount}</div>
                </div>
                <div className={`rounded-xl border p-2.5 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[9px] uppercase tracking-widest text-slate-400">Assigned Collector</div>
                  <div className={`mt-1 text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.assignedCollector?.name || 'Not assigned'}</div>
                  {order.assignedCollector?.phone && <div className="text-[11px] text-slate-400">{order.assignedCollector.phone}</div>}
                </div>
                <div className={`rounded-xl border p-2.5 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[9px] uppercase tracking-widest text-slate-400">Delivery Address</div>
                  <div className={`mt-1 text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.deliveryAddress || 'Not provided'}</div>
                </div>
                <div className={`rounded-xl border p-2.5 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[9px] uppercase tracking-widest text-slate-400">Contact</div>
                  <div className={`mt-1 text-xs font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.userId?.name || 'You'}</div>
                  {order.userId?.phone && <div className="text-[11px] text-slate-400">{order.userId.phone}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
