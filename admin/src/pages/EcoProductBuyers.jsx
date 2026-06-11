import { useEffect, useState } from 'react';
import { HiSearch, HiX, HiCube, HiShoppingCart, HiChartBar, HiExclamation } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import ModalOverlay from '../components/ModalOverlay';
import socket from '../socket';

const API_BASE = '/api/admin/eco-shopping/buyers';
const ANALYTICS_BASE = '/api/eco-shopping';
const ADMIN_TOKEN = () => localStorage.getItem('admin-token');

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
  const [analytics, setAnalytics] = useState(null);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const totalOrders = buyers.reduce((sum, buyer) => sum + (buyer.totalOrders || 0), 0);
  const totalRevenue = buyers.reduce((sum, buyer) => sum + (buyer.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const card = `rounded-lg border shadow-sm ${dk('bg-slate-800 border-gray-700', 'bg-white border-slate-100')}`;
  const textMuted = dk('text-slate-400', 'text-slate-500');

  const fetchBuyers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
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
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
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

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${ANALYTICS_BASE}/analytics`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      setAnalytics(data);
    } catch { }
  };

  useEffect(() => {
    fetchBuyers();
  }, [search]);

  useEffect(() => {
    fetchAnalytics();
    if (!socket.connected) socket.connect();
    const handler = () => {
      fetchBuyers();
      if (selected) fetchDetails(selected._id);
    };
    const analyticsHandler = () => fetchAnalytics();
    socket.on('ECO_SHOPPING_ORDER_UPDATED', handler);
    socket.on('STORE_ANALYTICS_UPDATED', analyticsHandler);
    return () => {
      socket.off('ECO_SHOPPING_ORDER_UPDATED', handler);
      socket.off('STORE_ANALYTICS_UPDATED', analyticsHandler);
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

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group max-w-md ${dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'}`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order, customer or product..."
          className="w-full bg-transparent border-none text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Buyers', value: buyers.length, icon: HiCube, color: 'text-blue-500', grad: 'from-blue-500/10 to-blue-500/5' },
          { label: 'Total Orders', value: totalOrders, icon: HiShoppingCart, color: 'text-purple-500', grad: 'from-purple-500/10 to-purple-500/5' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: HiChartBar, color: 'text-green-500', grad: 'from-green-500/10 to-green-500/5' },
          { label: 'Avg Order Value', value: `₹${avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: HiExclamation, color: 'text-red-500', grad: 'from-red-500/10 to-red-500/5' },
        ].map(({ label, value, icon: Icon, color, grad }) => (
          <div key={label} className={`${card} p-4 text-center bg-gradient-to-br ${grad}`}>
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${textMuted}`}>{label}</p>
          </div>
        ))}
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
                <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Order ID</th>
                <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Customer &amp; Phone</th>
                <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Address</th>
                <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Product</th>
                <th className="px-5 py-3 text-right font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className={`border-b ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td colSpan="5" className="px-5 py-4">
                      <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : buyers.length === 0 ? (
                <tr>
                  <td colSpan="5" className={`px-5 py-12 text-center text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
                    No buyers found.
                  </td>
                </tr>
              ) : (
                buyers.map((buyer, idx) => (
                  <tr key={buyer._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-green-600 text-sm">
                      ECO-ORD-{String(buyer._id).slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm leading-5">
                      <div className={`font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{buyer.name || 'Unknown'}</div>
                      <div className={`truncate mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>{buyer.phone || 'Not provided'}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                      {buyer.address ? buyer.address : <span className={badgeClasses('muted')}>Not provided</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">{buyer.latestProductName || '—'}</td>
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
        <ModalOverlay onClose={closeDetails} className="flex p-4 sm:p-6 overflow-y-auto">
          <div className={`relative m-auto w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-full flex flex-col rounded-lg border shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className={`px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 rounded-t-lg sticky top-0 z-10 ${dk('border-slate-800 bg-slate-900', 'border-slate-100 bg-white')}`}>
              <h2 className={`text-lg font-bold truncate ${dk('text-slate-200', 'text-slate-800')}`}>
                Order — ECO-ORD-{String(selected._id).slice(-6).toUpperCase()}
              </h2>
              <button onClick={closeDetails} className={`p-1.5 rounded-lg transition shrink-0 ${dk('text-slate-400 hover:bg-slate-800 hover:text-white', 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}`}>
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="space-y-5">
                <div>
                  <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Name:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{details?.user?.name || selected.name || 'N/A'}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Phone:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{details?.user?.phone || selected.phone || 'N/A'}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Email:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{details?.user?.email || selected.email || 'N/A'}</span></p>
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Product:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{selected.latestProductName || '—'}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Quantity:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{selected.latestQuantity || 1}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Amount:</span> <span className={dk('text-slate-200', 'text-slate-800')}>₹{selected.totalAmount?.toLocaleString() || '0'}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Status:</span> <span className={badgeClasses(statusVariant(selected.latestOrderStatus))}>{selected.latestOrderStatus || 'Not provided'}</span></p>
                    <p><span className={`inline-block w-20 sm:w-24 font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Date:</span> <span className={dk('text-slate-200', 'text-slate-800')}>{formatDate(selected.latestOrderDate)}</span></p>
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Delivery Address</h4>
                  <div className="space-y-2 text-sm">
                    <p className={dk('text-slate-200', 'text-slate-800')}>{selected.address || selected.latestDeliveryAddress || 'Not provided'}</p>
                  </div>
                </div>

                {(details?.orders?.length > 1) && (
                  <div>
                    <h4 className={`text-xs font-bold tracking-wider uppercase mb-3 pb-2 border-b ${dk('border-slate-800 text-slate-500', 'border-slate-100 text-slate-400')}`}>Recent Orders</h4>
                    <div className={`overflow-hidden rounded-lg border ${dk('border-slate-700 bg-slate-800/50', 'border-slate-200 bg-slate-50')}`}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={`border-b ${dk('border-slate-700', 'border-slate-200')}`}>
                            <th className="px-3 py-2 text-left font-semibold">Order</th>
                            <th className="px-3 py-2 text-left font-semibold">Product</th>
                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                            <th className="px-3 py-2 text-left font-semibold">Amount</th>
                            <th className="px-3 py-2 text-left font-semibold">Placed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsLoading ? (
                            Array.from({ length: 3 }).map((_, index) => (
                              <tr key={index} className={`border-b ${dk('border-slate-700', 'border-slate-200')}`}>
                                <td colSpan="5" className="px-3 py-2">
                                  <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                                </td>
                              </tr>
                            ))
                          ) : (
                            details?.orders?.map((order) => (
                              <tr key={order._id} className={`border-b transition ${dk('border-slate-700 hover:bg-slate-700/50', 'border-slate-200 hover:bg-slate-100')}`}>
                                <td className="px-3 py-2 font-mono font-semibold text-green-600">{order._id.slice(-8)}</td>
                                <td className={`px-3 py-2 ${dk('text-slate-300', 'text-slate-600')}`}>{order.itemId?.itemName || 'Eco product'}</td>
                                <td className="px-3 py-2">
                                  <span className={badgeClasses(statusVariant(order.deliveryStatus))}>{order.deliveryStatus || '—'}</span>
                                </td>
                                <td className={`px-3 py-2 font-medium ${dk('text-slate-200', 'text-slate-800')}`}>₹{order.finalAmount?.toLocaleString() || '0'}</td>
                                <td className={`px-3 py-2 ${dk('text-slate-400', 'text-slate-500')}`}>{formatDate(order.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

export default EcoProductBuyers;
