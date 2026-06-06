import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiUrl } from '../utils/api';
import VillageDropdown from './VillageDropdown';
import { fetchVillages } from '../services/villageService';
import {
  HiX, HiUser, HiMail, HiPhone, HiLockClosed,
  HiIdentification, HiEye, HiEyeOff, HiCheckCircle, HiXCircle,
  HiArrowLeft, HiSparkles, HiUserGroup, HiLocationMarker,
  HiInformationCircle, HiClipboardCopy, HiLogin, HiDocumentText,
  HiSearch, HiClock,
} from 'react-icons/hi';

const validators = {
  email: v => {
    if (!v) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    if (!v.endsWith('@gmail.com')) return 'Only gmail.com addresses are allowed';
    return '';
  },
  mobile: v => {
    if (!v) return 'Mobile number is required';
    if (!/^\d+$/.test(v)) return 'Only numbers allowed';
    if (v.length !== 10) return 'Mobile number must be 10 digits';
    if (!/^[6-9]\d{9}$/.test(v)) return 'Invalid mobile number. Must be 10 digits and start with 6-9.';
    return '';
  },
  password: v => (!v ? 'Password is required' : ''),
  confirmPassword: (v, pwd) => {
    if (!v) return 'Please confirm your password';
    if (v !== pwd) return 'Passwords do not match';
    return '';
  },
  fullName: v => (!v ? 'Full name is required' : ''),
  gcId: v => (!v ? 'Green Champion ID is required' : ''),
};

const pwdRules = [
  { label: '8 characters',      test: v => v.length >= 8 },
  { label: 'Uppercase letter',  test: v => /[A-Z]/.test(v) },
  { label: 'Lowercase letter',  test: v => /[a-z]/.test(v) },
  { label: 'Number',            test: v => /\d/.test(v) },
  { label: 'Special character', test: v => /[^A-Za-z0-9]/.test(v) },
];

const getStrength = v => {
  const n = pwdRules.filter(r => r.test(v)).length;
  if (n <= 2) return { label: 'Weak',   color: 'bg-red-500',    width: 'w-1/3' };
  if (n <= 4) return { label: 'Medium', color: 'bg-yellow-400', width: 'w-2/3' };
  return       { label: 'Strong',  color: 'bg-green-500',  width: 'w-full' };
};

const InputField = ({ id, label, type = 'text', placeholder, icon: Icon, value = '', onChange, onBlur, error, touched, maxLength, dark, disabled }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;
  const hasError   = touched && error;
  const isOk       = touched && !error && value;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</label>
      <div className="relative">
        {Icon && (
          <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder || (isPassword ? '••••••••' : '')}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete={isPassword ? 'new-password' : 'off'}
          className={[
            'w-full rounded-lg border py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2',
            dark ? 'bg-white/5 text-slate-100 placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400',
            Icon ? 'pl-9' : 'px-3.5',
            isPassword ? 'pr-10' : 'pr-3.5',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : isOk
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
                : dark
                  ? 'border-gray-700 focus:border-green-500 focus:ring-green-500/30'
                  : 'border-slate-300 focus:border-green-500 focus:ring-green-500/30',
          ].join(' ')}
        />
        {isPassword && (
          <button type="button" tabIndex={-1} onClick={() => setShow(s => !s)}
            className={`absolute inset-y-0 right-3 flex items-center transition ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hasError && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
};

const PasswordStrength = ({ value, dark }) => {
  if (!value) return null;
  const s = getStrength(value);
  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-1.5 rounded-lg overflow-hidden ${dark ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-lg transition-all duration-300 ${s.color} ${s.width}`} />
        </div>
        <span className={`text-xs font-medium ${s.label === 'Weak' ? 'text-red-400' : s.label === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
          {s.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {pwdRules.map(rule => {
          const ok = rule.test(value);
          return (
            <div key={rule.label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-400' : dark ? 'text-slate-500' : 'text-slate-400'}`}>
              {ok ? <HiCheckCircle className="h-3.5 w-3.5 shrink-0" /> : <HiXCircle className="h-3.5 w-3.5 shrink-0" />}
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ROLES_CARDS = [
  { key: 'login',    icon: HiLogin,       label: 'Green Champion Login',       desc: 'Access your Green Champion dashboard' },
  { key: 'apply',    icon: HiDocumentText, label: 'Request to Become',          desc: 'Submit a new Green Champion application' },
  { key: 'status',   icon: HiSearch,       label: 'Request Status',             desc: 'Check your application status' },
];

const initFields = () => ({ fullName: '', gender: '', email: '', mobile: '', village: '', reason: '', otherReason: '', idProofType: '', otherIdProofType: '', profilePhoto: null, idProof: null, profilePhotoPreview: '', idProofPreview: '', gcId: '', password: '', confirmPassword: '', identifier: '', requestId: '' });
const initTouched = () => ({ fullName: false, gender: false, email: false, mobile: false, village: false, reason: false, idProofType: false, profilePhoto: false, idProof: false, gcId: false, password: false, confirmPassword: false, identifier: false, requestId: false });

const GreenChampionModal = ({ isOpen, onClose, onChangeRole, toast, dark = false }) => {
  const navigate = useNavigate();
  const { user, refreshUser, updateUser } = useUser();
  const isCitizenUser = user?.role?.toLowerCase().replace('_', '') === 'citizen';
  const [screen, setScreen] = useState('main');
  const [fields, setFields] = useState(initFields());
  const [touched, setTouched] = useState(initTouched());
  const [loading, setLoading] = useState(false);
  const [loginToken, setLoginToken] = useState(null);
  const [villages, setVillages] = useState([]);
  const [requestData, setRequestData] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [dupErrors, setDupErrors] = useState({});
  const [dupChecking, setDupChecking] = useState({});
  const [dupData, setDupData] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchVillages()
        .then(data => setVillages(data))
        .catch(err => console.error('Error fetching villages:', err));
    }
  }, [isOpen]);

  const getErrors = useCallback(() => {
    const errs = {};
    if (screen === 'login' || screen === 'createPassword') {
      if (screen === 'login') errs.gcId = validators.gcId(fields.gcId);
      errs.password = validators.password(fields.password);
      if (screen === 'createPassword') errs.confirmPassword = validators.confirmPassword(fields.confirmPassword, fields.password);
    }
    if (screen === 'forgotPassword') {
      errs.gcId = validators.gcId(fields.gcId);
      errs.email = validators.email(fields.email);
      errs.password = validators.password(fields.password);
      errs.confirmPassword = validators.confirmPassword(fields.confirmPassword, fields.password);
    }
    if (screen === 'apply') {
      errs.fullName = validators.fullName(fields.fullName);
      errs.gender = !fields.gender ? 'Gender is required' : '';
      errs.email = validators.email(fields.email);
      errs.mobile = validators.mobile(fields.mobile);
      errs.village = !fields.village ? 'Village is required' : '';
      errs.idProofType = fields.idProofType ? '' : 'Please select ID proof type';
      errs.profilePhoto = !fields.profilePhoto ? 'Profile photo is required' : '';
      errs.idProof = !fields.idProof ? 'ID proof is required' : '';
    }
    if (screen === 'status') {
      errs.requestId = !fields.requestId.trim() ? 'Request ID is required' : '';
    }
    if (screen === 'forgotId') {
      errs.identifier = !fields.identifier.trim() ? 'Email or phone number is required' : '';
    }
    return errs;
  }, [screen, fields]);

  const errors = getErrors();

  const handleChange = field => e => {
    let val;
    if (field === 'mobile') {
      val = e.target.value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'profilePhoto' || field === 'idProof') {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const allowedTypes = field === 'profilePhoto' 
          ? ['image/jpeg', 'image/jpg', 'image/png']
          : ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const ext = file.name.split('.').pop().toLowerCase();
        const isValidExt = field === 'profilePhoto'
          ? ['jpg', 'jpeg', 'png'].includes(ext)
          : ['jpg', 'jpeg', 'png', 'pdf'].includes(ext);

        if (!allowedTypes.includes(file.type) && !isValidExt) {
          toast.error(
            field === 'profilePhoto'
              ? 'Only JPG, JPEG, and PNG files are allowed for Profile Photo.'
              : 'Only JPG, JPEG, PNG, and PDF files are allowed for ID Proof.'
          );
          return;
        }

        const previewKey = field === 'profilePhoto' ? 'profilePhotoPreview' : 'idProofPreview';
        const reader = new FileReader();
        reader.onloadend = () => setFields(f => ({ ...f, [field]: file, [previewKey]: reader.result }));
        reader.readAsDataURL(file);
      }
      return;
    } else {
      val = e.target.value;
    }
    setFields(f => ({ ...f, [field]: val }));
    setTouched(t => ({ ...t, [field]: true }));
    if (errors[field]) setDupErrors(de => ({ ...de, [field]: '' }));

    // Real-time duplicate check on email/mobile (apply screen only)
    if (screen === 'apply') {
      let shouldTrigger = false;
      if (field === 'email') {
        shouldTrigger = /^[^\s@]+@gmail\.com$/.test(val.toLowerCase().trim());
        if (!shouldTrigger) {
          setDupErrors(de => ({ ...de, email: '' }));
          setDupData(dd => ({ ...dd, email: null }));
        }
      } else if (field === 'mobile') {
        shouldTrigger = /^[6-9]\d{9}$/.test(val.trim());
        if (!shouldTrigger) {
          setDupErrors(de => ({ ...de, mobile: '' }));
          setDupData(dd => ({ ...dd, mobile: null }));
        }
      }

      if (shouldTrigger) {
        const checkField = field;
        const checkValue = field === 'email' ? val.toLowerCase().trim() : val.trim();
        const timeoutId = setTimeout(async () => {
          setDupChecking(d => ({ ...d, [checkField]: true }));
          try {
            const res = await fetch(apiUrl('/api/green-champion/check-duplicate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: checkField, value: checkValue })
            });
            const data = await res.json();
            if (!data.available) {
              setDupErrors(de => ({ ...de, [checkField]: data.message }));
              setDupData(dd => ({ ...dd, [checkField]: data }));
            } else {
              setDupErrors(de => ({ ...de, [checkField]: '' }));
              setDupData(dd => ({ ...dd, [checkField]: null }));
            }
          } catch { /* ignore */ }
          setDupChecking(d => ({ ...d, [checkField]: false }));
        }, 500);
        const key = `dup_${field}`;
        if (window[key]) clearTimeout(window[key]);
        window[key] = timeoutId;
      }
    }
  };

  const handleBlur = field => () => setTouched(t => ({ ...t, [field]: true }));


  const reset = (nextScreen) => {
    setScreen(nextScreen);
    setFields(initFields());
    setTouched(initTouched());
    setRequestData(null);
    setStatusError('');
    setDupErrors({});
    setDupData({});
    setLoading(false);
  };

  const handleClose = () => { reset('main'); onClose(); };

  const handleLogin = async e => {
    if (e) e.preventDefault();
    setTouched(t => ({ ...t, gcId: true, password: true }));
    if (errors.gcId || errors.password) { toast.error('Please enter your Green Champion ID and password.'); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'green_champion', identifier: fields.gcId.trim(), password: fields.password })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Invalid credentials.'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      updateUser(data.user);
      if (data.user.isFirstLogin) {
        setLoginToken(data.token);
        setScreen('createPassword');
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
        handleClose();
        navigate('/green-champion/dashboard');
      }
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCreatePassword = async e => {
    if (e) e.preventDefault();
    setTouched(t => ({ ...t, password: true, confirmPassword: true }));
    if (errors.password || errors.confirmPassword) { toast.error('Please fill all fields correctly.'); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/update-password'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginToken}` },
        body: JSON.stringify({ password: fields.password })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to update password.'); return; }
      toast.success('Password created successfully! Welcome to Green Champion dashboard.');
      handleClose();
      navigate('/green-champion/dashboard');
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async e => {
    if (e) e.preventDefault();
    setTouched(t => ({ ...t, gcId: true, email: true, password: true, confirmPassword: true }));
    if (errors.gcId || errors.email || errors.password || errors.confirmPassword) { toast.error('Please fill all fields correctly.'); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password-gc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greenChampionId: fields.gcId.trim(),
          email: fields.email.toLowerCase().trim(),
          password: fields.password
        })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to reset password.'); return; }
      toast.success('Password reset successfully! You can now log in.');
      reset('login');
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };


  const handleApply = async e => {
    if (e) e.preventDefault();
    if (isCitizenUser) {
      toast.error('Citizen accounts cannot apply to become Green Champions. Please log out and use the public application workflow.');
      return;
    }
    const errs = getErrors();
    setTouched(t => ({ ...t, fullName: true, gender: true, email: true, mobile: true, village: true, idProofType: true, profilePhoto: true, idProof: true }));
    if (Object.values(errs).some(Boolean) || Object.values(dupErrors).some(Boolean)) {
      toast.error('Please fill all required fields correctly.');
      return;
    }
    setLoading(true);
    try {
      const idProofTypeMapping = {
        'Aadhaar Card': 'Aadhar Card',
        'Voter ID': 'Voter ID',
        'Driving Licence': 'Driving License',
        'PAN Card': 'PAN Card',
      };
      const mappedIdProofType = idProofTypeMapping[fields.idProofType] || fields.idProofType;

      const formData = new FormData();
      formData.append('fullName', fields.fullName);
      if (fields.gender) formData.append('gender', fields.gender);
      formData.append('email', fields.email.toLowerCase().trim());
      formData.append('mobile', fields.mobile.trim());
      formData.append('village', fields.village);
      if (fields.reason) formData.append('reason', fields.reason);
      if (fields.reason === 'Other') formData.append('otherReason', fields.otherReason);
      formData.append('idProofType', mappedIdProofType);
      if (fields.idProofType === 'Other') formData.append('otherIdProofType', fields.otherIdProofType);
      formData.append('profilePhoto', fields.profilePhoto);
      formData.append('idProof', fields.idProof);

      const res = await fetch(apiUrl('/api/green-champion/apply'), { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Application failed.');
        if (data.requestId && data.status) {
          const fieldType = data.field || (data.message.includes('email') ? 'email' : 'mobile');
          setDupErrors(de => ({ ...de, [fieldType]: data.message }));
          setDupData(dd => ({
            ...dd,
            [fieldType]: {
              available: false,
              requestId: data.requestId,
              status: data.status,
              message: data.message
            }
          }));
        }
        return;
      }
      setRequestData({ requestId: data.requestId, status: data.status, submittedAt: new Date().toISOString() });
      setScreen('applicationSuccess');
      toast.success('Application submitted successfully!');
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCheckStatus = async e => {
    if (e && e.preventDefault) e.preventDefault();
    setTouched(t => ({ ...t, requestId: true }));
    const targetId = fields.requestId;
    if (!targetId || !targetId.trim()) { setStatusError('Please enter a Request ID'); return; }
    setLoading(true);
    setStatusError('');
    try {
      const res = await fetch(apiUrl(`/api/green-champion/status/${targetId.trim().toUpperCase()}`));
      const data = await res.json();
      if (!res.ok) { setStatusError(data.message || 'Failed to fetch status'); setRequestData(null); return; }
      setRequestData(data);
    } catch { setStatusError('Something went wrong. Please try again.'); setRequestData(null);
    } finally { setLoading(false); }
  };

  const handleTrackStatus = async (reqId) => {
    setFields(f => ({ ...f, requestId: reqId }));
    setScreen('status');
    setLoading(true);
    setStatusError('');
    try {
      const res = await fetch(apiUrl(`/api/green-champion/status/${reqId.trim().toUpperCase()}`));
      const data = await res.json();
      if (!res.ok) { setStatusError(data.message || 'Failed to fetch status'); setRequestData(null); return; }
      setRequestData(data);
    } catch { setStatusError('Something went wrong. Please try again.'); setRequestData(null);
    } finally { setLoading(false); }
  };

  const handleForgotId = async e => {
    if (e) e.preventDefault();
    setTouched(t => ({ ...t, identifier: true }));
    if (!fields.identifier.trim()) { toast.error('Please enter your email or mobile number'); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/green-champion/forgot-id'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fields.identifier.trim() })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to process request'); return; }
      toast.success('Request ID found!');
      await handleTrackStatus(data.requestId);
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };


  const fp = field => ({
    value: fields[field],
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    error: dupErrors[field] || errors[field],
    touched: touched[field],
    dark
  });

  const dlg     = dark ? 'bg-black/90 border border-gray-800 text-slate-100' : 'bg-white text-slate-900';
  const hdr     = dark ? 'border-gray-800' : 'border-slate-100';
  const muted   = dark ? 'text-slate-400' : 'text-slate-500';
  const closeBtn= dark ? 'text-slate-500 hover:bg-white/10 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';

  if (!isOpen) return null;

  const renderMain = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onChangeRole}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Change Role
        </button>
      </div>
      <div className="text-center space-y-2">
        <p className={`text-sm ${muted}`}>Welcome to the Green Champion program. Choose an option below.</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {isCitizenUser && (
          <div className={`rounded-lg border px-4 py-3 mb-3 ${dark ? 'bg-red-950/40 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <p className="text-sm font-medium">Citizen accounts cannot submit Green Champion applications.</p>
            <p className="text-xs text-slate-500">Log out of your Citizen account before applying through the public Green Champion workflow.</p>
          </div>
        )}
        {ROLES_CARDS.map(({ key, icon: Icon, label, desc }) => (
          <button key={key} type="button" onClick={() => {
            if (isCitizenUser && key === 'apply') {
              toast.error('Citizen accounts cannot apply to become Green Champions. Please log out and apply as a public user.');
              return;
            }
            reset(key);
          }}
            className={`flex items-center gap-4 rounded-lg border-2 px-4 py-4 text-left transition hover:border-green-500 hover:shadow-md group ${
              dark ? 'border-gray-700 bg-white/5 hover:bg-green-900/30' : 'border-slate-200 bg-white hover:bg-green-50'
            }`}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition ${
              dark ? 'bg-white/10 group-hover:bg-green-900' : 'bg-slate-100 group-hover:bg-green-100'
            }`}>
              <Icon className={`h-6 w-6 transition ${dark ? 'text-slate-400 group-hover:text-green-400' : 'text-slate-500 group-hover:text-green-600'}`} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className={`text-sm font-semibold ${dark ? 'text-slate-200 group-hover:text-green-400' : 'text-slate-800 group-hover:text-green-700'}`}>{label}</span>
              <span className={`text-xs ${dark ? 'text-slate-500 group-hover:text-green-500' : 'text-slate-400 group-hover:text-green-600'}`}>{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset('main')}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
      <div className="text-center space-y-1">
        <HiLogin className="h-8 w-8 text-green-500 mx-auto" />
        <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Green Champion Login</h3>
        <p className={`text-xs ${muted}`}>Enter your Green Champion ID and password</p>
      </div>
      <form onSubmit={handleLogin} noValidate autoComplete="off" className="space-y-4">
        <InputField id="gcId" label="Green Champion ID" placeholder="Enter your Green Champion ID" icon={HiIdentification} {...fp('gcId')} />
        <InputField id="gcPassword" label="Password" type="password" placeholder="Enter your password" icon={HiLockClosed} dark={dark}
          value={fields.password} onChange={handleChange('password')} onBlur={handleBlur('password')} error={errors.password} touched={touched.password} />
        <div className="flex justify-end">
          <button type="button" onClick={() => reset('forgotPassword')} className="text-sm font-medium text-green-500 hover:underline">Forgot password?</button>
        </div>
        <button type="submit" disabled={loading}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Login'}
        </button>
      </form>
    </div>
  );

  const renderCreatePassword = () => (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <HiLockClosed className="h-8 w-8 text-green-500 mx-auto" />
        <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Create Your Password</h3>
        <p className={`text-xs ${muted}`}>This is your first login. Please create a new password.</p>
      </div>
      <form onSubmit={handleCreatePassword} noValidate autoComplete="off" className="space-y-4">
        <div>
          <InputField id="newPassword" label="New Password" type="password" icon={HiLockClosed} dark={dark}
            value={fields.password} onChange={handleChange('password')} onBlur={handleBlur('password')} error={errors.password} touched={touched.password} />
          <PasswordStrength value={fields.password} dark={dark} />
        </div>
        <InputField id="confirmPassword" label="Confirm Password" type="password" placeholder="Re-enter your password" icon={HiLockClosed} dark={dark}
          value={fields.confirmPassword} onChange={handleChange('confirmPassword')} onBlur={handleBlur('confirmPassword')} error={errors.confirmPassword} touched={touched.confirmPassword} />
        <button type="submit" disabled={loading}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Create Password'}
        </button>
      </form>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset('login')}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </div>
      <div className="text-center space-y-1">
        <HiLockClosed className="h-8 w-8 text-green-500 mx-auto" />
        <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Reset Password</h3>
        <p className={`text-xs ${muted}`}>Enter your Green Champion ID and new password.</p>
      </div>
      <form onSubmit={handleForgotPassword} noValidate autoComplete="off" className="space-y-4">
        <InputField id="fgcId" label="Green Champion ID" placeholder="Enter your Green Champion ID" icon={HiIdentification} {...fp('gcId')} />
        <InputField id="fgcEmail" label="Registered Email" type="email" placeholder="Enter your registered email" icon={HiMail} {...fp('email')} />
        <div>
          <InputField id="fnewPassword" label="New Password" type="password" placeholder="Enter your new password" icon={HiLockClosed} dark={dark}
            value={fields.password} onChange={handleChange('password')} onBlur={handleBlur('password')} error={errors.password} touched={touched.password} />
          <PasswordStrength value={fields.password} dark={dark} />
        </div>
        <InputField id="fconfirmPassword" label="Confirm Password" type="password" placeholder="Re-enter your password" icon={HiLockClosed} dark={dark}
          value={fields.confirmPassword} onChange={handleChange('confirmPassword')} onBlur={handleBlur('confirmPassword')} error={errors.confirmPassword} touched={touched.confirmPassword} />
        <button type="submit" disabled={loading}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Reset Password'}
        </button>
      </form>
    </div>
  );


  const renderApply = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset('main')}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
      <div className="text-center space-y-1">
        <HiDocumentText className="h-8 w-8 text-green-500 mx-auto" />
        <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Request to Become a Green Champion</h3>
        <p className={`text-xs ${muted}`}>Fill in your details to apply for the Green Champion program.</p>
      </div>
      <form onSubmit={handleApply} noValidate autoComplete="off" className="space-y-4">
        <InputField id="gcFullName" label="Full Name" placeholder="Enter your full name" icon={HiUser} {...fp('fullName')} />

        <div className="flex flex-col gap-1">
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Gender</label>
          <div className="flex gap-3">
            {['Male', 'Female', 'Others'].map(g => (
              <label key={g} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer transition ${
                fields.gender === g
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : dark ? 'border-gray-700 text-slate-300 hover:border-gray-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'
              }`}>
                <input type="radio" value={g} checked={fields.gender === g}
                  onChange={e => { setFields(f => ({ ...f, gender: e.target.value })); setTouched(t => ({ ...t, gender: true })); }}
                  className="h-4 w-4 text-green-600 focus:ring-green-500" />
                {g}
              </label>
            ))}
          </div>
          {touched.gender && errors.gender && <p className="text-xs text-red-400 mt-0.5">{errors.gender}</p>}
        </div>

        <div className="relative">
          <InputField id="gcEmail" label="Email" type="email" placeholder="Enter your gmail address" icon={HiMail} {...fp('email')} />
          {dupChecking.email && <span className="absolute right-3 top-9"><svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg></span>}
          {dupData.email && dupData.email.available === false && dupData.email.requestId && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
              <span>Request ID: {dupData.email.requestId}</span>
              <button type="button" onClick={() => { setFields(f => ({ ...f, requestId: dupData.email.requestId })); setScreen('status'); }}
                className="font-medium text-green-500 hover:underline">Track Status</button>
            </div>
          )}
        </div>

        <InputField id="gcMobile" label="Mobile Number" type="tel" placeholder="Enter your phone number" icon={HiPhone} maxLength={10} dark={dark}
          value={fields.mobile} onChange={handleChange('mobile')} onBlur={handleBlur('mobile')} error={dupErrors.mobile || errors.mobile} touched={touched.mobile} />

        <div className="flex flex-col gap-1">
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Village</label>
          <VillageDropdown
            value={fields.village}
            villages={villages}
            onChange={v => { setFields(f => ({ ...f, village: v })); setTouched(t => ({ ...t, village: true })); }}
            error={errors.village} touched={touched.village} dark={dark}
          />
        </div>

        <div className="space-y-2">
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>ID Proof Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['Aadhaar Card', 'Voter ID', 'Driving Licence', 'PAN Card'].map(opt => (
              <label key={opt} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition ${
                fields.idProofType === opt
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : dark ? 'border-gray-700 text-slate-300 hover:border-gray-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'
              }`}>
                <input type="radio" value={opt} checked={fields.idProofType === opt}
                  onChange={e => { setFields(f => ({ ...f, idProofType: e.target.value })); setTouched(t => ({ ...t, idProofType: true })); }}
                  className="h-4 w-4 text-green-600 focus:ring-green-500" />
                <span className="text-xs">{opt}</span>
              </label>
            ))}
          </div>
          {touched.idProofType && errors.idProofType && <p className="text-xs text-red-400 mt-0.5">{errors.idProofType}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Profile Photo</label>
            <div className="flex flex-col items-center gap-2">
              {fields.profilePhotoPreview ? (
                <img src={fields.profilePhotoPreview} alt="profile" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50">
                  <HiUser className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <input type="file" accept="image/jpeg,image/jpg,image/png" id="gcProfilePhoto" className="hidden" onChange={handleChange('profilePhoto')} />
              <label htmlFor="gcProfilePhoto" className="text-xs font-medium text-green-600 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 cursor-pointer">Upload</label>
            </div>
            {touched.profilePhoto && errors.profilePhoto && <p className="text-xs text-red-400 mt-1">{errors.profilePhoto}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>ID Proof</label>
            <div className="flex flex-col items-center gap-2">
              {fields.idProofPreview ? (
                <img src={fields.idProofPreview} alt="id proof" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50">
                  <HiIdentification className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <input type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" id="gcIdProof" className="hidden" onChange={handleChange('idProof')} />
              <label htmlFor="gcIdProof" className="text-xs font-medium text-green-600 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 cursor-pointer">Upload</label>
            </div>
            {touched.idProof && errors.idProof && <p className="text-xs text-red-400 mt-1">{errors.idProof}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Motivation <span className={`text-xs ${muted}`}>(optional)</span></label>
          <div className="grid grid-cols-1 gap-2">
            {['Environmental Concern', 'Community Service', 'Learn About Recycling', 'Promote Clean Villages', 'Inspire Others', 'Other'].map(opt => (
              <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${
                fields.reason === opt
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : dark ? 'border-gray-700 text-slate-300 hover:border-gray-500' : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}>
                <input type="radio" value={opt} checked={fields.reason === opt}
                  onChange={e => setFields(f => ({ ...f, reason: e.target.value, otherReason: '' }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500" />
                {opt}
              </label>
            ))}
          </div>
          {fields.reason === 'Other' && (
            <input type="text" placeholder="Please specify your reason"
              value={fields.otherReason} onChange={e => setFields(f => ({ ...f, otherReason: e.target.value }))}
              className={`w-full rounded-lg border py-2.5 px-3.5 text-sm mt-2 ${dark ? 'bg-white/5 border-gray-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`} />
          )}
        </div>

        <button type="submit" disabled={loading}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Submit Application'}
        </button>
      </form>
    </div>
  );

  const renderApplicationSuccess = () => (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center h-14 w-14 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto">
        <HiCheckCircle className="h-8 w-8 text-green-500" />
      </div>
      <div className="space-y-2">
        <h3 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Application Submitted Successfully!</h3>
        <p className={`text-sm ${muted}`}>Thank you for applying to become a Green Champion. Your application is under review.</p>
      </div>
      <div className={`rounded-lg border p-5 space-y-3 ${dark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${dark ? 'text-green-400' : 'text-green-700'}`}>Request ID</span>
          <span className="font-mono text-sm font-bold text-green-600 bg-green-100 dark:bg-green-800 dark:text-green-300 px-2 py-1 rounded">{requestData?.requestId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${dark ? 'text-green-400' : 'text-green-700'}`}>Submitted Date</span>
          <span className={`text-sm ${dark ? 'text-green-300' : 'text-green-600'}`}>{new Date(requestData?.submittedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${dark ? 'text-green-400' : 'text-green-700'}`}>Status</span>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-700">Pending</span>
        </div>
      </div>
      <div className="space-y-3">
        <button type="button"
          onClick={() => { setFields(f => ({ ...f, requestId: requestData?.requestId || '' })); setScreen('status'); }}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95">
          Track Request Status
        </button>
        <button type="button"
          onClick={() => { navigator.clipboard.writeText(requestData?.requestId || ''); toast.success('Request ID copied!'); }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold border border-green-500 text-green-600 bg-transparent hover:bg-green-50 transition active:scale-95">
          <HiClipboardCopy className="h-4 w-4 inline-block mr-1" /> Copy Request ID
        </button>
        <button type="button" onClick={handleClose}
          className={`w-full rounded-lg px-4 py-3 text-sm font-bold border transition active:scale-95 ${
            dark ? 'border-gray-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}>
          Close
        </button>
      </div>
    </div>
  );

  const renderStatus = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset('main')}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {!requestData && !statusError && (
        <>
          <div className="text-center space-y-1">
            <HiSearch className="h-8 w-8 text-green-500 mx-auto" />
            <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Check Application Status</h3>
            <p className={`text-xs ${muted}`}>Enter your Request ID to check the current status.</p>
          </div>
          <form onSubmit={handleCheckStatus} noValidate className="space-y-4">
            <InputField id="statusReqId" label="Request ID" placeholder="Enter your Request ID (e.g., GCREQ2026001)" icon={HiIdentification} {...fp('requestId')} />
            {statusError && <p className="text-xs text-red-400">{statusError}</p>}
            <button type="submit" disabled={loading}
              style={{ backgroundColor: '#0EB02D' }}
              className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Check Status'}
            </button>
          </form>
          <div className="text-center">
            <button type="button" onClick={() => reset('forgotId')} className="text-sm font-medium text-green-500 hover:underline">
              Forgot Request ID?
            </button>
          </div>
        </>
      )}

      {statusError && !requestData && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
          <HiXCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{statusError}</span>
        </div>
      )}

      {requestData?.status === 'PENDING' && (
        <div className="text-center space-y-4">
          <HiClock className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className={`text-lg font-bold ${dark ? 'text-amber-300' : 'text-amber-600'}`}>Your application is PENDING review</h3>
          <p className={`text-sm ${muted}`}>Your application is under review. You will be notified once a decision is made.</p>
          <div className={`rounded-lg border p-4 space-y-2 ${dark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex justify-between text-sm"><span className="font-semibold">Request ID</span><span className="font-mono">{requestData.requestId}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold">Submitted On</span><span>{new Date(requestData.submittedAt).toLocaleDateString()}</span></div>
          </div>
          <button type="button" onClick={handleClose}
            className={`w-full rounded-lg px-4 py-3 text-sm font-bold border transition active:scale-95 ${
              dark ? 'border-gray-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}>Close</button>
        </div>
      )}

      {requestData?.status === 'APPROVED' && (
        <div className="text-center space-y-4">
          <HiCheckCircle className="h-10 w-10 text-green-500 mx-auto" />
          <h3 className={`text-lg font-bold text-green-600`}>Congratulations! Your application has been APPROVED</h3>
          <p className={`text-sm ${muted}`}>You are now a Green Champion! Use your Green Champion ID to log in.</p>
          <div className={`rounded-lg border p-4 space-y-2 ${dark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
            <div className="flex justify-between text-sm"><span className="font-semibold">Request ID</span><span className="font-mono">{requestData.requestId}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold">Green Champion ID</span><span className="font-mono font-bold text-green-600">{requestData.greenChampionId}</span></div>
          </div>
          <button type="button" onClick={() => { setFields(f => ({ ...f, gcId: requestData.greenChampionId })); setScreen('login'); }}
            style={{ backgroundColor: '#0EB02D' }}
            className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95">
            Proceed to Login
          </button>
        </div>
      )}

      {requestData?.status === 'REJECTED' && (
        <div className="text-center space-y-4">
          <HiXCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className={`text-lg font-bold text-red-600`}>Application Status: REJECTED</h3>
          {requestData.rejectionReason && (
            <div className={`rounded-lg border p-4 ${dark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm text-red-600">{requestData.rejectionReason}</p>
            </div>
          )}
          <p className={`text-sm ${muted}`}>You can submit a new application if you wish to reapply.</p>
          <button type="button" onClick={() => reset('apply')}
            style={{ backgroundColor: '#0EB02D' }}
            className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95">
            Submit New Application
          </button>
        </div>
      )}

      {requestData?.status === 'SUSPENDED' && (
        <div className="text-center space-y-4">
          <HiXCircle className="h-10 w-10 text-gray-500 mx-auto" />
          <h3 className={`text-lg font-bold text-gray-600`}>Account Suspended</h3>
          <p className="text-sm text-slate-500">This Green Champion account has been suspended. Please contact the administrator.</p>
          <button type="button" onClick={handleClose}
            className={`w-full rounded-lg px-4 py-3 text-sm font-bold border transition active:scale-95 ${
              dark ? 'border-gray-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}>Close</button>
        </div>
      )}
    </div>
  );

  const renderForgotId = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset('status')}
          className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
          <HiArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
      <div className="text-center space-y-1">
        <HiIdentification className="h-8 w-8 text-green-500 mx-auto" />
        <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Forgot Request ID</h3>
        <p className={`text-xs ${muted}`}>Enter the email or phone number you used when applying.</p>
      </div>
      <form onSubmit={handleForgotId} noValidate className="space-y-4">
        <InputField id="forgotIdInput" label="Email or Phone Number" placeholder="Enter your email or phone number" icon={HiMail} {...fp('identifier')} />
        <button type="submit" disabled={loading}
          style={{ backgroundColor: '#0EB02D' }}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span> : 'Retrieve Request ID'}
        </button>
      </form>
    </div>
  );

  const screenTitle = {
    main: 'Green Champion',
    login: 'Green Champion Login',
    createPassword: 'Create Password',
    forgotPassword: 'Reset Password',
    apply: 'Apply',
    applicationSuccess: 'Application Submitted',
    status: 'Request Status',
    forgotId: 'Forgot Request ID',
  }[screen];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className={`relative z-10 w-full sm:max-w-lg rounded-lg shadow-2xl ${dlg}`}>
        <div className={`flex items-center justify-between border-b px-4 sm:px-6 py-3.5 sm:py-4 ${hdr}`}>
          <div className="flex items-center gap-2">
            <HiSparkles className="h-5 w-5 text-green-500" />
            <span className={`text-sm sm:text-base font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{screenTitle}</span>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close"
            className={`rounded-lg p-1.5 transition ${closeBtn}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[82vh] sm:max-h-[80vh] overflow-y-auto px-4 sm:px-7 py-4 sm:py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {screen === 'main' && renderMain()}
          {screen === 'login' && renderLogin()}
          {screen === 'createPassword' && renderCreatePassword()}
          {screen === 'forgotPassword' && renderForgotPassword()}
          {screen === 'apply' && renderApply()}
          {screen === 'applicationSuccess' && renderApplicationSuccess()}
          {screen === 'status' && renderStatus()}
          {screen === 'forgotId' && renderForgotId()}
        </div>
      </div>
    </div>
  );
};

export default GreenChampionModal;
