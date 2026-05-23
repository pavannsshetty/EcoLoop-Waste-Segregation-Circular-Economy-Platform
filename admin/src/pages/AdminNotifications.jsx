import { useState } from 'react';
import { HiBell, HiSparkles, HiPaperAirplane, HiCheckCircle, HiCalendar, HiLocationMarker } from 'react-icons/hi';
import { MdEmojiNature, MdRecycling } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';
import Dropdown from '../components/Dropdown';

const NOTIFICATION_TYPES = [
  'Eco Events', 
  'Awareness Campaigns', 
  'Waste Collection Drives', 
  'Plastic-Free Campaigns', 
  'Emergency Alerts', 
  'Government Announcements', 
  'New Features/Updates', 
  'Reward Bonus Events',
  'System'
];

const TARGET_AUDIENCES = ['All', 'Citizens', 'Collectors', 'Green Champions', 'Specific Community'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const AdminNotifications = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const token = localStorage.getItem('admin-token');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'System',
    priority: 'Low',
    targetAudience: 'All',
    targetVillage: '',
    isEvent: false,
    date: '',
    time: '',
    venue: '',
    link: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        targetVillage: formData.targetVillage,
        isEvent: formData.isEvent,
        eventDetails: formData.isEvent ? {
          date: formData.date,
          time: formData.time,
          venue: formData.venue,
          link: formData.link
        } : undefined
      };

      const res = await fetch(`/api/notifications/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification broadcasted successfully!' });
        setFormData({
          title: '', description: '', type: 'System', priority: 'Low',
          targetAudience: 'All', targetVillage: '', isEvent: false,
          date: '', time: '', venue: '', link: ''
        });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to send notification.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="border-b pb-6 border-slate-200 dark:border-gray-800">
        <h1 className={`text-2xl font-bold tracking-tight ${dk('text-white', 'text-gray-900')} flex items-center gap-3`}>
          <HiBell className="text-green-500" />
          Broadcast Center
        </h1>
        <p className={`mt-2 text-sm ${dk('text-gray-400', 'text-gray-500')}`}>
          Send real-time notifications, alerts, and eco events to platform users.
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? dk('bg-green-500/10 text-green-500 border border-green-500/20', 'bg-green-500 text-green-500 border border-green-500') 
          : dk('bg-red-500/10 text-red-400 border border-red-500/20', 'bg-red-50 text-red-700 border border-red-200')
        }`}>
          {message.type === 'success' ? <HiCheckCircle className="h-5 w-5" /> : <HiBell className="h-5 w-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`rounded-3xl border shadow-lg overflow-hidden ${dk('bg-gray-900 border-gray-800', 'bg-white border-slate-200')}`}>
         <div className={`p-6 sm:p-8 space-y-6`}>
           
           <div className="space-y-4">
             <h3 className={`text-sm font-bold uppercase tracking-wider ${dk('text-gray-400', 'text-gray-500')}`}>1. Message Content</h3>
             <div className="grid gap-4">
               <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Notification Title</label>
                  <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Mega Cleanliness Drive this Sunday" className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`} />
               </div>
               <div>
                  <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Description</label>
                  <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} placeholder="Provide details about the announcement..." className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors resize-none ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`}></textarea>
               </div>
             </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-gray-800">
             <h3 className={`text-sm font-bold uppercase tracking-wider ${dk('text-gray-400', 'text-gray-500')}`}>2. Configuration</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Category</label>
                   <Dropdown name="type" value={formData.type} onChange={handleChange} className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`}>
                      {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                   </Dropdown>
                </div>
                <div>
                   <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Priority</label>
                   <Dropdown name="priority" value={formData.priority} onChange={handleChange} className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                   </Dropdown>
                </div>
                <div>
                   <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Target Audience</label>
                   <Dropdown name="targetAudience" value={formData.targetAudience} onChange={handleChange} className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`}>
                      {TARGET_AUDIENCES.map(t => <option key={t} value={t}>{t}</option>)}
                   </Dropdown>
                </div>
                {formData.targetAudience === 'Specific Community' && (
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Village / Community Name</label>
                     <input type="text" name="targetVillage" required value={formData.targetVillage} onChange={handleChange} placeholder="e.g. Green Valley" className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-gray-50 border-gray-300 text-gray-900')}`} />
                  </div>
                )}
             </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-gray-800">
             <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${dk('text-gray-400', 'text-gray-500')}`}>3. Event Details (Optional)</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`text-xs font-bold ${dk('text-white', 'text-gray-900')}`}>Is this an Event?</span>
                  <input type="checkbox" name="isEvent" checked={formData.isEvent} onChange={handleChange} className="w-4 h-4 text-green-500 rounded bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2" />
                </label>
             </div>
             
             {formData.isEvent && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border ${dk('bg-white/5 border-gray-800', 'bg-gray-50 border-gray-200')}`}>
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Date</label>
                     <div className="relative">
                       <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input type="date" name="date" required value={formData.date} onChange={handleChange} className={`w-full rounded-xl border pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}`} />
                     </div>
                  </div>
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Time</label>
                     <input type="time" name="time" required value={formData.time} onChange={handleChange} className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}`} />
                  </div>
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Venue</label>
                     <div className="relative">
                       <HiLocationMarker className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input type="text" name="venue" required value={formData.venue} onChange={handleChange} placeholder="Physical address or Zoom link" className={`w-full rounded-xl border pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}`} />
                     </div>
                  </div>
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Registration / Info Link</label>
                     <input type="url" name="link" value={formData.link} onChange={handleChange} placeholder="https://..." className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-colors ${dk('bg-gray-800 border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}`} />
                  </div>
                </div>
             )}
           </div>

         </div>
         
         <div className={`p-4 sm:p-6 border-t flex justify-end gap-4 ${dk('bg-black/50 border-gray-800', 'bg-gray-50 border-slate-200')}`}>
            {loading ? (
              <div className="h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-500 transition shadow-lg shadow-green-500/20 active:scale-95">
                <HiPaperAirplane className="rotate-90" /> Broadcast Update
              </button>
            )}
         </div>
      </form>
    </div>
  );
};

export default AdminNotifications;
