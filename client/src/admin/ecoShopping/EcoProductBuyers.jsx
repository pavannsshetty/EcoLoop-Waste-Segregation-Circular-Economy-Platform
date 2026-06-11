import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  HiSearch,
  HiOutlineLocationMarker,
  HiLocationMarker,
  HiX,
  HiUser,
  HiRefresh,
} from 'react-icons/hi';
import socket from '../../socket';
import { API } from '../../shared/constants';

const STATUS_STYLES = {
  Pending:        'bg-yellow-100 text-yellow-900',
  Assigned:       'bg-blue-100 text-blue-900',
  'Out for Delivery': 'bg-amber-100 text-amber-900',
  Delivered:      'bg-green-100 text-green-900',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'amount', label: 'Highest Spend' },
  { value: 'orders', label: 'Most Orders' },
  { value: 'name', label: 'Name A-Z' },
];

const token = () => localStorage.getItem('adminToken');

const EcoProductBuyers = () => {
  const { dark, toast } = useOutletContext();
  const dk = (d, l) => (dark ? d : l);

  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [buyerDetails, setBuyerDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (sortBy) params.set('sort', sortBy);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const fetchBuyers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/eco-shopping/buyers${buildQuery()}`, {
        headers: { Authorization: `Bearer ${token()}` },
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

  const fetchBuyerDetails = async (buyerId) => {
    if (!buyerId) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/eco-shopping/buyers/${buyerId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load buyer details.');
      setBuyerDetails(data);
    } catch (err) {
      toast?.error(err.message || 'Unable to load buyer details.');
      setBuyerDetails(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, [statusFilter, searchTerm, sortBy]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleRealtime = () => {
      fetchBuyers();
      if (selectedBuyer) fetchBuyerDetails(selectedBuyer._id);
    };
    socket.on('ECO_SHOPPING_ORDER_UPDATED', handleRealtime);
    return () => {
      socket.off('ECO_SHOPPING_ORDER_UPDATED', handleRealtime);
    };
  }, [selectedBuyer]);

  useEffect(() => {
    if (selectedBuyer) {
      fetchBuyerDetails(selectedBuyer._id);
    } else {
      setBuyerDetails(null);
    }
  }, [selectedBuyer]);

  const handleOpenDetail = (buyer) => {
    setSelectedBuyer(buyer);
  };

  const summaryText = () => {
    if (loading) return 'Loading buyers...';
    if (buyers.length === 0) return 'No eco product buyers found.';
    return `${buyers.length} buyer${buyers.length !== 1 ? 's' : ''} matched`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>Eco Product Buyers</h1>
          <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>View every citizen who has purchased recycled or eco-friendly products, and inspect their complete purchase history.</p>
        </div>
        <button
          type="button"
          onClick={fetchBuyers}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${dk('border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10', 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}`}>
          <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <HiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by citizen, email, phone, product or address"
            className={`w-full h-11 rounded-2xl border px-10 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-900')}`} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Order Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-700')}`}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`rounded-3xl border p-4 ${dk('border-white/10 bg-white/5', 'border-slate-200 bg-white')} flex flex-col gap-2 text-sm`}> 
        <div className={`text-xs uppercase tracking-[0.25em] text-slate-400`}>{summaryText()}</div>
        {buyers.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1 text-slate-700">Total orders: {buyers.reduce((sum, buyer) => sum + buyer.totalOrders, 0)}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1 text-slate-700">Total buyer spend: ₹{buyers.reduce((sum, buyer) => sum + buyer.totalAmount, 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {error && (
        <div className={`rounded-3xl border p-5 ${dk('border-red-700/30 bg-red-900/20 text-red-100', 'border-red-200 bg-red-50 text-red-700')}`}>{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className={`sticky top-0 z-10 bg-white/90 backdrop-blur-sm ${dk('bg-slate-900/95', 'bg-white')}`}>
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-500">Citizen</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Contact</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Address</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Last Product</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Qty</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Order Date</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Order Status</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Payment</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Total</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Delivery Address</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${dk('divide-slate-800', 'divide-slate-200')}`}>
            {loading ? (
              <tr>
                <td colSpan="11" className="px-4 py-12 text-center text-slate-500">Loading buyers...</td>
              </tr>
            ) : buyers.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-12 text-center text-slate-500">No eco product buyers found matching this filter.</td>
              </tr>
            ) : (
              buyers.map((buyer) => (
                <tr key={buyer._id} className={`hover:bg-slate-50/80 ${dk('hover:bg-white/5', 'hover:bg-slate-50')}`}>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center text-sm font-semibold overflow-hidden">
                        {buyer.profilePhoto ? (
                          <img src={buyer.profilePhoto} alt={buyer.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{buyer.name?.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold ${dk('text-white', 'text-slate-900')}`}>{buyer.name}</div>
                        <div className="text-xs text-slate-500">{buyer.totalOrders} order{buyer.totalOrders !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="space-y-1 text-xs">
                      <div className={`font-semibold ${dk('text-slate-100', 'text-slate-800')}`}>{buyer.email || '—'}</div>
                      <div className="text-slate-500">{buyer.phone || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top max-w-[220px]">
                    <div className="text-xs leading-5 text-slate-500 line-clamp-2">{buyer.address || 'Not provided'}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">{buyer.latestProductName}</div>
                  </td>
                  <td className="px-4 py-4 align-top">{buyer.latestQuantity || 1}</td>
                  <td className="px-4 py-4 align-top text-sm text-slate-500">{new Date(buyer.latestOrderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[buyer.latestOrderStatus] || 'bg-slate-100 text-slate-700'}`}>{buyer.latestOrderStatus}</span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm">{buyer.latestPaymentStatus}</td>
                  <td className="px-4 py-4 align-top font-semibold">₹{buyer.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-4 align-top max-w-[220px] text-xs text-slate-500 line-clamp-2">{buyer.latestDeliveryAddress || 'Not set'}</td>
                  <td className="px-4 py-4 align-top">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(buyer)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${dk('border-white/10 bg-white/5 text-white hover:bg-white/10', 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}`}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedBuyer && buyerDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-6 sm:px-6">
          <div className={`mx-auto w-full max-w-6xl rounded-3xl border shadow-2xl ${dk('bg-slate-950 border-slate-800', 'bg-white border-slate-200')} overflow-hidden`}> 
            <div className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${dk('border-slate-800', 'border-slate-200')}`}>
              <div>
                <h2 className={`text-lg font-semibold ${dk('text-white', 'text-slate-900')}`}>Buyer Profile</h2>
                <p className="text-sm text-slate-400">Complete purchase history for {buyerDetails.user.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedBuyer(null)} className="rounded-full border border-slate-300 bg-white/90 p-2 text-slate-600 hover:bg-slate-100">
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className={`grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)] ${dk('bg-slate-950', 'bg-white')} `}>
              <div className={`rounded-3xl border p-5 ${dk('border-slate-800', 'border-slate-200')}`}>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-green-500/10 text-green-700 flex items-center justify-center text-xl font-semibold overflow-hidden">
                    {buyerDetails.user.profilePhoto ? (
                      <img src={buyerDetails.user.profilePhoto} alt={buyerDetails.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{buyerDetails.user.name?.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${dk('text-white', 'text-slate-900')}`}>{buyerDetails.user.name}</div>
                    <div className="text-sm text-slate-400">Citizen profile</div>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <HiUser className="h-4 w-4" />
                    <span>{buyerDetails.user.email || 'Email missing'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineLocationMarker className="h-4 w-4" />
                    <span>{buyerDetails.user.phone || 'Phone missing'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiLocationMarker className="sr-only" />
                    <span>{buyerDetails.user.homeAddress || buyerDetails.user.currentLocation || 'Address not provided'}</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-3xl border p-5 ${dk('border-slate-800', 'border-slate-200')}`}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className={`rounded-3xl p-4 ${dk('bg-slate-900', 'bg-slate-50')}`}>
                    <p className="text-[11px] uppercase tracking-widest text-slate-400">Total Orders</p>
                    <div className="mt-2 text-2xl font-semibold text-white">{buyerDetails.orders.length}</div>
                  </div>
                  <div className={`rounded-3xl p-4 ${dk('bg-slate-900', 'bg-slate-50')}`}>
                    <p className="text-[11px] uppercase tracking-widest text-slate-400">Total Amount</p>
                    <div className="mt-2 text-2xl font-semibold text-white">₹{buyerDetails.orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toLocaleString()}</div>
                  </div>
                  <div className={`rounded-3xl p-4 ${dk('bg-slate-900', 'bg-slate-50')}`}>
                    <p className="text-[11px] uppercase tracking-widest text-slate-400">Last Order</p>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {buyerDetails.orders.length > 0
                        ? new Date(buyerDetails.orders[0].createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-5 pb-5 ${dk('bg-slate-950', 'bg-white')}`}>
              <div className={`overflow-x-auto rounded-3xl border bg-white/5 ${dk('border-slate-800', 'border-slate-200')}`}>
                <table className="min-w-full text-left text-sm">
                  <thead className={`bg-slate-900/95 ${dk('text-slate-400', 'text-slate-500')}`}>
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Delivery</th>
                      <th className="px-4 py-3 font-semibold">Placed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {detailLoading ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center text-slate-400">Loading orders…</td>
                      </tr>
                    ) : buyerDetails.orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center text-slate-400">No orders found for this buyer.</td>
                      </tr>
                    ) : (
                      buyerDetails.orders.map((order) => (
                        <tr key={order._id} className={`hover:bg-slate-800/50 ${dk('hover:bg-slate-900', 'hover:bg-slate-50')}`}>
                          <td className="px-4 py-3 font-medium text-slate-200">{order._id.slice(-8)}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-100">{order.itemId?.itemName || 'Eco product'}</div>
                            <div className="text-xs text-slate-400">{order.itemId?.category || 'Recycled item'}</div>
                          </td>
                          <td className="px-4 py-3">{order.quantity || 1}</td>
                          <td className="px-4 py-3">{order.paymentStatus}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[order.deliveryStatus] || 'bg-slate-100 text-slate-700'}`}>{order.deliveryStatus}</span>
                          </td>
                          <td className="px-4 py-3">₹{order.finalAmount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{order.deliveryAddress || 'Not provided'}</td>
                          <td className="px-4 py-3 text-slate-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcoProductBuyers;
