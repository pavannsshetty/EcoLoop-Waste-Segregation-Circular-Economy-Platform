import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiRefresh, HiCheckCircle, HiPhone, HiLocationMarker, HiInbox } from 'react-icons/hi';

const RecyclingPickups = () => {
    const { dark } = useTheme();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const dk = (d, l) => (dark ? d : l);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/api/green-champion/recycling-requests'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (err) {
            console.error('Error fetching pickups:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdateStatus = async (pickupId, status) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl(`/api/green-champion/recycling-request/${pickupId}`), {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchRequests();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Recycling Pickups</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Manage source-separated recyclable waste collection requests.</p>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : requests.length === 0 ? (
                <div className={`py-20 text-center rounded-lg border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
                    <HiInbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No active recycling pickup requests.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.map(req => (
                        <div key={req._id} className={`p-4 rounded-lg border flex flex-col gap-4 ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold ${dk('text-slate-200', 'text-slate-900')}`}>{req.type} Pickup</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
                                            req.status === 'Requested' ? 'bg-amber-500 text-white' : 
                                            req.status === 'Accepted' ? 'bg-blue-500 text-white' : 
                                            'bg-green-500 text-white'
                                        }`}>{req.status}</span>
                                    </div>
                                    <p className={`text-xs mt-1 font-medium ${dk('text-slate-500', 'text-slate-400')}`}>From: {req.citizen?.name || 'Citizen'}</p>
                                </div>
                                <div className={`text-right ${dk('text-slate-500', 'text-slate-400')}`}>
                                    <p className="text-[10px] uppercase font-bold tracking-widest">Quantity</p>
                                    <p className="text-sm font-bold text-green-500">{req.quantity}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-gray-800">
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    <HiLocationMarker className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                                    <span>{req.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    <HiPhone className="h-4 w-4 shrink-0 text-blue-500" />
                                    <span>{req.citizen?.phone}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {req.status === 'Requested' && (
                                    <button onClick={() => handleUpdateStatus(req._id, 'Accepted')} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition active:scale-95">
                                        Accept Request
                                    </button>
                                )}
                                {req.status === 'Accepted' && (
                                    <button onClick={() => handleUpdateStatus(req._id, 'Collected')} className="flex-1 py-2.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-500 transition active:scale-95 flex items-center justify-center gap-2">
                                        <HiCheckCircle className="h-4 w-4" /> Mark Collected
                                    </button>
                                )}
                                {req.status !== 'Collected' && (
                                    <button onClick={() => handleUpdateStatus(req._id, 'Cancelled')} className={`px-4 py-2.5 rounded-lg border text-xs font-bold font-bold transition ${dk('border-gray-700 text-slate-400 hover:text-red-400', 'border-slate-200 text-slate-500 hover:text-red-500')}`}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecyclingPickups;
