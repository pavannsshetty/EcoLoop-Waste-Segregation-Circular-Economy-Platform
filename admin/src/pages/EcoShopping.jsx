import { useEffect, useState, useRef } from 'react';
import { 
  HiPlus, HiMinus, HiPencil, HiTrash, HiEye, HiEyeOff,
  HiPhotograph, HiSearch, HiX, HiRefresh, HiChartBar,
  HiCube, HiExclamation, HiCheckCircle, HiShoppingCart,
  HiBookOpen,
} from 'react-icons/hi';
import { 
  MdRecycling, MdChair, MdBuild, MdInsertDriveFile, 
  MdCheckroom, MdToys, MdHome, MdFolder, MdDevices 
} from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';
import ModalOverlay from '../components/ModalOverlay';
import socket from '../socket';
import Dropdown from '../components/Dropdown';

const API_BASE = '/api/eco-shopping';
const ADMIN_TOKEN = () => localStorage.getItem('admin-token');

const CATEGORIES = [
  'Electronics', 'Books', 'Plastic Items', 'Furniture',
  'Metal Scrap', 'Paper Waste', 'Clothes', 'Toys',
  'Appliances', 'Other Recyclable Items',
];

const CAT_ICONS = {
  'Electronics': <MdDevices />,
  'Books': <HiBookOpen />,
  'Plastic Items': <HiRefresh />,
  'Furniture': <MdChair />,
  'Metal Scrap': <MdBuild />,
  'Paper Waste': <MdInsertDriveFile />,
  'Clothes': <MdCheckroom />,
  'Toys': <MdToys />,
  'Appliances': <MdHome />,
  'Other Recyclable Items': <MdFolder />,
};

/* ── Small helpers ── */
const Badge = ({ text, color }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${color}`}>
    {text}
  </span>
);

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-8 w-8 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
  </div>
);

/* ── Item Form Modal ── */
const ItemModal = ({ item, dark, onClose, onSaved }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    itemName: item?.itemName || '',
    category: item?.category || CATEGORIES[0],
    description: item?.description || '',
    price: item?.price ?? '',
    stock: item?.stock ?? '',
    stockType: item?.stockType || 'Single Quantity',
    itemsPerSet: item?.itemsPerSet ?? '',
    status: item?.status || 'Available',
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (file) => {
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.itemName.trim()) { setError('Item name is required.'); return; }
    if (form.price === '' || isNaN(Number(form.price))) { setError('Valid price is required.'); return; }
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0) { setError('Valid non-negative stock is required.'); return; }
    if (form.stockType === 'Set' && (!form.itemsPerSet || isNaN(Number(form.itemsPerSet)) || Number(form.itemsPerSet) <= 0)) {
      setError('Items per set is required for Set products.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const url    = isEdit ? `${API_BASE}/${item._id}` : API_BASE;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to save item.'); return; }
      onSaved(data.item);
    } catch {
      setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  const inp = `w-full rounded-lg border py-2.5 px-3.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
    dark ? 'bg-[#171b22] border-white/10 text-[#f3f4f6] placeholder-[#748094]' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const lbl = `block text-xs font-semibold mb-1 ${dark ? 'text-[#8b95a7]' : 'text-slate-700'}`;

  return (
        <ModalOverlay onClose={onClose} className="flex items-center justify-center p-2 sm:p-4">
      <div className={`w-full max-w-[95vw] sm:max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh] ${dark ? 'bg-[#11151c] border border-white/10' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <HiShoppingCart className="h-5 w-5 text-green-500" />
            <h2 className={`font-bold text-lg ${dark ? 'text-[#f3f4f6]' : 'text-slate-900'}`}>
              {isEdit ? 'Edit Item' : 'Add New Item'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={`p-1.5 rounded-lg transition ${dark ? 'text-[#8b95a7] hover:bg-[#1a2029]' : 'text-slate-400 hover:bg-slate-100'}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Image Upload */}
          <div>
            <label className={lbl}>Product Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition py-5 ${
                dark ? 'border-slate-600 hover:border-green-500 bg-slate-800/50' : 'border-slate-300 hover:border-green-500 bg-slate-50'
              }`}
            >
              {previewUrl
                ? <img src={previewUrl} alt="preview" className="h-28 w-auto rounded-lg object-cover" />
                : <>
                    <HiPhotograph className={`h-8 w-8 ${dark ? 'text-[#748094]' : 'text-slate-400'}`} />
                    <span className={`text-xs ${dark ? 'text-[#8b95a7]' : 'text-slate-500'}`}>Click to upload image</span>
                  </>
              }
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className={lbl}>Item Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.itemName} onChange={e => set('itemName', e.target.value)}
              placeholder="e.g. Old Laptop" className={inp} />
          </div>

          {/* Category */}
          <div>
            <label className={lbl}>Category <span className="text-red-500">*</span></label>
            <Dropdown value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Dropdown>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe the item condition, specifications..." className={`${inp} resize-none`} />
          </div>

          {/* Stock Type & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Stock Type</label>
              <Dropdown value={form.stockType} onChange={e => set('stockType', e.target.value)} className={inp}>
                <option value="Single Quantity">Single Quantity</option>
                <option value="Set">Set</option>
              </Dropdown>
            </div>
            <div>
              <label className={lbl}>{form.stockType === 'Set' ? 'Number of Sets' : 'Stock Quantity'} <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)}
                placeholder="0" className={inp} />
            </div>
          </div>

          {/* Conditional Items Per Set */}
          {form.stockType === 'Set' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className={lbl}>Items Per Set <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="number" min="1" value={form.itemsPerSet} onChange={e => set('itemsPerSet', e.target.value)}
                  placeholder="e.g. 50" className={inp} />
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${dark ? 'text-[#8b95a7]' : 'text-slate-400'}`}>
                  items/set
                </div>
              </div>
              <p className={`text-[10px] mt-1 ${dark ? 'text-[#8b95a7]' : 'text-slate-400'}`}>
                Example: 1 Set = {form.itemsPerSet || 'X'} Items (e.g. Paper Bags)
              </p>
            </div>
          )}

          {/* Price & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Price (₹) {form.stockType === 'Set' ? 'per Set' : 'per Item'} <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)}
                placeholder="0.00" className={inp} />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <Dropdown value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {Number(form.stock) > 0 && <option value="Available">✅ Available</option>}
                <option value="Unavailable">❌ Unavailable</option>
                <option value="Out of Stock">🚫 Out of Stock</option>
              </Dropdown>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <HiExclamation className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </form>

        <div className={`flex gap-3 px-6 py-4 border-t ${dark ? 'border-white/10' : 'border-slate-100'}`}>
          <button type="button" onClick={onClose}
            className={`flex-1 rounded-lg border py-2.5 text-sm transition ${dark ? 'border-white/10 text-[#b6bec9] hover:bg-[#1a2029]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Cancel
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-1 rounded-lg bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Saving...' : isEdit ? 'Update Item' : 'Add Item'}
          </button>
        </div>
        </div>
        </ModalOverlay>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
const EcoShopping = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);

  const [items,     setItems]     = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);
  const [toast,     setToast]     = useState('');
  const [alertToast, setAlertToast] = useState(null);

  const showToast = (msg, isAlert = false) => { 
    if (isAlert) setAlertToast(msg);
    else setToast(msg); 
    setTimeout(() => {
      if (isAlert) setAlertToast(null);
      else setToast('');
    }, 4000); 
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (catFilter !== 'all') params.set('category', catFilter);
      if (search) params.set('search', search);
      const res  = await fetch(`${API_BASE}?${params}`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch { } finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try {
      const res  = await fetch(`${API_BASE}/analytics`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
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

  useEffect(() => { fetchItems(); }, [catFilter, search]);
  useEffect(() => {
    fetchAnalytics();

    socket.on('RECYCLE_ITEM_UPDATED', (data) => {
      if (data.action === 'DELETE') {
        setItems(prev => prev.filter(i => i._id !== data.itemId));
      } else {
        const item = data.item;
        setItems(prev => {
          const exists = prev.some(i => i._id === item._id);
          if (exists) return prev.map(i => i._id === item._id ? item : i);
          return [item, ...prev];
        });
      }
      fetchAnalytics(); // Refresh analytics when something changes
    });

    socket.on('ADMIN_STOCK_ALERT', (data) => {
      showToast(`🚨 ${data.message}`, true);
    });

    socket.on('STORE_ANALYTICS_UPDATED', () => {
      fetchAnalytics();
    });

    return () => {
      socket.off('RECYCLE_ITEM_UPDATED');
      socket.off('ADMIN_STOCK_ALERT');
      socket.off('STORE_ANALYTICS_UPDATED');
    };
  }, []);

  const handleSaved = (savedItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i._id === savedItem._id);
      if (idx >= 0) { const arr = [...prev]; arr[idx] = savedItem; return arr; }
      return [savedItem, ...prev];
    });
    setShowModal(false); setEditItem(null);
    // Analytics updated by socket
    showToast(editItem ? 'Item updated!' : 'Item added!');
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      setItems(prev => prev.filter(i => i._id !== id));
      // Analytics updated by socket
      showToast('Item deleted.');
    } catch { showToast('Delete failed.'); }
    setDeleteId(null);
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'Available' ? 'Unavailable' : 'Available';
    try {
      const fd = new FormData(); fd.append('status', newStatus);
      const res  = await fetch(`${API_BASE}/${item._id}`, { method: 'PUT', headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: fd });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      setItems(prev => prev.map(i => i._id === item._id ? data.item : i));
      showToast(`Item marked ${newStatus}`);
    } catch { showToast('Update failed.'); }
  };

/* toggleFeatured removed */
 
  const adjustStock = async (item, delta) => {
    const newStock = Math.max(0, item.stock + delta);
    if (newStock === item.stock) return;
    
    // Optimistic update
    setItems(prev => prev.map(i => {
      if (i._id === item._id) {
        let newStatus = i.status;
        if (newStock === 0) newStatus = 'Out of Stock';
        else if (i.stock === 0 && newStock > 0) newStatus = 'Available';
        return { ...i, stock: newStock, status: newStatus };
      }
      return i;
    }));

    try {
      const fd = new FormData();
      fd.append('stock', String(newStock));
      const res = await fetch(`${API_BASE}/${item._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` },
        body: fd
      });
      if (res.status === 401) {
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-user');
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error();
      // Server will emit socket event, but we already updated optimistically.
      // The socket listener in useEffect will keep it in sync if needed.
    } catch {
      showToast('Fast update failed. Please refresh.');
      fetchItems(); // Rollback
    }
  };

  const card = `rounded-lg border shadow-sm ${dk('bg-slate-800 border-gray-700', 'bg-white border-slate-100')}`;
  const textPrimary = dk('text-slate-100', 'text-slate-900');
  const textMuted   = dk('text-slate-400', 'text-slate-500');

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-green-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl animate-bounce-in">
          <HiCheckCircle className="h-4 w-4" /> {toast}
        </div>
      )}

      {alertToast && (
        <div className="fixed top-20 right-4 z-[100] flex items-center gap-3 bg-red-600 text-white text-sm font-bold px-5 py-3 rounded-lg shadow-2xl animate-shake border-2 border-white/20">
          <HiExclamation className="h-5 w-5" /> {alertToast}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <ModalOverlay onClose={() => setDeleteId(null)} className="flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-lg shadow-2xl p-6 space-y-4 ${dark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
            <div className="flex items-start gap-3">
              <HiTrash className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className={`font-bold ${textPrimary}`}>Delete Item?</p>
                <p className={`text-sm mt-1 ${textMuted}`}>This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className={`flex-1 rounded-lg border py-2.5 text-sm ${dk('border-slate-600 text-slate-300 hover:bg-slate-800', 'border-slate-300 text-slate-600 hover:bg-slate-50')} transition`}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm text-white hover:bg-red-500 font-bold transition">Delete</button>
            </div>
        </div>
        </ModalOverlay>
      )}

      {/* Item Modal */}
      {(showModal || editItem) && (
        <ItemModal
          item={editItem}
          dark={dark}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>
            Eco Shop Management
          </h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage eco-friendly products for platform citizens</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 justify-center text-white text-sm font-semibold px-4 rounded-lg transition shadow-sm h-10 min-w-[140px]"
          style={{ backgroundColor: '#0BAF2A' }}
        >
          <HiPlus className="h-5 w-5" /> Add Item
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Items',    value: analytics?.totalItems    ?? '—', icon: HiCube,         color: 'text-blue-500', grad: 'from-blue-500/10 to-blue-500/5' },
          { label: 'Out of Stock',   value: analytics?.outOfStock    ?? '—', icon: HiExclamation,  color: 'text-red-500',  grad: 'from-red-500/10 to-red-500/5' },
          { label: 'Total Purchases', value: analytics?.totalRequests ?? '—', icon: HiShoppingCart,  color: 'text-purple-500', grad: 'from-purple-500/10 to-purple-500/5' },
          { label: 'Total Views',    value: analytics?.totalViews    ?? '—', icon: HiChartBar,     color: 'text-green-500', grad: 'from-green-500/10 to-green-500/5' },
        ].map(({ label, value, icon: Icon, color, grad }) => (
          <div key={label} className={`${card} p-4 text-center bg-gradient-to-br ${grad}`}>
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${textMuted}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group flex-1 min-w-0 sm:min-w-[240px] ${
          dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
        }`}>
          <HiSearch className={`h-4 w-4 shrink-0 transition-colors ${dark ? 'text-slate-500 group-focus-within:text-green-500' : 'text-slate-400 group-focus-within:text-green-500'}`} />
          <input
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..." 
            className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
          />
        </div>
        <Dropdown value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="w-auto text-sm font-semibold"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Dropdown>
      </div>

      {/* Items Grid */}
      {loading ? <Spinner /> : items.length === 0 ? (
        <div className={`${card} flex flex-col items-center justify-center py-16 gap-3`}>
          <MdRecycling className="h-12 w-12 text-green-500 opacity-40" />
          <p className={`text-sm ${textMuted}`}>No items found. Add your first recyclable item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item._id} className={`${card} rounded-lg overflow-hidden flex flex-col`}>
              {/* Image */}
              <div className="relative h-40 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-700">
                {item.image
                  ? <img src={item.image} alt={item.itemName} className="w-full h-full object-contain p-3" />
                  : <span className="text-green-500 text-3xl">{CAT_ICONS[item.category] || <MdFolder />}</span>
                }
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'Available'
                      ? 'bg-green-500 text-white'
                      : item.status === 'Out of Stock'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-500 text-white'
                  }`}>
                    {item.status === 'Available' ? '● AVAILABLE' : item.status === 'Out of Stock' ? '● OUT OF STOCK' : '● UNAVAILABLE'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm line-clamp-1 ${textPrimary}`}>{item.itemName}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${textMuted}`}>
                      <span className="text-green-500">{CAT_ICONS[item.category]}</span> {item.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-500 font-extrabold text-sm shrink-0">₹{item.price}</p>
                    <p className={`text-[9px] font-bold uppercase transition-colors ${item.stockType === 'Set' ? 'text-green-500' : 'text-blue-500'}`}>{item.stockType}</p>
                  </div>
                </div>
                {item.description && (
                  <p className={`text-xs line-clamp-2 ${textMuted}`}>{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs flex items-center gap-1 ${item.stock === 0 ? 'text-red-500 font-bold' : textMuted}`}>
                      <HiCube className="h-3 w-3" /> {item.stock} {item.stockType === 'Set' ? (item.stock === 1 ? 'Set' : 'Sets') : 'Items'} Available
                    </span>
                    {item.stockType === 'Set' && (
                      <span className={`text-[10px] ${textMuted}`}>({item.itemsPerSet} items/set)</span>
                    )}
                    <div className={`flex items-center rounded-lg p-1 border ${dk('bg-slate-700 border-slate-600', 'bg-slate-100 border-slate-200')}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); adjustStock(item, -1); }}
                        className={`p-1.5 rounded-lg transition ${item.stock === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        title="Decrease stock"
                      >
                        <HiMinus className="h-4 w-4 text-red-500" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); adjustStock(item, 1); }}
                        className="p-1.5 rounded-lg transition hover:bg-slate-200 dark:hover:bg-slate-600"
                        title="Increase stock"
                      >
                        <HiPlus className="h-4 w-4 text-green-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${textMuted}`}>🛒 {item.requests} {item.requests === 1 ? 'Purchase' : 'Purchases'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`flex gap-1 p-3 border-t ${dk('border-gray-700', 'border-slate-100')}`}>
                <button onClick={() => setEditItem(item)} title="Edit"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition"
                  style={{ backgroundColor: '#0BAF2A' }}>
                  <HiPencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => toggleStatus(item)} title="Toggle Status"
                  disabled={item.stock === 0 && item.status === 'Out of Stock'}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                    item.stock === 0 && item.status === 'Out of Stock' ? 'opacity-30 cursor-not-allowed' :
                    item.status === 'Available'
                      ? dk('text-yellow-400', 'text-yellow-600')
                      : dk('text-green-500', 'text-green-500')
                  }`}>
                  {item.status === 'Available' ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                  {item.status === 'Available' ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => setDeleteId(item._id)} title="Delete"
                  className={`flex items-center justify-center p-1.5 rounded-lg transition ${dk('text-red-400', 'text-red-500')}`}>
                  <HiTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EcoShopping;
