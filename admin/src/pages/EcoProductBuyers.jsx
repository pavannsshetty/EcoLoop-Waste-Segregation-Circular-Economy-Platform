import { useEffect, useState } from 'react';
import {
  HiSearch,
  HiX,
  HiUser,
  HiShoppingCart,
  HiLocationMarker,
  HiRefresh,
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import socket from '../socket';

const API_BASE = '/api/admin/eco-shopping/buyers';
const ADMIN_TOKEN = () => localStorage.getItem('admin-token');

const STATUS_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-900',
  Assigned: 'bg-blue-100 text-blue-900',
  'Out for Delivery': 'bg-amber-100 text-amber-900',
  Delivered: 'bg-green-100 text-green-900',
};

const BADGE_VARIANTS = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-200/15 dark:text-amber-300',
  assigned: 'bg-blue-100 text-blue-900 dark:bg-blue-200/15 dark:text-blue-300',
  delivered: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-200/15 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-200/15 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-900 dark:bg-rose-200/15 dark:text-rose-300',
  muted: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const badgeClasses = (variant = 'default') =>
  `inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.default}`;

const statusVariant = (value) => {
  if (!value) return 'muted';
  const key = value.toLowerCase();
  if (key.includes('pending')) return 'pending';
  if (key.includes('assigned')) return 'assigned';
  if (key.includes('delivered') || key.includes('completed')) return 'delivered';
  if (key.includes('out')) return 'assigned';
  if (key.includes('failed') || key.includes('cancel') || key.includes('rejected')) return 'cancelled';
  return 'default';
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EcoProductBuyers = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);

  const [buyers, setBuyers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const totalOrders = buyers.reduce((sum, buyer) => sum + (buyer.totalOrders || 0), 0);

  const fetchBuyers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      if (sort) params.set('sort', sort);
      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load buyers.');
      setBuyers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load buyers.');
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (userId) => {
    if (!userId) return;
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${userId}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load buyer history.');
      setDetails(data);
    } catch (err) {
      setDetails(null);
      setError(err.message || 'Unable to load buyer history.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, [status, search, sort]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handler = () => {
      fetchBuyers();
      if (selected) fetchDetails(selected._id);
    };
    socket.on('ECO_SHOPPING_ORDER_UPDATED', handler);
    return () => {
      socket.off('ECO_SHOPPING_ORDER_UPDATED', handler);
    };
  }, [selected]);

  useEffect(() => {
    if (selected) fetchDetails(selected._id);
    else setDetails(null);
  }, [selected]);

  const openDetails = (buyer) => setSelected(buyer);
  const closeDetails = () => setSelected(null);

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight ${dk('text-slate-200', 'text-slate-800')}`}>Eco Product Buyers</h1>
          <p className={`mt-1 text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Manage eco buyers, order status, and purchase insights in one compact dashboard.</p>
        </div>
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_auto] p-4">
          <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group ${dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'}`}>
            <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search buyer, email, phone or product"
              className="w-full bg-transparent border-none text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Order status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="recent">Most Recent</option>
                <option value="amount">Highest Spend</option>
                <option value="orders">Most Orders</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            <div className="hidden lg:flex items-center justify-end">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${dk('bg-slate-800 text-slate-200', 'bg-slate-100 text-slate-600')}`}>{buyers.length} buyers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={`rounded-lg border bg-white p-4 text-sm shadow-sm transition dark:border-slate-700/80 dark:bg-slate-950 ${dk('border-gray-700','border-slate-200')}`}>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Total buyers</p>
          <p className={`mt-2 text-xl font-semibold ${dk('text-white','text-slate-900')}`}>{buyers.length}</p>
        </div>
        <div className={`rounded-lg border bg-white p-4 text-sm shadow-sm transition dark:border-slate-700/80 dark:bg-slate-950 ${dk('border_gray-700','border-slate-200')}`}>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Total orders</p>
          <p className={`mt-2 text-xl font-semibold ${dk('text-white','text-slate-900')}`}>{totalOrders}</p>
        </div>
        <div className={`rounded-lg border bg-white p-4 text-sm shadow-sm transition dark:border-slate-700/80 dark:bg-slate-950 ${dk('border-gray-700','border-slate-200')}`}>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">List status</p>
          <p className={`mt-2 text-xl font-semibold ${dk('text-white','text-slate-900')}`}>{loading ? 'Refreshing' : 'Live'}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-900/20 dark:text-rose-100">
          {error}
        </div>
      )}

      <section className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                <th className="px-5 py-3 text-left font-semibold">Buyer</th>
                <th className="px-5 py-3 text-left font-semibold">Contact</th>
                <th className="px-5 py-3 text-left font-semibold">Address</th>
                <th className="px-5 py-3 text-left font-semibold">Product</th>
                <th className="px-5 py-3 text-left font-semibold">Qty</th>
                <th className="px-5 py-3 text-left font-semibold">Order Date</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Payment</th>
                <th className="px-5 py-3 text-left font-semibold">Total</th>
                <th className="px-5 py-3 text-left font-semibold">Delivery</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className={`border-b ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td colSpan="11" className="px-5 py-4">
                      <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : buyers.length === 0 ? (
                <tr>
                  <td colSpan="11" className={`px-5 py-12 text-center text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
                    No buyers matched your filters. Try another search or refresh the list.
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                          {buyer.profilePhoto ? (
                            <img src={buyer.profilePhoto} alt={buyer.name} className="h-full w-full object-cover" />
                          ) : (
                            (buyer.name || 'B')[0].toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{buyer.name}</p>
                          <p className={`truncate text-[10px] uppercase tracking-wide ${dk('text-slate-500', 'text-slate-500')}`}>{buyer.totalOrders || 0} orders</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm leading-5 text-slate-500 dark:text-slate-400">
                      <div className="truncate">{buyer.email || 'Not provided'}</div>
                      <div className="truncate mt-1">{buyer.phone || 'Not provided'}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {buyer.address ? buyer.address : <span className={badgeClasses('muted')}>Not provided</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">{buyer.latestProductName || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{buyer.latestQuantity || 1}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDate(buyer.latestOrderDate)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={badgeClasses(statusVariant(buyer.latestOrderStatus))}>{buyer.latestOrderStatus || 'Not provided'}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={badgeClasses(statusVariant(buyer.latestPaymentStatus))}>{buyer.latestPaymentStatus || 'Not provided'}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">₹{buyer.totalAmount?.toLocaleString() || '0'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{buyer.latestDeliveryAddress || 'Not provided'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => openDetails(buyer)}
                        className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeDetails} />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-2xl transition-all duration-200 ease-out dark:border-slate-800/80 dark:bg-slate-950 animate-in fade-in zoom-in-95">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-2xl font-semibold text-white shadow-lg">
                  {details?.user?.profilePhoto ? (
                    <img src={details?.user?.profilePhoto} alt={details?.user?.name || selected.name || 'Buyer'} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    (details?.user?.name || selected.name || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{details?.user?.name || selected.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Eco buyer details, quick stats, and recent order history.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Buyer details</div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-900 dark:text-white">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Email</p>
                      <p className="mt-1 font-semibold">{details?.user?.email || selected.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Mobile</p>
                      <p className="mt-1 font-semibold">{details?.user?.phone || selected.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Status</p>
                      <p className="mt-1 font-semibold">{details?.user?.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Joined</p>
                      <p className="mt-1 font-semibold">{formatDate(details?.user?.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Location</div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-900 dark:text-white">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Address</p>
                      <p className="mt-1 font-semibold">{details?.user?.homeAddress || details?.user?.currentLocation || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Orders</p>
                      <p className="mt-1 font-semibold">{details?.orders?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.23em] text-slate-400 dark:text-slate-500">Last order</p>
                      <p className="mt-1 font-semibold">{details?.orders?.length ? formatDate(details?.orders?.[0]?.createdAt) : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Orders', value: details?.orders?.length || 0 },
                  { label: 'Total Spend', value: `₹${((details?.orders?.reduce((sum, o) => sum + (o.finalAmount || 0), 0)) ?? 0).toLocaleString()}` },
                  { label: 'Last order', value: details?.orders?.length ? formatDate(details?.orders?.[0]?.createdAt) : '—' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm dark:border-slate-700/80 dark:bg-slate-950">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/80">
                <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-700/80">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Recent orders</h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest purchase activity for this buyer.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/95 text-slate-600 dark:bg-slate-950/95 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold">Order</th>
                        <th className="px-3 py-3 text-left font-semibold">Product</th>
                        <th className="px-3 py-3 text-left font-semibold">Qty</th>
                        <th className="px-3 py-3 text-left font-semibold">Status</th>
                        <th className="px-3 py-3 text-left font-semibold">Amount</th>
                        <th className="px-3 py-3 text-left font-semibold">Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsLoading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                          <tr key={index} className="border-t border-slate-200 dark:border-slate-700">
                            <td colSpan="6" className="px-3 py-4">
                              <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
                            </td>
                          </tr>
                        ))
                      ) : details?.orders?.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">No orders found for this buyer.</td>
                        </tr>
                      ) : (
                        details?.orders?.map((order) => (
                          <tr key={order._id} className="border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{order._id.slice(-8)}</td>
                            <td className="px-3 py-3 text-slate-500 dark:text-slate-300">{order.itemId?.itemName || 'Eco product'}</td>
                            <td className="px-3 py-3 text-slate-500 dark:text-slate-300">{order.quantity || 1}</td>
                            <td className="px-3 py-3">
                              <span className={badgeClasses(statusVariant(order.deliveryStatus))}>{order.deliveryStatus || 'Not provided'}</span>
                            </td>
                            <td className="px-3 py-3 text-slate-900 dark:text-white">₹{order.finalAmount?.toLocaleString() || '0'}</td>
                            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{formatDate(order.createdAt)}</td>
                          </tr>
                        )) || null
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcoProductBuyers;
