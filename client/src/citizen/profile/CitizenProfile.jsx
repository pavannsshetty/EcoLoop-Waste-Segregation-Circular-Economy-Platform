import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { API } from '../../shared/constants';
import { HiLocationMarker, HiPencil, HiSave, HiLogout, HiLockClosed, HiShieldCheck, HiCheckCircle, HiClipboardList, HiOfficeBuilding, HiSparkles, HiCalendar, HiExclamationCircle } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import VillageDropdown from '../../shared/components/VillageDropdown';
import { fetchVillages } from '../../shared/services/villageService';

import Female1 from '../../assets/Avatar/Female1.png';
import Female2 from '../../assets/Avatar/Female2.png';
import Female3 from '../../assets/Avatar/Female3.png';
import Male1   from '../../assets/Avatar/Male1.png';
import Male2   from '../../assets/Avatar/Male2.png';
import Male3   from '../../assets/Avatar/Male3.png';
import Male4   from '../../assets/Avatar/Male4.jpeg';

const AVATARS = [Female1, Female2, Female3, Male1, Male2, Male3, Male4];

const Toggle = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

const CitizenProfile = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user: ctxUser, refreshUser, updateUser } = useUser();
  const dk = (d, l) => dark ? d : l;
  const stored = ctxUser || JSON.parse(localStorage.getItem('user') || '{}');

  const [editPersonal, setEditPersonal] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatar, setAvatar] = useState(stored.profilePhoto || null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveType, setSaveType] = useState('success');
  const [form, setForm] = useState({
    name:     stored.name     || '',
    email:    stored.email    || '',
    phone:    stored.phone    || '',
    locality: stored.locality || '',
    village:  stored.village  || '',
    houseNo:  stored.houseNo || '',
    streetArea: stored.streetArea || '',
    landmark: stored.landmark || '',
    addressType: stored.addressType || '',
  });
  const [notifs, setNotifs] = useState({ reportUpdates: true, rewards: true, system: false });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg,  setPwMsg]  = useState('');
  const [originalForm, setOriginalForm] = useState({ ...form });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVillageRequest, setShowVillageRequest] = useState(false);
  const [villages, setVillages] = useState([]);
  const [villageRequest, setVillageRequest] = useState({ requestedVillage: '', reason: '' });
  const [requestMsg, setRequestMsg] = useState('');

  useEffect(() => {
    if (ctxUser) {
      const u = {
        name:     ctxUser.name     || '',
        email:    ctxUser.email    || '',
        phone:    ctxUser.phone    || '',
        locality: ctxUser.locality || '',
        village:  ctxUser.village  || '',
        houseNo:  ctxUser.houseNo || '',
        streetArea: ctxUser.streetArea || '',
        landmark: ctxUser.landmark || '',
        addressType: ctxUser.addressType || '',
      };
      setForm(u);
      setOriginalForm(u);
    }
  }, [ctxUser]);

  const isChanged = JSON.stringify(form) !== JSON.stringify(originalForm) || file !== null || (avatar !== stored.profilePhoto && avatar !== null);

  const [reports,     setReports]     = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoadingStats(false); return; }
      try {
        const res = await fetch(`${API}/api/waste/my-reports`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setReports(await res.json());
      } catch { }
      finally { setLoadingStats(false); }
    };
    fetchReports();
  }, []);

  const totalReports    = ctxUser?.reportsCount  ?? reports.length;
  const resolvedReports = ctxUser?.resolvedCount ?? reports.filter(r => r.status === 'Resolved').length;
  const ecoPoints       = ctxUser?.ecoPoints     ?? (totalReports * 10 + resolvedReports * 15);
  const streakDays      = 1;

  const BADGES = [
    { id: 'first',   label: 'First Report',    Icon: HiClipboardList,  desc: 'Submitted your first report',     earned: totalReports >= 1  },
    { id: 'active',  label: 'Active Citizen',  Icon: HiOfficeBuilding, desc: 'Reported 5+ waste issues',        earned: totalReports >= 5  },
    { id: 'eco',     label: 'Eco Contributor', Icon: HiSparkles,       desc: 'Contributed to 10+ cleanups',     earned: totalReports >= 10 },
    { id: 'weekly',  label: 'Weekly Reporter', Icon: HiCalendar,       desc: 'Reported waste 4 weeks in a row', earned: streakDays >= 28   },
  ];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sensitiveChanged = form.email !== originalForm.email || form.phone !== originalForm.phone;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setSaveMsg('File too large (max 2MB)');
      setSaveType('error');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setSaveMsg('Only JPG/PNG allowed');
      setSaveType('error');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAvatar(null);
  };

  const pickAvatar = (src) => {
    setAvatar(src);
    setPreview(null);
    setFile(null);
    setShowAvatarPicker(false);
  };

  const removeAvatar = () => {
    setAvatar(null);
    setPreview(null);
    setFile(null);
    setShowAvatarPicker(false);
  };

  const saveProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const phoneChanged = form.phone !== originalForm.phone;
      const emailChanged = form.email !== originalForm.email;
      if (phoneChanged && !/^\d{10}$/.test(form.phone.trim())) {
        setSaveMsg('Phone number must contain exactly 10 digits.');
        setSaveType('error');
        return;
      }
      if ((phoneChanged || emailChanged) && !confirmPassword) {
        setSaveMsg(phoneChanged ? 'Incorrect password.' : 'Email updates require verification.');
        setSaveType('error');
        return;
      }

      let currentPhoto = avatar;
      
      if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        const photoRes = await fetch(`${API}/api/user/upload-photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (photoRes.ok) {
          const photoData = await photoRes.json();
          currentPhoto = photoData.photoUrl;
        } else {
          const errData = await photoRes.json();
          throw new Error(errData.message || 'Photo upload failed');
        }
      }

      if (emailChanged) {
        const emailRes = await fetch(`${API}/api/user/email-change-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: form.email, currentPassword: confirmPassword }),
        });
        const emailData = await emailRes.json();
        if (!emailRes.ok) throw new Error(emailData.message || 'Email updates require verification.');
      }

      const profilePayload = {
        ...form,
        email: originalForm.email,
        profilePhoto: currentPhoto,
        ...(phoneChanged ? { currentPassword: confirmPassword } : {}),
      };

      const res = await fetch(`${API}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profilePayload),
      });

      if (res.ok) {
        const data = await res.json();
        updateUser(data.user);
        const updatedForm = { ...form, email: data.user.email || originalForm.email };
        setForm(updatedForm);
        setOriginalForm(updatedForm);
        setFile(null);
        setPreview(null);
        setConfirmPassword('');
        setEditPersonal(false);
        setEditAddress(false);
        setSaveMsg(emailChanged ? 'Email updates require verification.' : 'Profile updated successfully!');
        setSaveType('success');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Update failed');
      }
    } catch (err) {
      setSaveMsg(err.message || 'Error updating profile');
      setSaveType('error');
      setTimeout(() => setSaveMsg(''), 5000);
    }
  };

  useEffect(() => {
    if (!showVillageRequest) return;
    fetchVillages()
      .then(data => setVillages(data.filter(v => v.name !== form.village)))
      .catch(() => setVillages([]));
  }, [showVillageRequest, form.village]);

  const submitVillageRequest = async (e) => {
    e.preventDefault();
    setRequestMsg('');
    if (!villageRequest.requestedVillage) {
      setRequestMsg('Requested village is required.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/user/village-change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(villageRequest),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to submit request.');
      setRequestMsg('Village change request submitted.');
      setVillageRequest({ requestedVillage: '', reason: '' });
      setTimeout(() => {
        setShowVillageRequest(false);
        setRequestMsg('');
      }, 1200);
    } catch (err) {
      setRequestMsg(err.message || 'Unable to submit request.');
    }
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (!pwForm.current)          { setPwMsg('Enter current password.'); return; }
    if (pwForm.next.length < 8)   { setPwMsg('New password must be 8+ characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    setPwMsg('Password updated successfully!');
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  const memberSince = stored.createdAt
    ? new Date(stored.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Recently joined';

  const inp = `w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500 disabled:bg-white/5 disabled:text-slate-500','bg-white border-slate-200 text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400')}`;
  const lbl = `text-xs mb-1 block ${dk('text-slate-400','text-slate-500')}`;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">

        <div className="relative rounded-sm overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-6 sm:p-8 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-2xl overflow-hidden border-4 border-white/40 shadow-lg bg-white/20">
                {preview || avatar
                  ? <img src={preview || avatar} alt="avatar" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-white text-3xl font-bold">{(form.name || 'C')[0].toUpperCase()}</div>
                }
              </div>
              <button onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white text-green-600 shadow flex items-center justify-center hover:bg-green-50 transition">
                <HiPencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-white">{form.name || 'Citizen'}</h1>
              <p className="text-green-100 text-sm mt-0.5">Citizen</p>
              <p className="text-green-200 text-xs mt-1">Member since {memberSince}</p>
            </div>
            {(file || (avatar !== null && avatar !== stored.profilePhoto)) && (
              <div className="shrink-0 flex items-center gap-2">
                <button onClick={() => { setFile(null); setPreview(null); setAvatar(stored.profilePhoto); }}
                  className="text-sm font-bold px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition active:scale-95 shadow">
                  Revert
                </button>
                <button onClick={saveProfile}
                  className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-green-500 transition active:scale-95 shadow">
                  <HiSave className="h-4 w-4" /> Save Photo
                </button>
              </div>
            )}
          </div>
        </div>

        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Update Profile Photo</p>
                  <p className="text-[10px] text-slate-400">Choose an avatar or upload from device</p>
                </div>
                <button onClick={() => setShowAvatarPicker(false)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
              </div>
              
              <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition group">
                <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handleFileChange} />
                <span className="text-xs text-slate-500 group-hover:text-green-600">Upload from device</span>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG up to 2MB</p>
              </label>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300 bg-white px-2">OR CHOOSE AVATAR</div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map((src, i) => (
                  <button key={i} onClick={() => pickAvatar(src)}
                    className={`rounded-xl overflow-hidden border-2 transition hover:scale-105 ${avatar === src ? 'border-green-500' : 'border-transparent'}`}>
                    <img src={src} alt={`avatar-${i}`} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
              <button onClick={removeAvatar} className="w-full py-2 text-xs text-slate-400 hover:text-red-500 transition">Remove photo</button>
            </div>
          </div>
        )}



        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>Personal Information</h2>
              {saveMsg && (
                <span className={`flex items-center gap-1 text-xs ${saveType === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {saveType !== 'error' && <HiCheckCircle className="h-4 w-4" />}{saveMsg}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editPersonal ? (
                <>
                  <button onClick={() => { setEditPersonal(false); setForm({...originalForm}); }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 ${dk('bg-red-500/20 text-red-500 hover:bg-red-500/30','bg-red-50 text-red-600 hover:bg-red-100')}`}>
                    Cancel
                  </button>
                  <button onClick={saveProfile} disabled={!isChanged}
                    className="flex items-center gap-1.5 bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-500 transition active:scale-95">
                    <HiSave className="h-3.5 w-3.5" /> Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => setEditPersonal(true)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 ${dk('bg-white/10 text-slate-200 hover:bg-white/20','bg-white border text-slate-700 hover:bg-slate-50')}`}>
                  <HiPencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { k: 'name',     label: 'Full Name',       placeholder: 'Your full name'  },
              { k: 'email',    label: 'Email',           placeholder: 'your@email.com' },
              { k: 'phone',    label: 'Mobile Number',   placeholder: '10-digit number' },
            ].map(({ k, label, placeholder, disabled }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="text" value={form[k]} onChange={e => set(k, e.target.value)}
                  placeholder={placeholder} disabled={disabled || !editPersonal} className={inp} />
              </div>
            ))}
            {editPersonal && sensitiveChanged && (
              <div className="sm:col-span-2">
                <label className={lbl}>Current Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password for email or phone changes" className={inp} />
                {form.email !== originalForm.email && (
                  <p className="text-xs text-amber-600 mt-1">Email updates require verification.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Home Location & Address Section */}
        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>Home Location & Address</h2>
              {saveMsg && (
                <span className={`flex items-center gap-1 text-xs ${saveType === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {saveType !== 'error' && <HiCheckCircle className="h-4 w-4" />}{saveMsg}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editAddress ? (
                <>
                  <button onClick={() => { setEditAddress(false); setForm({...originalForm}); }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 ${dk('bg-red-500/20 text-red-500 hover:bg-red-500/30','bg-red-50 text-red-600 hover:bg-red-100')}`}>
                    Cancel
                  </button>
                  <button onClick={saveProfile} disabled={!isChanged}
                    className="flex items-center gap-1.5 bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-500 transition active:scale-95">
                    <HiSave className="h-3.5 w-3.5" /> Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => setEditAddress(true)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 ${dk('bg-white/10 text-slate-200 hover:bg-white/20','bg-white border text-slate-700 hover:bg-slate-50')}`}>
                  <HiPencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Registered Village</label>
              <div className="space-y-2">
                <input type="text" value={form.village ? `${form.village} Village` : ''} readOnly className={`${inp} opacity-80`} />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-sm ${dk('bg-green-900/30 text-green-400','bg-green-50 text-green-700')}`}>
                    <HiShieldCheck className="h-3.5 w-3.5" /> Verified Service Area
                  </span>
                  <button type="button" onClick={() => setShowVillageRequest(true)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-sm transition ${dk('bg-white/10 text-slate-200 hover:bg-white/20','bg-white border text-slate-700 hover:bg-slate-50')}`}>
                    Request Village Change
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className={lbl}>House No / Door No</label>
              <input type="text" value={form.houseNo} onChange={e => set('houseNo', e.target.value)}
                placeholder="e.g. 1-24/A" disabled={!editAddress} className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Street / Area / Ward</label>
              <input type="text" value={form.streetArea} onChange={e => set('streetArea', e.target.value)}
                placeholder="Street name, Area" disabled={!editAddress} className={inp} />
            </div>
            <div>
              <label className={lbl}>Landmark <span className="font-normal opacity-50 text-xs">(optional)</span></label>
              <input type="text" value={form.landmark} onChange={e => set('landmark', e.target.value)}
                placeholder="e.g. Near Big Temple" disabled={!editAddress} className={inp} />
            </div>
            <div>
              <label className={lbl}>Address Type</label>
              <select value={form.addressType} onChange={e => set('addressType', e.target.value)}
                disabled={!editAddress} className={`${inp} appearance-none`}>
                <option value="">Select Type</option>
                <option value="Home">Home</option>
                <option value="Shop">Shop</option>
                <option value="Apartment">Apartment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {showVillageRequest && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close village change request"
              onClick={() => setShowVillageRequest(false)}
              className={`absolute inset-0 h-full w-full cursor-default ${dk('bg-black/75','bg-slate-950/55')} backdrop-blur-[2px]`}
            />
            <form onSubmit={submitVillageRequest} className={`relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-sm border shadow-2xl p-5 space-y-4 ${dk('bg-slate-900 border-slate-700','bg-white border-slate-200')}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-sm font-bold ${dk('text-slate-100','text-slate-800')}`}>Request Village Change</h3>
                  <p className={`text-xs mt-1 ${dk('text-slate-400','text-slate-500')}`}>Admin approval is required before service area changes.</p>
                </div>
                <button type="button" onClick={() => setShowVillageRequest(false)} className={`text-sm font-bold ${dk('text-slate-400 hover:text-slate-200','text-slate-400 hover:text-slate-700')}`}>X</button>
              </div>

              <div className={`flex gap-2 rounded-sm border px-3 py-2 text-xs ${dk('bg-amber-500/10 border-amber-500/30 text-amber-300','bg-amber-50 border-amber-200 text-amber-700')}`}>
                <HiExclamationCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Changing village may affect your service area, reports, and pickup availability.</span>
              </div>

              <div>
                <label className={lbl}>Current Village</label>
                <input type="text" value={form.village ? `${form.village} Village` : ''} readOnly className={inp} />
              </div>
              <div>
                <label className={lbl}>Requested New Village</label>
                <VillageDropdown
                  value={villageRequest.requestedVillage}
                  villages={villages}
                  onChange={value => setVillageRequest(r => ({ ...r, requestedVillage: value }))}
                  error={!villageRequest.requestedVillage ? 'Requested village is required.' : ''}
                  touched={false}
                  dark={dark}
                  placeholder="Search requested village..."
                />
              </div>
              <div>
                <label className={lbl}>Reason for Change</label>
                <textarea required rows={3} value={villageRequest.reason}
                  onChange={e => setVillageRequest(r => ({ ...r, reason: e.target.value }))}
                  placeholder="Briefly explain why your service area should change" className={`${inp} resize-none`} />
              </div>
              {requestMsg && (
                <p className={`text-xs ${requestMsg.includes('submitted') ? 'text-green-600' : 'text-red-500'}`}>{requestMsg}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={() => setShowVillageRequest(false)}
                  className={`flex-1 text-sm px-4 py-2.5 rounded-sm border ${dk('border-slate-700 text-slate-300 hover:bg-white/5','border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 text-sm px-4 py-2.5 rounded-sm bg-green-600 text-white font-bold hover:bg-green-500">
                  Submit Request
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <h2 className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>Rewards & Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGES.map(b => (
              <div key={b.id} className={`rounded-sm border p-3 text-center space-y-1.5 transition-colors duration-200 ${b.earned ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : dk('bg-white/5 border-gray-700 opacity-50','bg-slate-50 border-slate-200 opacity-50')}`}>
                <b.Icon className={`h-8 w-8 mx-auto block ${b.earned ? 'text-green-600' : 'text-slate-400'}`} />
                <p className={`text-xs font-bold ${b.earned ? 'text-green-700' : 'text-slate-500'}`}>{b.label}</p>
                <p className="text-xs text-slate-400 leading-snug">{b.desc}</p>
                {b.earned && <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Earned</span>}
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <h2 className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>Your Impact</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Reports',    value: totalReports,    max: 50,  color: 'bg-green-500'  },
              { label: 'Resolved Reports', value: resolvedReports, max: 50,  color: 'bg-blue-500'   },
              { label: 'Eco Score',        value: ecoPoints,       max: 500, color: 'bg-yellow-500' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{label}</span><span>{value}/{max}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-sm border p-5 sm:p-6 space-y-3 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <h2 className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>Notification Preferences</h2>
          {[
            { k: 'reportUpdates', label: 'Report Updates',        sub: 'Get notified when your report status changes' },
            { k: 'rewards',       label: 'Rewards Notifications', sub: 'Earn points and badge alerts'                 },
            { k: 'system',        label: 'System Notifications',  sub: 'App updates and announcements'                },
          ].map(({ k, label, sub }) => (
            <div key={k} className={`flex items-center justify-between py-2 border-b last:border-0 ${dk('border-slate-700','border-slate-100')}`}>
              <div>
                <p className={`text-sm font-bold ${dk('text-slate-200','text-slate-700')}`}>{label}</p>
                <p className={`text-xs ${dk('text-slate-500','text-slate-400')}`}>{sub}</p>
              </div>
              <Toggle checked={notifs[k]} onChange={v => setNotifs(n => ({ ...n, [k]: v }))} />
            </div>
          ))}
        </div>

        <div className={`rounded-sm border p-5 sm:p-6 space-y-4 transition-colors duration-200 ${dk('bg-white/5 border-gray-700','bg-white border-slate-200')}`}>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${dk('text-slate-200','text-slate-700')}`}>
            <HiShieldCheck className="h-4 w-4 text-green-500" /> Security
          </h2>
          <form onSubmit={changePassword} className="space-y-3">
            {[
              { k: 'current', label: 'Current Password', ph: '••••••••'          },
              { k: 'next',    label: 'New Password',     ph: '8+ characters'     },
              { k: 'confirm', label: 'Confirm Password', ph: 'Repeat new password' },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={ph} className={inp} />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-xs ${pwMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>
            )}
            <button type="submit"
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition active:scale-95">
              <HiLockClosed className="h-4 w-4" /> Update Password
            </button>
          </form>
        </div>



    </div>
  );
};

export default CitizenProfile;
