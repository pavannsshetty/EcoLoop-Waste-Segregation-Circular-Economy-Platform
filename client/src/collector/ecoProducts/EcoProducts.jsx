import { useEffect, useState, useCallback } from 'react';
import { HiSearch, HiX, HiEye, HiRefresh, HiTag, HiCube, HiStar } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import { useSocket } from '../../shared/context/SocketContext';

const CATEGORIES = [
  'All', 'Electronics', 'Books', 'Plastic Items', 'Furniture',
  'Metal Scrap', 'Paper Waste', 'Clothes', 'Toys',
  'Appliances', 'Other Recyclable Items',
];

const EcoProducts = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const token = localStorage.getItem('token');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category !== 'All') params.set('category', category);
      const res = await fetch(`${API}/api/collector/eco-products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch {} finally { setLoading(false); }
  }, [search, category, token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchItems();
    socket.on('RECYCLE_ITEM_UPDATED', handler);
    return () => socket.off('RECYCLE_ITEM_UPDATED', handler);
  }, [socket, fetchItems]);

  const stockBadge = (item) => {
    if (item.status === 'Out of Stock' || item.stock <= 0)
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Out of Stock</span>;
    if (item.stock <= 5)
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">Low Stock</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">In Stock</span>;
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
        <ProductDetailModal item={selected} dark={dark} dk={dk} onClose={() => setSelected(null)} />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Eco Products</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>View available eco-friendly products</p>
        </div>
        <button type="button" onClick={fetchItems}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')} aria-label="Refresh">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
          <input type="text" placeholder="Search products..." value={search}
            onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9`} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <HiX className={`h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
            </button>
          )}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectCls} sm:w-48`}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No products found.</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item._id}
              className={`rounded-lg border p-4 space-y-3 shadow-sm transition cursor-pointer ${
                dk('bg-white/5 border-gray-700 hover:bg-white/[0.07] hover:border-green-700', 'bg-white border-slate-100 hover:shadow-md hover:border-green-300')
              }`}
              onClick={() => setSelected(item)}>
              {item.image && (
                <div className="w-full h-44 rounded-lg overflow-hidden bg-white p-2 flex items-center justify-center">
                  <img src={item.image} alt={item.itemName} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{item.itemName}</p>
                  {stockBadge(item)}
                </div>
                <p className={`text-[11px] leading-relaxed line-clamp-2 flex-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                  {item.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg mr-1 ${dk('bg-purple-900/40 text-purple-400', 'bg-purple-100 text-purple-700')}`}>{item.category}</span>}
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${dk('text-green-400', 'text-green-600')}`}>₹{item.price}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiCube className="h-3 w-3" /> {item.stock}
                    </span>
                    <span className={`flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiStar className="h-3 w-3" /> {item.requests || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductDetailModal = ({ item, dark, dk, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden ${dk('bg-gray-900 border-gray-700', 'bg-white border-slate-200')}`}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-inherit">
        <h2 className={`text-sm font-bold ${dk('text-slate-200', 'text-slate-800')}`}>Product Details</h2>
        <button onClick={onClose} className={dk('text-slate-500 hover:text-slate-300', 'text-slate-400 hover:text-slate-600')}>
          <HiX className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {item.image && (
          <div className="w-full h-36 rounded-lg overflow-hidden bg-white p-3 flex items-center justify-center">
            <img src={item.image} alt={item.itemName} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-base font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{item.itemName}</p>
              {item.category && (
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1 ${dk('bg-purple-900/40 text-purple-400', 'bg-purple-100 text-purple-700')}`}>
                  {item.category}
                </span>
              )}
            </div>
          </div>
          {item.description && (
            <p className={`text-sm leading-relaxed ${dk('text-slate-400', 'text-slate-600')}`}>{item.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>Price</p>
              <p className={`text-lg font-bold mt-0.5 ${dk('text-green-400', 'text-green-600')}`}>₹{item.price}</p>
            </div>
            <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>Available Stock</p>
              <p className={`text-lg font-bold mt-0.5 ${dk('text-slate-200', 'text-slate-800')}`}>{item.stock}</p>
            </div>
            <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>Total Purchases</p>
              <p className={`text-lg font-bold mt-0.5 ${dk('text-slate-200', 'text-slate-800')}`}>{item.requests || 0}</p>
            </div>
            <div className={`rounded-lg p-3 ${dk('bg-white/5', 'bg-slate-50')}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-500', 'text-slate-400')}`}>Status</p>
              <p className={`text-lg font-bold mt-0.5 ${dk('text-slate-200', 'text-slate-800')}`}>{item.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default EcoProducts;
