import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { HiMoon, HiSun, HiOutlineSave, HiCheckCircle } from 'react-icons/hi';
import Dropdown from '../components/Dropdown';

const Settings = () => {
  const { dark, toggleDark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    appName: 'EcoLoop Admin Portal',
    emailNotifications: true,
    smsNotifications: false,
    reportAutoAssign: false,
    language: 'English',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 800);
  };

  const card = dk('bg-white/5 rounded-lg border border-gray-700 p-6 space-y-6', 'bg-white rounded-lg border border-slate-100 p-6 space-y-6 shadow-sm');
  const sectionTitle = dk('text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2', 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2');
  const inp = dk(
    'w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition',
    'w-full max-w-md rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition shadow-sm'
  );
  const toggleTrack = (checked) => `w-11 h-6 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-green-500' : dk('bg-slate-700', 'bg-slate-300')}`;
  const toggleThumb = (checked) => `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`;

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 max-w-4xl space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Portal Settings</h1>
        <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage your administrative preferences and system automation</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500 border border-green-500 px-4 py-3 text-sm text-green-500">
          <HiCheckCircle className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className={`rounded-lg border shadow-sm p-6 space-y-6 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
          <h2 className="section-title">General Preferences</h2>
          
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${dk('text-slate-400', 'text-slate-600')}`}>Platform Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.appName} onChange={e => setForm({...form, appName: e.target.value})} className={inp} required />
          </div>

          <div>
             <label className={`block text-xs font-medium mb-1.5 ${dk('text-slate-400', 'text-slate-600')}`}>System Language</label>
             <Dropdown value={form.language} onChange={e => setForm({...form, language: e.target.value})} className={inp}>
               <option>English</option>
               <option>Kannada</option>
               <option>Hindi</option>
             </Dropdown>
          </div>
          
          <div className="flex items-center justify-between max-w-md pt-2 flex-wrap gap-3">
            <div>
              <p className={`text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>Theme Mode</p>
              <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>Toggle between dark and light appearance</p>
            </div>
            <button type="button" onClick={toggleDark} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-300 text-slate-600 hover:bg-slate-50')}`}>
              {dark ? <><HiMoon/> Dark</> : <><HiSun/> Light</>}
            </button>
          </div>
        </div>

        <div className={`rounded-lg border shadow-sm p-6 space-y-6 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
           <h2 className="section-title">Notifications & Automation</h2>
           
           <div className="space-y-5 max-w-md">
             <div className="flex items-center justify-between cursor-pointer" onClick={() => setForm({...form, emailNotifications: !form.emailNotifications})}>
               <div>
                  <p className={`text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>Email Alerts</p>
                  <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>Receive admin summary reports via email</p>
               </div>
               <div className={toggleTrack(form.emailNotifications)}><div className={toggleThumb(form.emailNotifications)} /></div>
             </div>

             <div className="flex items-center justify-between cursor-pointer" onClick={() => setForm({...form, smsNotifications: !form.smsNotifications})}>
               <div>
                  <p className={`text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>SMS Alerts</p>
                  <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>Get SMS on severe report escalations</p>
               </div>
               <div className={toggleTrack(form.smsNotifications)}><div className={toggleThumb(form.smsNotifications)} /></div>
             </div>

             <div className="flex items-center justify-between cursor-pointer" onClick={() => setForm({...form, reportAutoAssign: !form.reportAutoAssign})}>
               <div>
                  <p className={`text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>Auto-assign Reports</p>
                  <p className={`text-xs mt-0.5 ${dk('text-slate-500', 'text-slate-500')}`}>Automatically route reports to nearest active collector</p>
               </div>
               <div className={toggleTrack(form.reportAutoAssign)}><div className={toggleThumb(form.reportAutoAssign)} /></div>
             </div>
           </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
           <button type="button" onClick={() => window.location.reload()} className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
             Cancel
           </button>
           <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60">
             {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <HiOutlineSave className="w-5 h-5" />}
             Save Changes
           </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
