import { useEffect, useState } from 'react';
import {
  HiSearch, HiX, HiStar, HiShoppingCart, HiEye,
  HiCheckCircle, HiExclamation, HiChevronDown,
  HiBookOpen, HiDesktopComputer, HiRefresh,
} from 'react-icons/hi';
import { 
  MdRecycling, MdChair, MdBuild, MdInsertDriveFile, 
  MdCheckroom, MdToys, MdHome, MdFolder, MdDevices 
} from 'react-icons/md';
import { useOutletContext } from 'react-router-dom';
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

/* ── Item Detail Modal ── */
const ItemDetailModal = ({ item, dark, onClose, onBuy, buying, ctxUser }) => {
  const [pointsToUse, setPointsToUse] = useState(0);
  if (!item) return null;
  const textPrimary = dark ? 'text-[#f3f4f6]' : 'text-slate-900';
  const textMuted   = dark ? 'text-[#8b95a7]' : 'text-slate-500';
  const available   = item.status === 'Available' && item.stock > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative w-full max-w-xl rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border ${dark ? 'bg-[#11151c] border-white/10' : 'bg-white border-black/5'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 z-20 h-8 w-8 flex items-center justify-center rounded-full transition-all ${dark ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm'}`}>
          <HiX className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto flex-1 [scrollbar-width:none]">
          {/* Image */}
          <div className="relative p-2 pb-0">
              {item.image
              ? <img src={item.image} alt={item.itemName} className="w-full h-52 sm:h-60 object-contain rounded-xl bg-slate-50 dark:bg-slate-800/50" />
              : <div className={`w-full h-52 sm:h-60 flex items-center justify-center text-7xl rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50 text-green-500'}`}>
                  {CAT_ICONS[item.category] || <MdFolder />}
                </div>
              }
          </div>

          <div className="p-5 sm:px-6 py-4 space-y-4">
            {/* Top Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg ${available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {available ? '● Available' : '● Out of Stock'}
                </span>
              </div>
              
              <div>
                <h2 className={`text-xl sm:text-2xl font-semibold tracking-tight ${textPrimary}`}>{item.itemName}</h2>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 ${textMuted}`}>
                  <span className="text-green-500">{CAT_ICONS[item.category]}</span> {item.category}
                </p>
              </div>
            </div>

            {/* Price & Stock */}
            <div className={`flex items-center justify-between rounded-xl px-5 py-4 border ${dark ? 'bg-[#171b22] border-white/10 shadow-inner' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Price</p>
                <p className="text-2xl font-bold text-green-600 tracking-tight">₹{item.price}</p>
                <p className={`text-[10px] uppercase tracking-widest font-bold ${item.stockType === 'Set' ? 'text-green-500' : 'text-blue-500'}`}>per {item.stockType === 'Set' ? 'Set' : 'Item'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 mt-0">Stock</p>
                <p className={`text-xl font-bold ${item.stock === 0 ? 'text-red-500' : textPrimary}`}>{item.stock} <span className="text-sm font-medium opacity-70">{item.stockType === 'Set' ? (item.stock === 1 ? 'Set' : 'Sets') : 'Units'}</span></p>
                {item.stockType === 'Set' && (
                  <p className={`text-[10px] font-medium ${textMuted}`}>({item.itemsPerSet} items/set)</p>
                )}
                {item.stock > 0 && item.stock <= 5 && (
                  <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded">Only {item.stock} left!</p>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Description</p>
                <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className={`flex items-center gap-4 flex-wrap text-[11px] font-medium mt-5 ${textMuted}`}>
              <span className="flex items-center gap-1.5"><HiEye className="w-4 h-4 text-slate-400" /> {item.views || 0} views</span>
              <span className="flex items-center gap-1.5"><HiShoppingCart className="w-4 h-4 text-slate-400" /> {item.requests || 0} purchases</span>
              <span className="flex items-center gap-1.5"><HiBookOpen className="w-4 h-4 text-slate-400" /> {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>

            {!available && (
              <div className={`flex gap-3 rounded-xl border p-4 mt-5 ${dark ? 'bg-red-950/40 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <HiExclamation className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">This item is currently unavailable or out of stock. Check back later!</p>
              </div>
            )}

            {/* Eco Points Redemption */}
            {available && (
              <div className={`rounded-xl border p-4 sm:p-5 space-y-4 mt-5 ${dark ? 'bg-slate-800/50 border-white/10' : 'bg-green-100/50 border-green-200'}`}>
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Eco Points</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-green-700 bg-green-200/50 px-2.5 py-1 rounded-md">{ctxUser?.rewards?.points || 0} pts</p>
                 </div>
                 
                 <div className="space-y-1.5">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Use Points (2 pts = ₹1)</p>
                   <input 
                     type="number" 
                     placeholder="Points to use"
                     min="0"
                     max={Math.min(ctxUser?.rewards?.points || 0, item.price * 2)}
                     value={pointsToUse || ''}
                     onChange={(e) => setPointsToUse(Math.min(parseInt(e.target.value) || 0, ctxUser?.rewards?.points || 0, item.price * 2))}
                     className={`w-full h-11 px-4 text-sm font-medium rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all ${dark ? 'bg-[#11151c] border border-white/10 text-white' : 'bg-white border border-black/5 text-slate-900 shadow-sm'}`}
                   />
                 </div>

                 <div className="pt-3 border-t border-green-200/50 flex flex-col gap-1.5">
                   <div className="flex justify-between items-center text-sm font-medium text-green-700">
                     <span>Discount:</span>
                     <span>-₹{pointsToUse / 2}</span>
                   </div>
                   <div className="flex justify-between items-center text-lg font-bold text-green-800 dark:text-green-400">
                     <span>Final Price:</span>
                     <span>₹{Math.max(0, item.price - (pointsToUse / 2))}</span>
                   </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className={`sticky bottom-0 p-4 sm:p-5 bg-white dark:bg-[#11151c] border-t ${dark ? 'border-white/10' : 'border-slate-100'} flex gap-3 z-10 rounded-b-sm`}>
          <button type="button" onClick={onClose}
            className={`flex-1 h-11 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${dark ? 'border-white/10 text-[#b6bec9] hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            Close
          </button>
          <button
            type="button"
            disabled={!available || buying}
            onClick={() => onBuy(item._id, pointsToUse)}
            className="flex-[2] h-11 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-xs font-bold uppercase tracking-widest text-white hover:bg-green-700 transition-all disabled:opacity-50"
          >
            <HiShoppingCart className="h-5 w-5" />
            {buying ? 'Processing...' : (pointsToUse >= item.price * 2 ? 'Get with Points' : 'Buy Now')}
          </button>
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
      className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-2 sm:p-4 flex flex-col w-full ${
        dark ? 'bg-[#11151c] border-white/10 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden w-full h-32 sm:h-48 mb-2 sm:mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
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
        <div className="absolute inset-x-1 inset-y-1 rounded-xl bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-xl p-2.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <HiEye className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted} mb-1.5 flex items-center gap-1.5`}>
          <span className="text-green-500">{CAT_ICONS[item.category]}</span> {item.category}
        </p>
        <p className={`text-base font-semibold tracking-tight line-clamp-2 mb-1.5 leading-snug ${textPrimary}`}>{item.itemName}</p>
        {item.description && <p className={`text-xs font-medium leading-relaxed line-clamp-2 mb-3 ${textMuted}`}>{item.description}</p>}
        
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
  const { dark, toast } = useOutletContext() || {};
  const { user: ctxUser } = useUser();
  const dk = (d, l) => (dark ? d : l);

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [selected,  setSelected]  = useState(null);
  const handleSelectItem = async (item) => {
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

  const [buying,    setBuying]    = useState(false);
  const [sortBy,    setSortBy]    = useState('newest');

  const fetchItems = async (cat = catFilter, q = search, sort = sortBy) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'Available', limit: 60 });
      if (cat !== 'all') params.set('category', cat);
      if (q) params.set('search', q);
      params.set('sort', sort);
      const res  = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchItems();
    socket.on('RECYCLE_ITEM_UPDATED', (data) => {
      if (data.action === 'DELETE') {
        setItems(prev => prev.filter(i => i._id !== data.itemId));
        if (selected?._id === data.itemId) setSelected(null);
      } else {
        const updatedItem = data.item;
        setItems(prev => {
          const exists = prev.some(i => i._id === updatedItem._id);
          if (exists) return prev.map(i => i._id === updatedItem._id ? updatedItem : i);
          if (updatedItem.status === 'Available' && updatedItem.stock > 0) return [updatedItem, ...prev];
          return prev;
        });
        
        // Update selected item if it's the one being modified (to reflect views, stock changes, etc)
        setSelected(prev => {
          if (prev?._id === updatedItem._id) {
            // Keep pointsToUse state intact if the user is typing
            return { ...updatedItem };
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off('RECYCLE_ITEM_UPDATED');
    };
  }, [selected]);

  useEffect(() => { fetchItems(); }, [catFilter, search, sortBy]);

  const handleBuy = async (itemId, pointsToUse = 0) => {
    const token = localStorage.getItem('token');
    if (!token) { toast?.error('Please log in to buy items.'); return; }
    setBuying(true);
    try {
      const res  = await fetch(`${itemId}/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ pointsToUse })
      });
      const data = await res.json();
      if (!res.ok) { toast?.error(data.message || 'Purchase failed.'); return; }
      toast?.success(data.message || 'Item purchased successfully!');
      setSelected(null);
    } catch { toast?.error('Network error. Please try again.'); }
    finally { setBuying(false); }
  };

  return (
    <div className="flex-1 animate-in fade-in duration-500 px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6">
      <div className="w-full space-y-8">
        {selected && (
          <ItemDetailModal
            item={selected} dark={dark}
            onClose={() => setSelected(null)}
            onBuy={handleBuy}
            buying={buying}
            ctxUser={ctxUser}
          />
        )}

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>Eco Shopping</h1>
            <p className={`text-sm font-medium mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Sustainable products from recycled materials</p>
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full">
            {/* Search */}
            <div className="relative w-full lg:w-72 shrink-0">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full h-11 pl-11 pr-4 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-green-500 ${dk('bg-[#11151c] border-white/10 text-white focus:bg-[#1c212a]', 'bg-white border-gray-200 text-slate-900 shadow-sm')}`}
              />
            </div>

            {/* Categories */}
            <div className="flex-1 w-full flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => { setCatFilter('all'); setSearch(''); }}
                className={`h-11 px-5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center border ${
                  catFilter === 'all'
                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                    : dk('bg-[#171b22] text-slate-400 border-white/5 hover:bg-white/5', 'bg-white text-slate-600 border-gray-200 hover:border-gray-300')
                }`}
              >All</button>
              <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />
              {CATEGORIES.slice(0, 5).map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`h-11 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-2 border ${
                    catFilter === c
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : dk('bg-[#171b22] text-slate-400 border-white/5 hover:bg-white/5', 'bg-white text-slate-600 border-gray-200 hover:border-gray-300')
                  }`}>
                  <span className={`shrink-0 ${catFilter === c ? 'text-white' : 'text-green-600'}`}>{CAT_ICONS[c]}</span>
                  {c}
                </button>
              ))}
              <Dropdown
                value={CATEGORIES.slice(5).includes(catFilter) ? catFilter : ''}
                onChange={e => e.target.value && setCatFilter(e.target.value)}
                className={`!h-11 !min-w-[130px] !rounded-xl border !text-xs font-bold ${dk('bg-[#171b22] border-white/5 text-slate-400', 'bg-white border-gray-200 text-slate-600')}`}
              >
                <option value="">More Items</option>
                {CATEGORIES.slice(5).map(c => <option key={c} value={c}>{c}</option>)}
              </Dropdown>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 w-full lg:w-auto self-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sort Results:</span>
            <Dropdown
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`!h-10 w-40 !rounded-lg border !text-xs font-bold ${dk('bg-[#171b22] border-white/5 text-white', 'bg-white border-gray-200 text-slate-800 shadow-sm')}`}
            >
              <option value="newest">Latest Added</option>
              <option value="price-low">Lowest Price</option>
              <option value="price-high">Highest Price</option>
            </Dropdown>
          </div>
        </div>

        {/* ── All / Filtered Items ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <h2 className={`text-lg font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>
                {catFilter === 'all' ? 'Recently Added' : catFilter}
              </h2>
              <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {items.length} {items.length === 1 ? 'Item' : 'Items'} Found
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 rounded-sm border-4 border-green-500 border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center rounded-sm border-2 border-dashed dark:border-white/5 dark:bg-white/2 overflow-hidden">
               <MdRecycling className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-white/10" />
               <h2 className={`text-lg font-bold ${dk('text-white', 'text-slate-800')}`}>No items found</h2>
               <p className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
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
