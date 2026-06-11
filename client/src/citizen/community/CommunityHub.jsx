import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiUrl } from '../../shared/utils/api';
import Dropdown from '../../shared/components/Dropdown';
import { 
  HiSpeakerphone, HiUserGroup, HiHeart, HiCheckCircle, 
  HiCalendar, HiClock, HiLocationMarker, HiRefresh,
  HiStar, HiAnnotation, HiX, HiInformationCircle
} from 'react-icons/hi';

const CommunityHub = () => {
    const navigate = useNavigate();
    const { toast, dark } = useOutletContext();
    const [posts, setPosts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('awareness'); // awareness, campaigns, recycling
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [pickupForm, setPickupForm] = useState({ type: '', quantity: '', address: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    const dk = (d, l) => (dark ? d : l);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [postsRes, campaignsRes] = await Promise.all([
                fetch(apiUrl('/api/citizen/community/posts'), { headers: { Authorization: `Bearer ${token}` } }),
                fetch(apiUrl('/api/citizen/community/campaigns'), { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (postsRes.ok) setPosts(await postsRes.json());
            if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
        } catch (err) {
            console.error('Error fetching community data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleJoinCampaign = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl(`/api/citizen/community/campaign/${id}/join`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Joined campaign successfully!');
                fetchData();
            } else {
                const d = await res.json();
                toast.error(d.message || 'Error joining campaign');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handlePickupSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/api/citizen/community/recycling-request'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(pickupForm)
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.addressRequired) {
                    toast.error('Please complete your address profile to request pickups.');
                    setShowPickupModal(false);
                    setTimeout(() => navigate('/citizen/complete-profile'), 1500);
                } else {
                    toast.error(data.message || 'Error submitting pickup request');
                }
                return;
            }
            const data = await res.json();
            toast.success('Pickup request submitted! Green Champion will contact you soon.');
            setShowPickupModal(false);
            setPickupForm({ type: '', quantity: '', address: '', notes: '' });
        } catch (err) {
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const inp = `w-full px-4 py-3 rounded-lg border text-sm transition focus:ring-2 focus:ring-green-500 outline-none ${dk('bg-white/5 border-gray-700 text-white', 'bg-slate-50 border-slate-200 text-slate-900')}`;

    return (
        <div className="page-container animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="page-header">Community Hub</h1>
                <p className="page-subheading">Connect with your Green Champion and join cleanup efforts</p>
            </div>

            <div className="tab-list mb-8">
                {['awareness', 'campaigns', 'recycling'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setTab(t)}
                        className={`tab-btn px-6 py-2.5 capitalize ${tab === t ? 'active' : ''}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : (
                <div className="space-y-6">
                    {tab === 'awareness' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {posts.map(post => (
                                <div key={post._id} className={`rounded-lg border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${dk('bg-white/5 border-white/10', 'bg-white border-black/[0.04] shadow-[0_4px_14px_rgba(0,0,0,0.05)]')}`}>
                                    <div className="p-5 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                            {post.author?.name ? post.author.name[0].toUpperCase() : 'G'}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{post.author?.name || 'Green Champion'}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${dk('text-slate-500', 'text-slate-400')}`}>{new Date(post.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5">
                                        <h3 className={`text-lg font-extrabold mb-2 tracking-tight ${dk('text-slate-100', 'text-slate-900')}`}>{post.title}</h3>
                                        <p className={`text-sm leading-relaxed line-clamp-3 ${dk('text-slate-400', 'text-slate-600')}`}>{post.description}</p>
                                    </div>
                                    {post.image && <img src={post.image} alt="post" className="w-full h-52 object-cover" />}
                                    <div className={`p-4 border-t flex items-center justify-between ${dk('border-white/10', 'border-slate-50')}`}>
                                        <button className={`flex items-center gap-2 text-xs font-bold transition hover:text-red-500 ${dk('text-slate-400', 'text-slate-500')}`}>
                                            <HiHeart className="h-5 w-5" /> Like
                                        </button>
                                        <button className="text-xs font-bold text-green-500 hover:text-green-500 transition">Read Full Story</button>
                                    </div>
                                </div>
                            ))}
                            {posts.length === 0 && (
                                <div className="empty-state-container col-span-2 py-20 border-dashed">
                                    <HiAnnotation size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h2 className="empty-state-title">No stories yet</h2>
                                    <p className="empty-state-text">No awareness stories shared yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'campaigns' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map(c => (
                                <div key={c._id} className={`rounded-lg border overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${dk('bg-white/5 border-white/10', 'bg-white border-black/[0.04] shadow-[0_4px_14px_rgba(0,0,0,0.05)]')}`}>
                                    <div className="aspect-video bg-slate-100 dark:bg-white/5 relative">
                                        {c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><HiUserGroup className="h-12 w-12 text-green-500/20" /></div>}
                                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold rounded-lg shadow-lg uppercase tracking-wider">{c.status}</div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col gap-5">
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-extrabold tracking-tight line-clamp-1 ${dk('text-slate-100', 'text-slate-900')}`}>{c.title}</h3>
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-white/5 w-fit px-2 py-1 rounded-lg">
                                                    <HiCalendar className="h-3 w-3 text-green-500" /> {new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-white/5 w-fit px-2 py-1 rounded-lg">
                                                    <HiLocationMarker className="h-3 w-3 text-red-500" /> {c.area}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleJoinCampaign(c._id)}
                                            className="w-full py-3 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-500 transition active:scale-95 shadow-lg shadow-green-500/20"
                                        >
                                            Join Campaign
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {campaigns.length === 0 && (
                                <div className="empty-state-container col-span-3 py-20 border-dashed">
                                    <HiSpeakerphone size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h2 className="empty-state-title">No campaigns</h2>
                                    <p className="empty-state-text">No upcoming campaigns in your area.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'recycling' && (
                        <div className={`p-10 rounded-[2.5rem] border text-center space-y-6 ${dk('bg-white/5 border-white/10', 'bg-white border-black/[0.04] shadow-xl shadow-black/5')}`}>
                            <div className="h-20 w-20 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto shadow-inner">
                                <HiRefresh className="h-10 w-10 text-green-500" />
                            </div>
                            <div className="max-w-md mx-auto">
                                <h3 className={`text-2xl font-black tracking-tight ${dk('text-slate-100', 'text-slate-900')}`}>Household Recycling</h3>
                                <p className={`mt-3 text-sm leading-relaxed font-medium ${dk('text-slate-400', 'text-slate-600')}`}>Request a direct pickup for your sorted recyclable waste (Plastics, Metals, Paper) by your community Green Champion.</p>
                            </div>
                            <button 
                                onClick={() => setShowPickupModal(true)}
                                className="px-10 py-4 rounded-lg bg-green-500 text-white font-bold shadow-lg shadow-green-500/30 hover:bg-green-500 transition-all hover:scale-105 active:scale-95"
                            >
                                Request a Pickup
                            </button>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pt-4">+10 Eco Points per successful pickup</p>
                        </div>
                    )}
                </div>
            )}

            {showPickupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full max-w-lg rounded-[2.5rem] border p-8 space-y-8 animate-in zoom-in-95 duration-300 shadow-2xl ${dk('bg-slate-900 border-white/10', 'bg-white border-black/5')}`}>
                         <div className="flex justify-between items-center">
                            <div>
                                <h2 className={`text-2xl font-black tracking-tight ${dk('text-white', 'text-slate-900')}`}>Request Pickup</h2>
                                <p className="text-xs font-bold text-slate-500 tracking-wide mt-1">Schedule a waste collection from your doorstep</p>
                            </div>
                            <button onClick={() => setShowPickupModal(false)} className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all ${dk('bg-white/5 text-slate-500 hover:text-white', 'bg-slate-50 text-slate-400 hover:text-slate-600')}`}>
                                <HiX className="h-6 w-6" />
                            </button>
                         </div>
                         
                         <form onSubmit={handlePickupSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="uppercase-label">Waste Category</label>
                                    <Dropdown 
                                        className={inp}
                                        value={pickupForm.type}
                                        onChange={e => setPickupForm({...pickupForm, type: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Plastic">Plastic</option>
                                        <option value="Metal">Metal</option>
                                        <option value="Paper">Paper</option>
                                        <option value="Mixed">Mixed</option>
                                    </Dropdown>
                                </div>
                                <div className="space-y-2">
                                    <label className="uppercase-label">Quantity</label>
                                    <input 
                                        placeholder="e.g. 5kg, 2 bags"
                                        className={inp}
                                        value={pickupForm.quantity}
                                        onChange={e => setPickupForm({...pickupForm, quantity: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="uppercase-label">Pickup Address</label>
                                <textarea 
                                    placeholder="House number, landmark, area..."
                                    className={inp}
                                    rows={2}
                                    value={pickupForm.address}
                                    onChange={e => setPickupForm({...pickupForm, address: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="uppercase-label">Notes (Optional)</label>
                                <input 
                                    placeholder="e.g. Leave outside gate"
                                    className={inp}
                                    value={pickupForm.notes}
                                    onChange={e => setPickupForm({...pickupForm, notes: e.target.value})}
                                />
                            </div>
                             
                            <div className={`p-5 rounded-lg flex gap-3 border ${dk('bg-blue-500/10 border-blue-500/20', 'bg-blue-50 border-blue-100')}`}>
                                <HiInformationCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-bold">Your request will be visible to Green Champions in your village. You will receive an SMS confirmation when a champion accepts.</p>
                            </div>
 
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 rounded-lg bg-green-500 text-white font-black hover:bg-green-500 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/30 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Pickup Request'}
                            </button>
                         </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityHub;
