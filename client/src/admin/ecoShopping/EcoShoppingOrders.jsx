import { useEffect, useState } from 'react';
import { HiRefresh, HiShoppingCart, HiUser, HiCalendar, HiLocationMarker, HiCheckCircle, HiPencilAlt } from 'react-icons/hi';
import { useOutletContext } from 'react-router-dom';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';

const statusStyle = (status, dark) => {
  const map = {
    Pending:        dark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
    Assigned:       dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800',
    'Out for Delivery': dark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800',
    Delivered:      dark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800',
  };
  return map[status] || (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700');
};

const EcoShoppingOrders = () => {
  const { dark } = useTheme();
  const { toast } = useOutletContext() || {};
  const dk = (d, l) => (dark ? d : l);

  const [orders, setOrders] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectorFilter, setCollectorFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const adminToken = localStorage.getItem('adminToken');

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (collectorFilter !== 'all') params.set('collectorId', collectorFilter);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    return params.toString() ? `?${params.toString()}` : '';
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/eco-shopping/orders${buildQuery()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load orders.');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectors = async () => {
    try {
      const res = await fetch(`${API}/api/admin/collectors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (res.ok && data.collectors) setCollectors(data.collectors);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, collectorFilter, searchTerm]);

  const handleAssignment = async (orderId) => {
    const collectorId = assignments[orderId];
    if (!collectorId) {
      toast?.error('Please select a collector first.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/eco-shopping/orders/${orderId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ collectorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to assign collector.');
      toast?.success(data.message || 'Collector assigned.');
      fetchOrders();
    } catch (err) {
      toast?.error(err.message || 'Unable to assign collector.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>Eco Shopping Order Management</h1>
          <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Assign collectors and track delivery progress for marketplace orders.</p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${dk('border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10', 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}`}>
          <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, product or citizen"
            className={`w-full h-11 rounded-2xl border px-4 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-900')}`}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Delivery Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assigned Collector</label>
          <select
            value={collectorFilter}
            onChange={(e) => setCollectorFilter(e.target.value)}
            className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
            <option value="all">All Collectors</option>
            {collectors.map((collector) => (
              <option key={collector._id} value={collector._id}>{collector.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className={`rounded-xl border p-6 text-sm ${dk('border-red-700/40 bg-red-900/20 text-red-200', 'border-red-200 bg-red-50 text-red-700')}`}>{error}</div>
      ) : orders.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-12 text-center ${dk('border-white/10 bg-white/5 text-slate-300', 'border-slate-200 bg-slate-50 text-slate-500')}`}>
          <HiShoppingCart className="mx-auto h-10 w-10 text-green-500 mb-4" />
          <p className="text-sm font-medium">No orders found.</p>
          <p className="text-xs text-slate-400">Wait for purchases from citizens to appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className={`rounded-3xl border p-5 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-white')}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${statusStyle(order.deliveryStatus, dark)}`}>{order.deliveryStatus}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order ID</span>
                    <span className={`text-xs font-semibold ${dk('text-slate-200', 'text-slate-600')}`}>{order._id.slice(-8)}</span>
                  </div>
                  <h2 className={`mt-3 text-lg font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.itemId?.itemName || 'Eco product'}</h2>
                  <p className={`text-sm ${dk('text-slate-300', 'text-slate-600')}`}>{order.itemId?.category || ''}</p>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Placed</div>
                  <div className={`font-semibold ${dk('text-white', 'text-slate-900')}`}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="grid gap-3 mt-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`rounded-2xl border p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Citizen</div>
                  <div className={`mt-2 text-sm font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.userId?.name || 'Unknown'}</div>
                  {order.userId?.phone && <div className="text-xs text-slate-400">{order.userId.phone}</div>}
                </div>
                <div className={`rounded-2xl border p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Amount</div>
                  <div className={`mt-2 text-sm font-semibold ${dk('text-white', 'text-slate-900')}`}>₹{order.finalAmount}</div>
                  <div className="text-xs text-slate-400">{order.paymentMethod}</div>
                </div>
                <div className={`rounded-2xl border p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Collector</div>
                  <div className={`mt-2 text-sm font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.assignedCollector?.name || 'Not assigned'}</div>
                  {order.assignedCollector?.collectorId && <div className="text-xs text-slate-400">{order.assignedCollector.collectorId}</div>}
                </div>
                <div className={`rounded-2xl border p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50')}`}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Delivery Location</div>
                  <div className={`mt-2 text-sm font-semibold ${dk('text-white', 'text-slate-900')}`}>{order.deliveryAddress || 'Not provided'}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assign / Reassign Collector</label>
                  <select
                    value={assignments[order._id] ?? order.assignedCollector?._id ?? 'none'}
                    onChange={(e) => setAssignments((prev) => ({ ...prev, [order._id]: e.target.value }))}
                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
                    <option value="none">Select collector</option>
                    {collectors.map((collector) => (
                      <option key={collector._id} value={collector._id}>{collector.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end gap-3">
                  <button
                    type="button"
                    disabled={saving || !assignments[order._id] || assignments[order._id] === 'none'}
                    onClick={() => handleAssignment(order._id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${saving ? 'opacity-60 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-500'}`}>
                    <HiPencilAlt className="h-4 w-4" />
                    {order.assignedCollector ? 'Update Assignment' : 'Assign Collector'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EcoShoppingOrders;
