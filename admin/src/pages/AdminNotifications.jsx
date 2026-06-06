import { useState } from 'react';
import { HiBell, HiPaperAirplane, HiCheckCircle, HiCalendar, HiLocationMarker, HiTrash } from 'react-icons/hi';
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

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const AdminNotifications = () => {
  const { dark } = useTheme();
  const dk = (darkValue, lightValue) => (dark ? darkValue : lightValue);

  const inp = dk(
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition'
  );
  const card = dk('bg-white/5 rounded-lg border border-gray-800 p-5 space-y-5', 'bg-white rounded-lg border border-slate-100 p-5 space-y-5 shadow-sm');
  const sectionTitle = dk('text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2', 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'System',
    priority: 'Low',
    targetAudience: 'All',
    targetVillage: '',
    status: 'Active',
    isEvent: false,
    date: '',
    time: '',
    venue: '',
    link: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const token = localStorage.getItem('admin-token');

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'System',
      priority: 'Low',
      targetAudience: 'All',
      targetVillage: '',
      status: 'Active',
      isEvent: false,
      date: '',
      time: '',
      venue: '',
      link: ''
    });
    setImageFile(null);
    setImagePreview('');
    setImageError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Only images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5MB.');
      return;
    }
    setImageError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const banner = imageFile ? await fileToDataUrl(imageFile) : imagePreview || undefined;
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        targetVillage: formData.targetAudience === 'Specific Community' ? formData.targetVillage : '',
        status: formData.status,
        isEvent: formData.isEvent,
        eventDetails: {
          date: formData.date || undefined,
          time: formData.time || undefined,
          venue: formData.venue || undefined,
          link: formData.link || undefined,
          banner: banner || undefined
        }
      };

      const res = await fetch('/api/notifications/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to send broadcast.');
      }

      setMessage({ type: 'success', text: 'Broadcast sent successfully!' });
      resetForm();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-6">
      <div className="pb-2">
        <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-white', 'text-gray-900')}`}>
          Broadcast Center
        </h1>
        <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-gray-400', 'text-gray-500')}`}>
          Send announcements, alerts, and eco updates to users.
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? dk('bg-green-500/10 text-green-500 border border-green-500/20', 'bg-green-500/10 text-green-500 border border-green-500/20')
            : dk('bg-red-500/10 text-red-400 border border-red-500/20', 'bg-red-50 text-red-700 border border-red-200')
        }`}>
          {message.type === 'success' ? <HiCheckCircle className="h-5 w-5" /> : <HiBell className="h-5 w-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={card}>
          <p className={sectionTitle}>Message Content</p>
          <div className="grid gap-4">
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Notification Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Mega Cleanliness Drive this Sunday"
                className={inp}
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Description</label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Provide details about the announcement..."
                className={`${inp} resize-none`}
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Banner / Image</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start w-full">
                <label className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium cursor-pointer transition ${dk('border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800', 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  Upload image
                </label>
                {imagePreview && (
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm h-32 w-full sm:w-52 max-w-full">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black">
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {imageError && <p className="mt-2 text-xs text-red-500">{imageError}</p>}
            </div>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Configuration</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Status</label>
              <Dropdown name="status" value={formData.status} onChange={(e) => setField('status', e.target.value)} className={inp}>
                {['Active', 'Scheduled', 'Draft', 'Archived'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Dropdown>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Category</label>
              <Dropdown name="type" value={formData.type} onChange={(e) => setField('type', e.target.value)} className={inp}>
                {NOTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </Dropdown>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Priority</label>
              <Dropdown name="priority" value={formData.priority} onChange={(e) => setField('priority', e.target.value)} className={inp}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </Dropdown>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Target Audience</label>
              <Dropdown name="targetAudience" value={formData.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} className={inp}>
                {TARGET_AUDIENCES.map((audience) => <option key={audience} value={audience}>{audience}</option>)}
              </Dropdown>
            </div>
            {formData.targetAudience === 'Specific Community' && (
              <div>
                <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Village / Community Name</label>
                <input
                  type="text"
                  name="targetVillage"
                  value={formData.targetVillage}
                  onChange={(e) => setField('targetVillage', e.target.value)}
                  className={inp}
                  placeholder="e.g. Green Valley"
                />
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={sectionTitle}>Event Details (Optional)</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`text-xs font-bold ${dk('text-white', 'text-gray-900')}`}>Is this an Event?</span>
              <input
                type="checkbox"
                name="isEvent"
                checked={formData.isEvent}
                onChange={(e) => setField('isEvent', e.target.checked)}
                className="w-4 h-4 text-green-500 rounded-lg bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
              />
            </label>
          </div>

          {formData.isEvent && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border ${dk('bg-white/5 border-gray-800', 'bg-gray-50 border-gray-200')}`}>
              <div>
                <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Date</label>
                <div className="relative">
                  <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={(e) => setField('date', e.target.value)}
                    className={`${inp} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={(e) => setField('time', e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Venue</label>
                <div className="relative">
                  <HiLocationMarker className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={(e) => setField('venue', e.target.value)}
                    placeholder="Physical address or Zoom link"
                    className={`${inp} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-2 ${dk('text-gray-300', 'text-gray-700')}`}>Registration / Info Link</label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={(e) => setField('link', e.target.value)}
                  placeholder="https://..."
                  className={inp}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={resetForm} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 rounded-lg h-10 min-w-[140px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition">
            Reset
          </button>
          <button type="submit" disabled={loading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 rounded-lg h-10 min-w-[140px] bg-[#0BAF2A] text-white hover:bg-[#0aa020] transition shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
            <HiPaperAirplane className="rotate-90" /> {loading ? 'Broadcasting...' : 'Broadcast Update'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminNotifications;
