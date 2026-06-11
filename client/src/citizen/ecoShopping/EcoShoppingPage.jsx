import { useEffect, useState, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiSearch, HiX, HiStar, HiShoppingCart, HiEye,
  HiCheckCircle, HiExclamation, HiChevronDown,
  HiBookOpen, HiDesktopComputer, HiRefresh,
} from 'react-icons/hi';
import { 
  MdRecycling, MdChair, MdBuild, MdInsertDriveFile, 
  MdCheckroom, MdToys, MdHome, MdFolder, MdDevices 
} from 'react-icons/md';
import { API } from '../../shared/constants';
import socket from '../../socket';
import { useUser } from '../../shared/context/UserContext';
import Dropdown from '../../shared/components/Dropdown';

const API_BASE = `${API}/api/eco-shopping`;

const CATEGORIES = [
  'Electronics', 'Books', 'Plastic Items', 'Furniture',
  'Metal Scrap', 'Paper Waste', 'Clothes', 'Toys',
  'Appliances', 'Other Recyclable Items',
];

const CAT_ICONS = {
  'Electronics': <MdDevices />,
  'Books': <HiBookOpen />,
  'Plastic Items': <MdRecycling />,
  'Furniture': <MdChair />,
  'Metal Scrap': <MdBuild />,
  'Paper Waste': <MdInsertDriveFile />,
  'Clothes': <MdCheckroom />,
  'Toys': <MdToys />,
  'Appliances': <MdHome />,
  'Other Recyclable Items': <MdFolder />,
};

/* ── Item Detail Modal (Mobile-first) ── */
const DISCOUNT_RATE = 2; // 2 pts = ₹1
const ItemDetailModal = ({ item, dark, onClose, onBuy, buying, ecoPoints }) => {
  const [pointsToUse, setPointsToUse] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  if (!item) return null;
  const textPrimary = dark ? 'text-[#f3f4f6]' : 'text-slate-900';
  const textMuted   = dark ? 'text-[#8b95a7]' : 'text-slate-500';
  const available   = item.status === 'Available' && item.stock > 0;

  const maxMeaningfulPoints = Math.min(item.price * DISCOUNT_RATE, ecoPoints);
  const discount = Math.floor(pointsToUse / DISCOUNT_RATE);
  const finalPrice = Math.max(item.price - discount, 0);
  const canRedeem = pointsToUse > 0;

  const handlePointsChange = (val) => {
    const parsed = parseInt(val) || 0;
    setPointsToUse(Math.min(parsed, maxMeaningfulPoints));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm md:items-center md:justify-center">
      <div className={`w-full max-w-md md:max-w-2xl flex flex-col bg-white dark:bg-[#0f1320] border-t md:border ${dark ? 'border-white/10' : 'border-slate-200'} rounded-t-2xl md:rounded-2xl shadow-xl md:shadow-2xl md:max-h-[80vh] max-h-[95vh] overflow-hidden`}>
        {/* Header - non-scrolling */}
        <div className={`shrink-0 flex items-start gap-3 px-4 py-3 md:px-6 md:py-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{available ? 'Available' : 'Out of Stock'}</span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">{item.category}</span>
            </div>
            <h2 className={`mt-2 text-lg font-bold leading-tight ${textPrimary}`}>{item.itemName}</h2>
          </div>
          <button type="button" onClick={onClose} className={`ml-2 h-9 w-9 flex items-center justify-center rounded-full ${dark ? 'bg-slate-900/90 text-slate-100' : 'bg-white text-slate-600 shadow-sm'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Image - non-scrolling */}
        <div className="shrink-0 w-full px-4 md:px-6">
          <div className="w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            {item.image ? (
              <img src={item.image} alt={item.itemName} className="w-full max-h-[220px] object-contain" />
            ) : (
              <div className={`w-full h-[180px] flex items-center justify-center text-6xl ${dark ? 'bg-slate-900' : 'bg-slate-100 text-emerald-600'}`}>
                {CAT_ICONS[item.category] || <MdFolder />}
              </div>
            )}
          </div>
        </div>

        {/* Content - scrollable, flex-grow */}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4">
          {/* Price + Stock Row (compact) */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase text-slate-400 tracking-wider">Price</p>
              <p className="text-xl font-bold text-emerald-600">₹{item.price} <span className="text-sm font-medium text-slate-400">per {item.stockType === 'Set' ? 'set' : 'item'}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase text-slate-400 tracking-wider">Stock</p>
              <p className={`text-lg font-bold ${item.stock === 0 ? 'text-rose-500' : textPrimary}`}>{item.stock} <span className="text-sm font-medium text-slate-400">{item.stockType === 'Set' ? 'sets' : 'units'}</span></p>
            </div>
          </div>

          {/* Compact meta: views & purchases */}
          <div className="flex items-center gap-3 mb-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border"> 
              <HiEye className="h-4 w-4 text-slate-400" />
              <span className="font-semibold">{item.views || 0} views</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border">
              <HiShoppingCart className="h-4 w-4 text-slate-400" />
              <span className="font-semibold">{item.requests || 0} purchases</span>
            </div>
          </div>

          {/* Description (collapsed) */}
          {item.description && (
            <div className="mb-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Description</p>
              <p className={`${dark ? 'text-slate-300' : 'text-slate-700'} text-sm leading-6 ${descExpanded ? '' : 'line-clamp-3'}`}>{item.description}</p>
              <button type="button" onClick={() => setDescExpanded(v => !v)} className="mt-2 text-sm font-semibold text-green-600">
                {descExpanded ? 'View Less' : 'View More'}
              </button>
            </div>
          )}

          {/* EcoPoints section */}
          {available && (
            <div className={`mb-3 rounded-lg border ${dark ? 'bg-[#0e141a] border-white/6' : 'bg-green-50 border-green-100'}`}>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Your Eco Points</p>
                    <p className="text-lg font-bold text-emerald-700">{ecoPoints} pts</p>
                  </div>
                  <div className="text-right px-2.5 py-1 rounded-lg bg-white/60 dark:bg-white/5">
                    <p className="text-[11px] font-semibold text-emerald-600">{DISCOUNT_RATE} pts = ₹1</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Use Eco Points</p>
                  <input
                    type="number"
                    placeholder="Enter points to redeem"
                    min="0"
                    max={maxMeaningfulPoints}
                    value={pointsToUse || ''}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    className={`w-full h-10 rounded-xl border px-3 text-sm font-medium outline-none ${dark ? 'bg-[#0d111a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                  {pointsToUse > maxMeaningfulPoints && (
                    <p className="text-xs text-rose-500 mt-1">Max {maxMeaningfulPoints} pts can be used for this item.</p>
                  )}
                  {pointsToUse > 0 && pointsToUse % DISCOUNT_RATE !== 0 && (
                    <p className="text-xs text-amber-500 mt-1">Only multiples of {DISCOUNT_RATE} pts give a discount.</p>
                  )}
                </div>
              </div>

              {/* Pricing breakdown */}
              {canRedeem && (
                <div className={`mx-3 mb-3 p-3 rounded-lg border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-green-200'}`}>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Pricing Breakdown</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>Original Price</span>
                      <span className={`font-semibold ${textPrimary}`}>₹{item.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>
                        Eco Discount <span className="text-[10px]">({pointsToUse} pts)</span>
                      </span>
                      <span className="font-semibold text-emerald-600">- ₹{discount}</span>
                    </div>
                    <div className={`border-t my-1 ${dark ? 'border-white/10' : 'border-slate-200'}`} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Final Price</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {finalPrice === 0 ? 'FREE' : `₹${finalPrice}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase summary before buy */}
              {canRedeem && (
                <div className={`mx-3 mb-3 px-3 py-2 rounded-lg flex items-center justify-between text-xs ${dark ? 'bg-emerald-900/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                  <span className="font-medium">
                    <HiCheckCircle className="h-3.5 w-3.5 inline mr-1" />
                    You save ₹{discount} with {pointsToUse} pts
                  </span>
                  <span className="font-bold text-sm">₹{finalPrice} payable</span>
                </div>
              )}
            </div>
          )}

          {/* Out of stock note */}
          {!available && (
            <div className={`mb-3 p-3 rounded-lg border ${dark ? 'bg-red-950/40 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <p className="text-sm font-semibold">This item is currently unavailable or out of stock.</p>
              <p className="text-xs text-slate-500 mt-2">Please check back later for availability.</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className={`shrink-0 sticky bottom-0 px-4 py-3 md:py-2 md:px-6 bg-white dark:bg-[#0f1320] border-t ${dark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={`h-11 md:h-9 px-4 rounded-lg border text-sm font-semibold ${dark ? 'border-white/10 text-[#b6bec9]' : 'border-slate-200 text-slate-500'} md:text-sm`}>Close</button>
            <button
              type="button"
              disabled={!available || buying}
              onClick={() => onBuy(item._id, pointsToUse)}
              className="h-11 md:h-9 inline-flex items-center justify-center gap-2 md:gap-1 px-4 md:px-3 rounded-lg bg-green-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              <HiShoppingCart className="h-4 w-4 md:h-4 md:w-4" />
              {buying ? 'Processing...' : (finalPrice === 0 ? 'Get for Free' : `Buy ₹${finalPrice}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Item Card ── */
const ItemCard = ({ item, dark, onClick }) => {
  const available = item.status === 'Available' && item.stock > 0;
  const textPrimary = dark ? 'text-[#f3f4f6]' : 'text-slate-900';
  const textMuted   = dark ? 'text-[#8b95a7]' : 'text-slate-500';

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-2 sm:p-4 flex flex-col w-full ${
        dark ? 'bg-[#11151c] border-white/10 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden w-full h-32 sm:h-48 mb-2 sm:mb-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
        {item.image
          ? <img src={item.image} alt={item.itemName} className="w-full h-full object-contain mx-auto transition-transform duration-500 group-hover:scale-105" />
          : <div className={`w-full h-full flex items-center justify-center text-6xl transition-transform duration-500 group-hover:scale-110 text-green-500`}>
              {CAT_ICONS[item.category] || <MdFolder />}
            </div>
        }
        {/* Overlay badges */}
        <div className="absolute top-3 right-3">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-sm ${available ? 'bg-white/90 text-green-600' : 'bg-red-500/90 text-white'}`}>
            {available ? 'Available' : 'Out'}
          </span>
        </div>
        {/* View icon overlay on hover */}
        <div className="absolute inset-x-1 inset-y-1 rounded-lg bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-lg p-2.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <HiEye className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${textMuted} mb-1.5 flex items-center gap-1.5`}>
          <span className="text-green-500">{CAT_ICONS[item.category]}</span> {item.category}
        </p>
        <p className={`text-sm sm:text-base font-semibold tracking-tight line-clamp-2 mb-1.5 leading-snug ${textPrimary}`}>{item.itemName}</p>
        {item.description && <p className={`text-[11px] sm:text-xs font-medium leading-relaxed line-clamp-2 mb-3 ${textMuted}`}>{item.description}</p>}
        
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-green-600 text-lg font-bold tracking-tight leading-none">₹{item.price}</p>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${item.stockType === 'Set' ? 'text-green-500' : 'text-blue-500'}`}>per {item.stockType}</p>
          </div>
          <div className={`text-right px-2.5 py-1 rounded-lg border ${dark ? 'bg-[#171b22] border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-xs font-bold ${textPrimary}`}>{item.stock} <span className="opacity-70 font-medium">{item.stockType === 'Set' ? 'Sets' : 'Its'}</span></p>
            {item.stockType === 'Set' && <p className={`text-[9px] font-bold uppercase ${textMuted}`}>({item.itemsPerSet}/set)</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*   MAIN PAGE                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
const EcoShoppingPage = () => {
  const navigate = useNavigate();
  const { dark, toast } = useOutletContext() || {};
  const { user: ctxUser, updateUser } = useUser();
  const dk = (d, l) => (dark ? d : l);

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [categories, setCategories] = useState(CATEGORIES);
  const [selected,   setSelected]   = useState(null);
  const [modalPoints, setModalPoints] = useState(null);

  const ecoPoints = modalPoints ?? ctxUser?.rewards?.points ?? ctxUser?.ecoPoints ?? 0;

  const selectedRef  = useRef(selected);
  const ctxUserRef   = useRef(ctxUser);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { ctxUserRef.current = ctxUser; }, [ctxUser]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(['all', ...data.categories.filter(c => c && c.trim())]);
      }
    } catch (err) {
      console.warn('Failed to load eco shopping categories:', err);
    }
  };

  const handleSelectItem = async (item) => {
    const pts = await fetchEcoPoints();
    console.log('[EcoShop] handleSelectItem: pts from fetchEcoPoints:', pts, 'modalPoints after set:', pts);
    setModalPoints(pts);
    setSelected(item);
    try {
      const res = await fetch(`${API_BASE}/${item._id}`);
      const freshItem = await res.json();
      if (res.ok) setSelected(freshItem);

      // Trigger unique view tracking if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE}/${item._id}/view`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to fetch item details:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchEcoPoints();
  }, []);

  const [buying,    setBuying]    = useState(false);
  const [sortBy,    setSortBy]    = useState('newest');

  const fetchEcoPoints = async () => {
    const token = localStorage.getItem('token');
    if (!token) return ctxUser?.rewards?.points ?? ctxUser?.ecoPoints ?? 0;
    try {
      const res = await fetch(`${API}/api/citizen/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const pts = data.rewards?.points ?? data.ecoPoints ?? 0;
        console.log('[EcoShop] fetchEcoPoints got pts:', pts, '| rewards:', data.rewards, '| ecoPoints:', data.ecoPoints);
        if (updateUser) updateUser({ ecoPoints: pts, rewards: data.rewards || { points: pts } });
        return pts;
      }
      console.log('[EcoShop] fetchEcoPoints res not ok:', res.status);
    } catch (e) {
      console.log('[EcoShop] fetchEcoPoints error:', e);
    }
    console.log('[EcoShop] fetchEcoPoints fallback ctxUser:', { rewardsPts: ctxUser?.rewards?.points, ecoPoints: ctxUser?.ecoPoints });
    return ctxUser?.rewards?.points ?? ctxUser?.ecoPoints ?? 0;
  };

  const fetchItems = async (cat = catFilter, q = search, sort = sortBy) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'Available', limit: 60 });
      if (cat !== 'all') params.set('category', cat);
      if (q) params.set('search', q);
      params.set('sort', sort);
      const res  = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) { setItems([]); return; }
      const data = await res.json();
      setItems(data.items || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchItems();

    const handleEcoPointsUpdated = (data) => {
      const userId = localStorage.getItem('userId') || '';
      const currentCtxUser = ctxUserRef.current;
      if (data.userId === userId || data.userId === currentCtxUser?._id) {
        const pts = data.rewardsPoints ?? data.ecoPoints ?? 0;
        if (updateUser) updateUser({ ecoPoints: pts, rewards: { ...(currentCtxUser?.rewards || {}), points: pts } });
      }
    };

    const handlePointsUpdated = (data) => {
      if (data.points !== undefined) {
        if (updateUser) updateUser({ ecoPoints: data.points, rewards: { ...(ctxUserRef.current?.rewards || {}), points: data.points } });
      }
    };

    const handleRecycleItemUpdated = (data) => {
      if (data.action === 'DELETE') {
        setItems(prev => prev.filter(i => i._id !== data.itemId));
        if (selectedRef.current?._id === data.itemId) setSelected(null);
      } else {
        const updatedItem = data.item;
        setItems(prev => {
          const exists = prev.some(i => i._id === updatedItem._id);
          if (exists) return prev.map(i => i._id === updatedItem._id ? updatedItem : i);
          if (updatedItem.status === 'Available' && updatedItem.stock > 0) return [updatedItem, ...prev];
          return prev;
        });
        setSelected(prev => {
          if (prev?._id === updatedItem._id) {
            return { ...updatedItem };
          }
          return prev;
        });
      }
    };

    socket.on('eco_points_updated', handleEcoPointsUpdated);
    socket.on('points_updated', handlePointsUpdated);
    socket.on('RECYCLE_ITEM_UPDATED', handleRecycleItemUpdated);

    return () => {
      socket.off('eco_points_updated', handleEcoPointsUpdated);
      socket.off('points_updated', handlePointsUpdated);
      socket.off('RECYCLE_ITEM_UPDATED', handleRecycleItemUpdated);
    };
  }, []);

  useEffect(() => { fetchItems(); }, [catFilter, search, sortBy]);

  const handleBuy = async (itemId, pointsToUse = 0) => {
    const token = localStorage.getItem('token');
    if (!token) { toast?.error('Please log in to buy items.'); return; }
    setBuying(true);
    try {
      const res  = await fetch(`${API_BASE}/${itemId}/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ pointsToUse })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 && data.message === 'User not found') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          toast?.error('Session expired. Please log in again.');
          setTimeout(() => navigate('/'), 1500);
          return;
        }
        toast?.error(data.message || 'Purchase failed.'); return;
      }
      const data = await res.json();
      toast?.success(data.message || 'Item purchased successfully!');
      if (data.ecoPoints !== undefined) {
        const pts = data.ecoPoints;
        setModalPoints(pts);
        if (updateUser) updateUser({ ecoPoints: pts, rewards: { ...(ctxUser?.rewards || {}), points: data.rewardsPoints ?? pts } });
      }
      setSelected(null);
      fetchItems();
      } catch { toast?.error('Network error. Please try again.'); } finally { setBuying(false); }
    };

  return (
    <div className="flex-1 animate-in fade-in duration-500 px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6">
      <div className="w-full space-y-8">
        {selected && (
          <ItemDetailModal
            item={selected} dark={dark}
            onClose={() => { setSelected(null); setModalPoints(null); }}
            onBuy={handleBuy}
            buying={buying}
            ecoPoints={ecoPoints}
          />
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>Eco Shopping</h1>
            <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Sustainable products from recycled materials</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/citizen/my-orders')}
            className="h-10 rounded-xl border border-green-500 bg-green-500/10 px-4 text-sm font-semibold text-green-700 transition hover:bg-green-500/20"
          >
            View My Orders
          </button>
        </div>

        {/* Search & Filter (compact) */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, categories or keywords..."
              className={`w-full h-11 pl-11 pr-4 rounded-2xl border text-sm outline-none transition ${dk('bg-[#11151c] border-white/10 text-white', 'bg-white border-gray-200 text-slate-900')}`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`h-10 rounded-full px-4 text-xs font-semibold transition ${catFilter === cat ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-[#11151c] dark:border-white/10 dark:text-slate-200 dark:hover:bg-[#1e2634]'}`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 rounded-lg border-4 border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center rounded-lg border-2 border-dashed overflow-hidden">
              <h2 className="text-lg font-bold">No items found</h2>
              <p className="text-sm text-slate-500">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {items.map(item => (
                <ItemCard key={item._id} item={item} dark={dark} onClick={() => handleSelectItem(item)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

};

export default EcoShoppingPage;
