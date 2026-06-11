import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { apiUrl } from '../utils/api';
import { HiMoon, HiSun, HiExclamation, HiCheckCircle, HiXCircle, HiClock, HiEye, HiEyeOff } from 'react-icons/hi';

const DELETION_REASONS = [
  'No longer using EcoLoop',
  'Created duplicate account',
  'Privacy concerns',
  'Moving out of service area',
  'Too many notifications',
  'Difficult to use',
  'Found an alternative service',
  'Other',
];

const Toggle = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const Settings = ({ hideAccountDeletion }) => {
  const { dark, setDarkMode } = useTheme();

  const card    = dark ? 'bg-white/5 border-gray-700' : 'bg-white border-slate-100';
  const title   = dark ? 'text-slate-200' : 'text-slate-800';
  const sub     = dark ? 'text-slate-400' : 'text-slate-500';
  const divider = dark ? 'border-gray-800' : 'border-slate-50';

  const [deletionRequest, setDeletionRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchDeletionRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/user/account-deletion-status'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeletionRequest(data.request || null);
      }
    } catch {} finally {
      setLoadingRequest(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletionRequest();
  }, [fetchDeletionRequest]);

  const openConfirm = () => {
    setShowConfirm(true);
    setPassword('');
    setShowPassword(false);
    setDeletionReason('');
    setCustomReason('');
    setFieldErrors({});
  };

  const closeConfirm = () => {
    setShowConfirm(false);
    setPassword('');
    setShowPassword(false);
    setDeletionReason('');
    setCustomReason('');
    setFieldErrors({});
  };

  const submitDeletionRequest = async () => {
    setMessage('');
    const errors = {};
    if (!password) errors.password = 'Enter your password to confirm.';
    if (!deletionReason) errors.deletionReason = 'Select a reason for deletion.';
    if (deletionReason === 'Other' && !customReason.trim()) errors.customReason = 'Please provide additional details.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/user/account-deletion-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: password,
          deletionReason,
          customReason: deletionReason === 'Other' ? customReason.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request.');
      setMessage('Account deletion request submitted successfully.');
      setMessageType('success');
      setShowConfirm(false);
      setPassword('');
      setDeletionReason('');
      setCustomReason('');
      fetchDeletionRequest();
    } catch (err) {
      setMessage(err.message || 'Failed to submit request.');
      setMessageType('error');
    }
  };

  const deletionStatusBadge = () => {
    if (!deletionRequest) return null;
    const s = deletionRequest.status;
    if (s === 'Approved') return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-900/40 text-green-400"><HiCheckCircle className="h-3.5 w-3.5" /> Approved</span>;
    if (s === 'Rejected') return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-900/40 text-red-400"><HiXCircle className="h-3.5 w-3.5" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-900/40 text-amber-300"><HiClock className="h-3.5 w-3.5" /> Pending</span>;
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${dark ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`;

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className={`text-lg font-bold tracking-tight ${title}`}>Settings</h1>
        <p className={`text-sm font-medium mt-0.5 ${sub}`}>Manage your preferences</p>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-2 text-sm ${messageType === 'error' ? dark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700' : dark ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className={`rounded-lg border shadow-sm overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b ${divider}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Appearance</p>
        </div>

        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${dark ? 'bg-yellow-900/40 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
              {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${title}`}>Dark Mode</p>
              <p className={`text-xs ${sub}`}>Switch between light and dark theme</p>
            </div>
          </div>
          <Toggle checked={dark} onChange={setDarkMode} />
        </div>

        <div className={`px-5 py-4 ${sub} text-xs`}>
          You can also toggle dark mode using the theme icon in the top header.
        </div>
      </div>

      {!hideAccountDeletion && (
      <div className={`rounded-lg border shadow-sm overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b ${divider}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Account</p>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}`}>
                <HiExclamation className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${title}`}>Request Account Deletion</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Permanently deactivate your account. An admin must approve this request.</p>
                {deletionRequest && (
                  <p className={`text-xs mt-2 flex items-center gap-1.5 ${sub}`}>
                    Status: {deletionStatusBadge()}
                    {deletionRequest.adminNote && <span className="ml-1">({deletionRequest.adminNote})</span>}
                  </p>
                )}
              </div>
            </div>
            {!loadingRequest && !deletionRequest && (
              <button type="button" onClick={openConfirm}
                className="shrink-0 rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:bg-red-500">
                Request Deletion
              </button>
            )}
            {!loadingRequest && deletionRequest && deletionRequest.status === 'Rejected' && (
              <button type="button" onClick={openConfirm}
                className="shrink-0 rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:bg-red-500">
                Request Again
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {!hideAccountDeletion && showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-lg border shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={`text-sm font-bold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>Confirm Account Deletion</h2>
              <button type="button" onClick={closeConfirm} className={dark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}>x</button>
            </div>

            <div className={`rounded-lg border p-3 text-xs space-y-1 ${dark ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <p className="font-semibold">⚠ Important</p>
              <p>Your account will be deactivated and sent for administrator review. You may not be able to access certain services while the request is under review.</p>
            </div>

            <div>
              <p className={`text-xs font-semibold mb-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Reason for Deletion <span className="text-red-500">*</span></p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {DELETION_REASONS.map((reason) => (
                  <label key={reason} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} ${deletionReason === reason ? dark ? 'bg-green-900/20 ring-1 ring-green-700' : 'bg-green-50 ring-1 ring-green-300' : ''}`}>
                    <input type="radio" name="deletionReason" value={reason} checked={deletionReason === reason}
                      onChange={(e) => { setDeletionReason(e.target.value); setFieldErrors((prev) => ({ ...prev, deletionReason: '' })); }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500" />
                    <span className={`text-sm ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{reason}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.deletionReason && <p className="text-xs text-red-500 mt-1">{fieldErrors.deletionReason}</p>}
            </div>

            {deletionReason === 'Other' && (
              <div>
                <p className={`text-xs font-semibold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Additional Details <span className="text-red-500">*</span></p>
                <textarea value={customReason} onChange={(e) => { setCustomReason(e.target.value); setFieldErrors((prev) => ({ ...prev, customReason: '' })); }}
                  placeholder="Please tell us why you want to delete your account..."
                  rows={3} className={`${inputCls} resize-none`} />
                {fieldErrors.customReason && <p className="text-xs text-red-500 mt-1">{fieldErrors.customReason}</p>}
              </div>
            )}

            <div>
              <p className={`text-xs font-semibold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Confirm Password <span className="text-red-500">*</span></p>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                  placeholder="Enter your password" className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} tabIndex={-1}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                  {showPassword ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button type="button" onClick={closeConfirm}
                className={`flex-1 rounded-lg border text-sm font-semibold px-4 py-2.5 ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
              <button type="button" onClick={submitDeletionRequest}
                className="flex-1 rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-red-500">Confirm Deletion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;