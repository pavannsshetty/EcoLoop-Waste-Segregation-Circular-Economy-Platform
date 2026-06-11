import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiUserGroup, HiCalendar, HiClock, HiLocationMarker, HiPlus, HiCollection } from 'react-icons/hi';

const CampaignManager = () => {
    const { dark } = useTheme();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', area: '', date: '', time: '' });
    const [image, setImage] = useState(null);

    const dk = (d, l) => (dark ? d : l);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/api/green-champion/campaigns'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
            }
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            Object.keys(form).forEach(k => formData.append(k, form[k]));
            if (image) formData.append('image', image);

            const res = await fetch(apiUrl('/api/green-champion/campaigns'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                setCreating(false);
                setForm({ title: '', description: '', area: '', date: '', time: '' });
                setImage(null);
                fetchCampaigns();
            }
        } catch (err) {
            console.error('Error creating campaign:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Cleanup Campaigns</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Organize and manage community cleanup drives.</p>
                </div>
                <button 
                  onClick={() => setCreating(true)}
                  className="px-5 py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold shadow-sm hover:bg-green-500 transition active:scale-95 flex items-center gap-2"
                >
                    <HiPlus className="h-4 w-4" /> New Campaign
                </button>
            </div>

            {creating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-xl rounded-lg border p-6 space-y-5 animate-in zoom-in duration-200 ${dk('bg-slate-900 border-gray-800 text-slate-100', 'bg-white border-slate-200 text-slate-900')}`}>
                        <h3 className="text-lg font-bold">Create Cleanup Campaign</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Campaign Title</label>
                                    <input value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`} placeholder="e.g. Sunday Beach Cleanup" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date</label>
                                    <input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Time</label>
                                    <input type="time" value={form.time} onChange={e=>setForm({...form, time: e.target.value})} className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`} required />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Specific Area/Point</label>
                                    <input value={form.area} onChange={e=>setForm({...form, area: e.target.value})} className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`} placeholder="e.g. Near Main Market Bridge" required />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                                    <textarea value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`} rows={3} placeholder="What will we do? What should people bring?" required />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Banner Image</label>
                                    <input type="file" onChange={e=>setImage(e.target.files[0])} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-green-500 hover:file:bg-green-500" accept="image/*" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                                <button type="button" onClick={() => setCreating(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-lg bg-green-500 text-white text-sm font-bold shadow-sm hover:bg-green-500 transition active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Creating...' : 'Launch Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : campaigns.length === 0 ? (
                <div className={`py-20 text-center rounded-lg border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
                    <HiUserGroup className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No campaigns scheduled. Be the first to start one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(c => (
                        <div key={c._id} className={`rounded-lg border overflow-hidden transition hover:shadow-lg flex flex-col ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100 shadow-sm')}`}>
                            <div className="aspect-video bg-slate-100 relative">
                                {c.image ? (
                                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-300 bg-green-500/5">
                                        <HiUserGroup className="h-12 w-12" />
                                    </div>
                                )}
                                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                                    c.status === 'Upcoming' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'
                                }`}>
                                    {c.status}
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className={`text-lg font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{c.title}</h3>
                                <div className="mt-3 space-y-2 flex-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <HiCalendar className="h-4 w-4 text-green-500" />
                                        {new Date(c.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <HiClock className="h-4 w-4 text-green-500" />
                                        {c.time}
                                    </div>
                                    <div className="flex items-start gap-2 text-xs font-medium text-slate-500">
                                        <HiLocationMarker className="h-4 w-4 text-green-500 shrink-0" />
                                        <span className="line-clamp-1">{c.area}</span>
                                    </div>
                                </div>
                                <div className={`mt-4 pt-4 border-t flex items-center justify-between ${dk('border-gray-800', 'border-slate-50')}`}>
                                    <div className="flex -space-x-2">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                                                V
                                            </div>
                                        ))}
                                        <div className="h-7 w-7 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-[10px] font-bold text-white">
                                            +{Math.max(0, (c.volunteers?.length || 0) - 3)}
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-green-500 hover:underline">Manage Volunteers</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CampaignManager;
