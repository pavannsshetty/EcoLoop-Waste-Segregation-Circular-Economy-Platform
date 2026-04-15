import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiLocationMarker, HiClock, HiRefresh, 
  HiChevronRight, HiUser, HiTruck,
  HiClipboardList, HiCurrencyRupee
} from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const STATUS_STYLES = {
  Requested:   'bg-blue-100 text-blue-700 border-blue-200',
  Assigned:    'bg-purple-100 text-purple-700 border-purple-200',
  'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Collected:    'bg-green-100 text-green-700 border-green-200',
};

const MyScrapRequests = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user } = useUser();
  const dk = (d, l) => (dark ? d : l);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/scrap/user/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(await res.json());
      } else {
        setError('Failed to load requests.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?._id]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric' 
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>My Scrap Requests</h1>
          <p className="text-xs text-slate-500">Track and manage your recyclable scrap pickups.</p>
        </div>
        <button 
          onClick={fetchRequests} 
          className={`p-2 rounded-sm border transition-colors duration-200 ${dk('border-slate-700 text-slate-400 hover:bg-slate-700', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}
          title="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 border-4 border-green-500 border-t-transparent animate-spin rounded-full" />
          <p className="text-sm text-slate-500">Loading your requests...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center space-y-3">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchRequests} className="text-sm text-red-700 underline font-bold">Try again</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
            <HiClipboardList className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${dk('text-white', 'text-slate-900')}`}>No requests found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">You haven't submitted any scrap pickup requests yet.</p>
          </div>
          <button 
            onClick={() => navigate('/citizen/sell-scrap')}
            className="bg-green-600 text-white px-6 py-2.5 rounded-sm font-bold hover:bg-green-500 transition"
          >
            Sell Scrap Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((r) => (
            <div 
              key={r._id} 
              className={`group rounded-sm border p-4 sm:p-5 transition-colors duration-200 hover:shadow-sm ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-200')}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-sm flex items-center justify-center shrink-0 ${dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-600')}`}>
                    <HiTruck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold truncate ${dk('text-white', 'text-slate-900')}`}>{r.scrapType}</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <HiClock className="h-3.5 w-3.5" />
                      {r.quantity} • Pickup: {r.pickupTime}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <HiLocationMarker className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{r.location?.address}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 gap-2">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Requested on</p>
                    <p className={`text-xs ${dk('text-slate-300', 'text-slate-700')}`}>{formatDate(r.createdAt)}</p>
                  </div>
                  {r.assignedCollector && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <HiUser className="h-3.5 w-3.5" />
                      Collector Assigned
                    </div>
                  )}
                  {r.status === 'Collected' && (
                    <div className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      +{r.ecoPoints} Points earned
                    </div>
                  )}
                </div>
              </div>
              
              {r.description && (
                <div className={`mt-4 p-3 rounded-sm text-xs ${dk('bg-slate-900 text-slate-400', 'bg-slate-50 text-slate-600')}`}>
                  <p className="font-bold mb-1 uppercase text-[10px] text-slate-400">Notes:</p>
                  {r.description}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => navigate(`/citizen/scrap-status`)}
                  className="text-xs text-green-600 font-bold flex items-center gap-1 hover:underline"
                >
                  View Details <HiChevronRight className="h-3.5 w-3.5" />
                </button>
                {r.status === 'Requested' && (
                   <span className="text-[10px] text-slate-400 italic">Waiting for collector...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className={`p-4 rounded-sm border flex items-center justify-between transition-colors duration-200 ${dk('bg-green-900/20 border-green-800', 'bg-green-50 border-green-200')}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center text-white">
             <HiCurrencyRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Need to sell more scrap?</p>
            <p className="text-xs text-green-600">Turn your waste into wealth!</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/citizen/sell-scrap')}
          className="bg-white text-green-600 text-xs font-bold px-4 py-2 rounded-sm border border-green-200 hover:bg-green-50 transition"
        >
          New Request
        </button>
      </div>
    </div>
  );
};

export default MyScrapRequests;
