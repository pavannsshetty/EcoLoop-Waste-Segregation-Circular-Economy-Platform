import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiPencil, HiSave, HiLogout, HiLockClosed, HiBell, HiShieldCheck } from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';

import Female1 from '../assets/Avatar/Female1.png';
import Female2 from '../assets/Avatar/Female2.png';
import Female3 from '../assets/Avatar/Female3.png';
import Male1   from '../assets/Avatar/Male1.png';
import Male2   from '../assets/Avatar/Male2.png';
import Male3   from '../assets/Avatar/Male3.png';
import Male4   from '../assets/Avatar/Male4.jpeg';

const AVATARS = [Female1, Female2, Female3, Male1, Male2, Male3, Male4];

const BADGES = [
  { id: 'first',   label: 'First Report',    icon: '🗂️', desc: 'Submitted your first report',       earned: true  },
  { id: 'active',  label: 'Active Citizen',  icon: '🏙️', desc: 'Reported 5+ waste issues',          earned: true  },
  { id: 'eco',     label: 'Eco Contributor', icon: '🌿', desc: 'Contributed to 10+ cleanups',       earned: false },
  { id: 'weekly',  label: 'Weekly Reporter', icon: '📅', desc: 'Reported waste 4 weeks in a row',   earned: false },
];

const Toggle = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

const CitizenProfile = () => {
  const navigate = useNavigate();
  const stored   = JSON.parse(localStorage.getItem('user') || '{}');

  const [editing,  setEditing]  = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatar,   setAvatar]   = useState(stored.avatar || null);
  const [form,     setForm]     = useState({
    name:     stored.name     || '',
    email:    stored.email    || '',
    phone:    stored.phone    || '',
    address:  stored.address  || '',
    locality: stored.locality || '',
    city:     stored.city     || '',
    pincode:  stored.pincode  || '',
  });
  const [notifs, setNotifs] = useState({ reportUpdates: true, rewards: true, system: false });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg,  setPwMsg]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = () => {
    const updated = { ...stored, ...form, avatar };
    localStorage.setItem('user', JSON.stringify(updated));
    setEditing(false);
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (!pwForm.current) { setPwMsg('Enter current password.'); return; }
    if (pwForm.next.length < 8) { setPwMsg('New password must be 8+ characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    setPwMsg('Password updated successfully!');
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  const memberSince = stored.createdAt
    ? new Date(stored.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Recently joined';

  const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition disabled:bg-slate-50 disabled:text-slate-400';
  const lbl = 'text-xs font-medium text-slate-500 mb-1 block';

  return (
    <div className="min-h-screen bg-[#F4FBF6]" style={{ backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      <header className="h-16 bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
        <button onClick={() => navigate('/citizen')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition">
          <HiArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <EcoLoopLogo height={36} />
        <span className="ml-auto text-sm font-semibold text-slate-700">My Profile</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-6 sm:p-8 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-2xl overflow-hidden border-4 border-white/40 shadow-lg bg-white/20">
                {avatar
                  ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-white text-3xl font-bold">{(form.name || 'C')[0].toUpperCase()}</div>
                }
              </div>
              <button onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white text-green-600 shadow flex items-center justify-center hover:bg-green-50 transition">
                <HiPencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-extrabold text-white">{form.name || 'Citizen'}</h1>
              <p className="text-green-100 text-sm mt-0.5">Citizen · {form.city || 'Location not set'}</p>
              <p className="text-green-200 text-xs mt-1">Member since {memberSince}</p>
            </div>
            <button onClick={() => setEditing(e => !e)}
              className="shrink-0 flex items-center gap-2 bg-white text-green-700 text-sm font-semibold px-4 py-2 rounded-xl shadow hover:bg-green-50 transition active:scale-95">
              <HiPencil className="h-4 w-4" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Choose Avatar</p>
                <button onClick={() => setShowAvatarPicker(false)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map((src, i) => (
                  <button key={i} onClick={() => { setAvatar(src); setShowAvatarPicker(false); }}
                    className={`rounded-xl overflow-hidden border-2 transition hover:scale-105 ${avatar === src ? 'border-green-500' : 'border-transparent'}`}>
                    <img src={src} alt={`avatar-${i}`} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
              <button onClick={() => { setAvatar(null); setShowAvatarPicker(false); }}
                className="w-full text-xs text-slate-400 hover:text-red-400 transition">Remove photo</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Reports Submitted', value: 0,  color: 'text-green-600'  },
            { label: 'Resolved',          value: 0,  color: 'text-blue-600'   },
            { label: 'Eco Points',        value: 0,  color: 'text-yellow-600' },
            { label: 'Streak (days)',     value: 1,  color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center hover:shadow-md transition">
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Personal Information</h2>
            {editing && (
              <button onClick={saveProfile}
                className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-500 transition active:scale-95">
                <HiSave className="h-3.5 w-3.5" /> Save Changes
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { k: 'name',     label: 'Full Name',       placeholder: 'Your full name'    },
              { k: 'email',    label: 'Email',           placeholder: 'your@email.com'    },
              { k: 'phone',    label: 'Mobile Number',   placeholder: '10-digit number'   },
              { k: 'address',  label: 'Address',         placeholder: 'Street address'    },
              { k: 'locality', label: 'Area / Locality', placeholder: 'Your locality'     },
              { k: 'city',     label: 'City',            placeholder: 'City name'         },
              { k: 'pincode',  label: 'Pincode',         placeholder: '6-digit pincode'   },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="text" value={form[k]} onChange={e => set(k, e.target.value)}
                  placeholder={placeholder} disabled={!editing} className={inp} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Rewards & Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGES.map(b => (
              <div key={b.id} className={`rounded-xl border p-3 text-center space-y-1.5 transition ${b.earned ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <span className="text-2xl block">{b.icon}</span>
                <p className={`text-xs font-semibold ${b.earned ? 'text-green-700' : 'text-slate-500'}`}>{b.label}</p>
                <p className="text-xs text-slate-400 leading-snug">{b.desc}</p>
                {b.earned && <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Earned</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Your Impact</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Reports',    value: 0,  max: 50,  color: 'bg-green-500'  },
              { label: 'Resolved Reports', value: 0,  max: 50,  color: 'bg-blue-500'   },
              { label: 'Eco Score',        value: 0,  max: 100, color: 'bg-yellow-500' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{label}</span><span>{value}/{max}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${(value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Notification Preferences</h2>
          {[
            { k: 'reportUpdates', label: 'Report Updates',        sub: 'Get notified when your report status changes' },
            { k: 'rewards',       label: 'Rewards Notifications', sub: 'Earn points and badge alerts'                 },
            { k: 'system',        label: 'System Notifications',  sub: 'App updates and announcements'                },
          ].map(({ k, label, sub }) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
              <Toggle checked={notifs[k]} onChange={v => setNotifs(n => ({ ...n, [k]: v }))} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><HiShieldCheck className="h-4 w-4 text-green-500" /> Security</h2>
          <form onSubmit={changePassword} className="space-y-3">
            {[
              { k: 'current', label: 'Current Password', ph: '••••••••' },
              { k: 'next',    label: 'New Password',     ph: '8+ characters' },
              { k: 'confirm', label: 'Confirm Password', ph: 'Repeat new password' },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={ph} className={inp} />
              </div>
            ))}
            {pwMsg && <p className={`text-xs ${pwMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
            <button type="submit" className="flex items-center gap-2 bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-700 transition active:scale-95">
              <HiLockClosed className="h-4 w-4" /> Update Password
            </button>
          </form>
        </div>

        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-semibold py-3.5 text-sm hover:bg-red-100 transition active:scale-[0.98]">
          <HiLogout className="h-5 w-5" /> Sign Out
        </button>

      </main>
    </div>
  );
};

export default CitizenProfile;
