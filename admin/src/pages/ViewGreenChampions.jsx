import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiPencil, HiTrash, HiEye, HiX, HiExclamation, HiSearch } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import Dropdown from '../components/Dropdown';

const VILLAGES = [
  'Ajri','Albadi','Aloor','Amasebail','Ampar','Anagalli','Asodu','Badakere','Balkur','Basrur',
  'Beejadi','Bellal','Beloor','Belve','Bijoor','Byndoor','Chittoor','Devalkunda','Edmoge',
  'Gangolli','Golihole','Gopadi','Gujjadi','Gulvadi','Hadavu','Hekladi','Halady',
  'Hallady - Harkadi','Hallihole','Halnad','Hangaloor','Harady','Hardally - Mandally',
  'Harkoor','Hattiangadi','Hemmadi','Hengavalli','Heranjal','Heroor','Heskathoor',
  'Hombady - Mandadi','Hosadu','Hosangadi','Hosoor','Idurkunhadi','Jadkal','Japthi',
  'Kalavara','Kalthodu','Kamalashile','Kambadakone','Kandavara','Kanyana','Karkunje',
  'Kattabelthoor','Kavrady','Kedoor','Kenchanoor','Keradi','Kergal','Kirimanjeshwar',
  'Kodladi','Kollur','Koni','Korgi','Kulanje','Kumbashi','Kundabarandadi','Machattu',
  'Madammakki','Maravanthe','Molahalli','Mudoor','Nada','Nandanavana','Navunda','Noojadi',
  'Paduvari','Rattadi','Senapur','Shankaranarayana','Shedimane','Shiroor','Siddapur',
  'Tallur','Thagarasi','Thekkatte','Trashi','Ulloor','Ulthoor','Uppinakudru','Uppunda',
  'Vakwadi','Vandse','Yedthare','Yedyadi - Mathyadi','Yeljith',
].sort((a, b) => a.localeCompare(b));

const ModalWrapper = ({ children, onClose, title, dk }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6 bg-black/60 overflow-y-auto" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
        <div className={`relative m-auto w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-2xl max-h-full rounded-lg border flex flex-col shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10 rounded-t-lg ${dk('border-slate-800 bg-slate-900', 'border-slate-100 bg-white')}`}>
          <h2 className={`text-lg font-bold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{title}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition shrink-0 ${dk('text-slate-400 hover:bg-slate-800 hover:text-white', 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ViewGreenChampions = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const [search, setSearch] = useState('');
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const filteredChampions = useMemo(() => {
    if (!search.trim()) return champions;
    const q = search.toLowerCase();
    return champions.filter((c) =>
      [c.name, c.village, c.phone, c.email, c.greenChampionId]
        .concat(c.assignedAreas || [])
        .some((f) => f?.toLowerCase().includes(q))
    );
  }, [champions, search]);

  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition shadow-sm'
  );
  const labelClass = dk('text-slate-400', 'text-slate-600');

  const fetchChampions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch('/api/admin/green-champions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setChampions(d.champions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChampions();
  }, []);

  const openEdit = (c) => {
    setForm({
      name: c.name || '', email: c.email || '', mobile: c.phone || '', // User model uses 'phone'
      village: c.village || '', assignedArea: c.assignedAreas?.[0] || '',
      accountStatus: c.accountStatus || 'Active', password: ''
    });
    setErrors({});
    setEditModal(c);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/green-champion/${editModal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, phone: form.mobile })
      });
      if (res.ok) {
        setEditModal(null);
        fetchChampions();
      } else {
         const data = await res.json();
         setErrors({ submit: data.message || 'Update failed' });
      }
    } catch {
      setErrors({ submit: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`/api/admin/green-champion/${deleteModal._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteModal(null);
        fetchChampions();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Green Champions</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage community leaders and environmental advocates</p>
        </div>
      </div>

      <div className={`flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group max-w-md ${
        dark ? 'bg-slate-800 border-slate-600 focus-within:border-green-500' : 'bg-white border-slate-200 focus-within:border-green-500 shadow-sm'
      }`}>
        <HiSearch className={`h-4 w-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, village, ID, contact..."
          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
        />
      </div>

      <div className={`rounded-lg border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dk('border-gray-800', 'border-slate-100')}`}>
          <h2 className={`text-sm font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>All Green Champions</h2>
          <span className={`text-xs font-medium ${dk('text-slate-500', 'text-slate-500')}`}>
            {search ? `${filteredChampions.length} of ${champions.length}` : `${champions.length} registered`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredChampions.length === 0 ? (
          <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>
            {search ? `No champions matching "${search}".` : 'No Green Champions found.'}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${dk('bg-slate-800/50 border-gray-800 text-slate-500', 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  {['Photo', 'Champion ID', 'Name', 'Contact', 'Village / Area', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={`px-5 py-3 font-semibold whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredChampions.map((c) => (
                  <tr key={c._id} className={`border-b transition ${dk('border-gray-800/50 hover:bg-white/5', 'border-slate-100 hover:bg-green-50/50')}`}>
                     <td className="px-5 py-4 whitespace-nowrap">
                       <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                         {c.profilePhoto
                           ? <img src={c.profilePhoto} alt={c.name} className="h-full w-full object-cover" />
                           : (c.name || 'G')[0].toUpperCase()
                         }
                       </div>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                        <p className={`font-mono text-xs font-bold ${dk('text-green-500', 'text-green-500')}`}>{c.greenChampionId || 'N/A'}</p>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                        <p className={`font-semibold ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</p>
                        <p className={`text-[10px] uppercase font-bold text-green-500 tracking-wider`}>Green Champion</p>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                       <p className={dk('text-slate-300', 'text-slate-700')}>{c.phone}</p>
                       <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>{c.email}</p>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                       <p className={dk('text-slate-300', 'text-slate-700')}>{c.village}</p>
                       <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>{c.assignedAreas?.[0] || 'No specific area'}</p>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex min-w-16 justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${c.accountStatus === 'Active' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')}`}>
                          {c.accountStatus}
                        </span>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => setViewModal(c)} className={`p-2 rounded-lg border transition ${dk('border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400', 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700')}`} title="View">
                           <HiEye className="h-4 w-4" />
                         </button>
                         <button onClick={() => openEdit(c)} className={`p-2 rounded-lg border transition ${dk('border-blue-900/40 text-blue-400 hover:bg-slate-800', 'border-blue-200 text-blue-600 hover:bg-blue-50')}`} title="Edit">
                           <HiPencil className="h-4 w-4" />
                         </button>
                         <button onClick={() => setDeleteModal(c)} className={`p-2 rounded-lg border transition ${dk('border-red-900/40 text-red-400 hover:bg-slate-800', 'border-red-200 text-red-600 hover:bg-red-50')}`} title="Delete">
                           <HiTrash className="h-4 w-4" />
                         </button>
                       </div>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredChampions.map((c) => (
               <div key={c._id} className="p-4 space-y-4">
                 <div className="flex items-start justify-between gap-3">
                   <div className="flex items-start gap-3 min-w-0">
                     <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                       {c.profilePhoto
                         ? <img src={c.profilePhoto} alt={c.name} className="h-full w-full object-cover" />
                         : (c.name || 'G')[0].toUpperCase()
                       }
                     </div>
                     <div className="min-w-0">
                       <p className={`font-mono text-xs font-bold ${dk('text-green-500', 'text-green-600')}`}>{c.greenChampionId || 'N/A'}</p>
                       <p className={`mt-1 font-semibold truncate ${dk('text-slate-200', 'text-slate-800')}`}>{c.name}</p>
                       <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Green Champion</p>
                     </div>
                   </div>
                  <span className={`shrink-0 inline-flex justify-center text-xs font-semibold px-2 py-0.5 rounded-full ${c.accountStatus === 'Active' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-800') : dk('bg-red-900/50 text-red-400', 'bg-red-100 text-red-800')}`}>
                    {c.accountStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Contact</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.phone || '-'}</p>
                    <p className={`text-xs break-all ${dk('text-slate-500', 'text-slate-500')}`}>{c.email || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase font-semibold ${dk('text-slate-500', 'text-slate-400')}`}>Village / Area</p>
                    <p className={dk('text-slate-300', 'text-slate-700')}>{c.village || '-'}</p>
                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{c.assignedAreas?.[0] || 'No specific area'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setViewModal(c)} className={`p-2.5 sm:p-2 rounded-lg border ${dk('border-slate-700 text-slate-400', 'border-slate-200 text-slate-500')}`} title="View"><HiEye className="h-4 w-4" /></button>
                  <button onClick={() => openEdit(c)} className={`p-2.5 sm:p-2 rounded-lg border ${dk('border-blue-900/40 text-blue-400', 'border-blue-200 text-blue-600')}`} title="Edit"><HiPencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteModal(c)} className={`p-2.5 sm:p-2 rounded-lg border ${dk('border-red-900/40 text-red-400', 'border-red-200 text-red-600')}`} title="Delete"><HiTrash className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6 bg-black/60 overflow-y-auto" onClick={(e) => { if(e.target === e.currentTarget) setDeleteModal(null); }}>
          <div className={`relative m-auto w-full max-w-[95vw] sm:max-w-md rounded-lg border p-4 sm:p-6 space-y-4 shadow-2xl ${dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200')}`}>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                 <HiExclamation className="text-red-600" />
               </div>
               <div>
                  <h3 className={`text-lg font-bold ${dk('text-slate-200', 'text-slate-800')}`}>Delete Green Champion?</h3>
                  <p className={`text-sm mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>Delete <span className="font-bold">{deleteModal.name}</span>. This is permanent.</p>
               </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setDeleteModal(null)} className={`px-4 py-2 text-sm ${dk('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-900')}`}>Cancel</button>
              <button onClick={confirmDelete} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-500 transition active:scale-95">
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editModal && (
        <ModalWrapper onClose={() => setEditModal(null)} title={`Edit Champion: ${editModal.name}`} dk={dk}>
           <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Name</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} />
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Email</label>
                    <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} />
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Mobile</label>
                    <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className={inp} />
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>New Password (optional)</label>
                    <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inp} />
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Village</label>
                    <Dropdown value={form.village} onChange={e => setForm({...form, village: e.target.value})} className={inp}>
                       {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                    </Dropdown>
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Assigned Area</label>
                    <input value={form.assignedArea} onChange={e => setForm({...form, assignedArea: e.target.value})} className={inp} />
                 </div>
                 <div>
                    <label className={`text-xs font-semibold block mb-1 ${labelClass}`}>Status</label>
                    <Dropdown value={form.accountStatus} onChange={e => setForm({...form, accountStatus: e.target.value})} className={inp}>
                       <option value="Active">Active</option>
                       <option value="Inactive">Inactive</option>
                    </Dropdown>
                 </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 text-sm">Cancel</button>
                 <button type="submit" disabled={submitting} className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-500 transition active:scale-95 disabled:opacity-50">
                   {submitting ? 'Saving...' : 'Save Changes'}
                 </button>
              </div>
           </form>
        </ModalWrapper>
      )}

      {/* View Modal */}
      {viewModal && (
         <ModalWrapper onClose={() => setViewModal(null)} title="Champion Details" dk={dk}>
             <div className="space-y-4 text-sm">
                 <div className="flex justify-center mb-4">
                   <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                     {viewModal.profilePhoto
                       ? <img src={viewModal.profilePhoto} alt={viewModal.name} className="h-full w-full object-cover" />
                       : (viewModal.name || 'G')[0].toUpperCase()
                     }
                   </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-slate-500 uppercase">Champion ID</p><p className="font-mono font-bold text-green-500">{viewModal.greenChampionId || 'N/A'}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Role</p><p className="font-semibold text-green-500">Green Champion</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Name</p><p className="font-semibold">{viewModal.name}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Status</p><p className="font-semibold">{viewModal.accountStatus}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Mobile</p><p className="font-semibold">{viewModal.phone}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Email</p><p className="font-semibold">{viewModal.email}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Village</p><p className="font-semibold">{viewModal.village}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Specific Area</p><p className="font-semibold">{viewModal.assignedAreas?.[0] || 'N/A'}</p></div>
                   <div><p className="text-xs text-slate-500 uppercase">Registered On</p><p className="font-semibold">{new Date(viewModal.createdAt).toLocaleDateString()}</p></div>
                </div>
             </div>
          </ModalWrapper>
      )}

    </div>
  );
};

export default ViewGreenChampions;
