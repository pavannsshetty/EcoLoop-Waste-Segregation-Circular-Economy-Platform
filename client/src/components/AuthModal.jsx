import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiX, HiUser, HiMail, HiPhone, HiLockClosed,
  HiLocationMarker, HiIdentification,
  HiEye, HiEyeOff, HiCheckCircle, HiXCircle,
  HiArrowLeft, HiUserGroup, HiTruck, HiSparkles,
  HiInformationCircle,
} from 'react-icons/hi';

const validators = {
  email: v => {
    if (!v) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  },
  mobile: v => {
    if (!v) return 'Mobile number is required';
    if (!/^\d+$/.test(v)) return 'Only numbers allowed';
    if (v.length !== 10) return 'Mobile number must be 10 digits';
    return '';
  },
  password:        v => (!v ? 'Password is required' : ''),
  confirmPassword: (v, pwd) => {
    if (!v) return 'Please confirm your password';
    if (v !== pwd) return 'Passwords do not match';
    return '';
  },
  address: v => {
    if (!v) return 'Address is required';
    if (v.length < 10) return 'Please enter full address (min 10 characters)';
    return '';
  },
  fullName:    v => (!v ? 'Full name is required' : ''),
  collectorId: v => (!v ? 'Collector ID is required' : ''),
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

// ─── InputField ───────────────────────────────────────────────────────────────
const InputField = ({ id, label, type = 'text', placeholder, icon: Icon, value = '', onChange, onBlur, error, touched, maxLength, dark }) => {
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
          placeholder={isPassword ? '••••••••' : placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
          autoComplete={isPassword ? 'new-password' : 'one-time-code'}
          className={[
            'w-full rounded-lg border py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2',
            dark
              ? 'bg-slate-800 text-slate-100 placeholder-slate-500'
              : 'bg-white text-slate-900 placeholder-slate-400',
            Icon ? 'pl-9' : 'px-3.5',
            isPassword ? 'pr-10' : 'pr-3.5',
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : isOk
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
                : dark
                  ? 'border-slate-600 focus:border-green-500 focus:ring-green-500/30'
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

// ─── PasswordStrength ─────────────────────────────────────────────────────────
const PasswordStrength = ({ value, dark }) => {
  if (!value) return null;
  const s = getStrength(value);
  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full transition-all duration-300 ${s.color} ${s.width}`} />
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

const ROLES = [
  { key: 'Citizen',        icon: HiUserGroup, desc: 'Resident / Public user' },
  { key: 'Collector',      icon: HiTruck,     desc: 'Waste collection staff' },
  { key: 'Green Champion', icon: HiSparkles,  desc: 'Community volunteer' },
];

const MOCK_REGISTERED = ['test@example.com', 'user@gmail.com'];
const initFields  = () => ({ fullName: '', email: '', mobile: '', collectorId: '', password: '', confirmPassword: '', address: '', assignedArea: '', areaLocality: '' });
const initTouched = () => Object.fromEntries(Object.keys(initFields()).map(k => [k, false]));

// ─── AuthModal ────────────────────────────────────────────────────────────────
const AuthModal = ({ isOpen, onClose, toast, dark = false }) => {
  const navigate = useNavigate();
  const [screen,     setScreen]     = useState('role-select');
  const [userRole,   setUserRole]   = useState(null);
  const [fields,     setFields]     = useState(initFields());
  const [touched,    setTouched]    = useState(initTouched());
  const [forgotSent, setForgotSent] = useState(false);
  const [loading,    setLoading]    = useState(false);

  const getErrors = useCallback(() => ({
    fullName:        validators.fullName(fields.fullName),
    email:           validators.email(fields.email) || (MOCK_REGISTERED.includes(fields.email) ? 'Email already registered' : ''),
    mobile:          validators.mobile(fields.mobile),
    collectorId:     validators.collectorId(fields.collectorId),
    password:        validators.password(fields.password) || (fields.password && !pwdRules.every(r => r.test(fields.password)) ? 'Password does not meet all requirements' : ''),
    confirmPassword: validators.confirmPassword(fields.confirmPassword, fields.password),
    address:         validators.address(fields.address),
  }), [fields]);

  const errors = getErrors();
  const handleChange = field => e => { setFields(f => ({ ...f, [field]: e.target.value })); setTouched(t => ({ ...t, [field]: true })); };
  const handleBlur   = field => ()  => setTouched(t => ({ ...t, [field]: true }));

  const reset = (nextScreen, role = userRole) => {
    setScreen(nextScreen); setUserRole(role);
    setFields(initFields()); setTouched(initTouched()); setForgotSent(false);
  };
  const handleClose = () => { reset('role-select', null); onClose(); };
  const selectRole  = role => reset('login', role);

  const handleSubmit = async e => {
    e.preventDefault();
    const currentErrors = {
      fullName:        validators.fullName(fields.fullName),
      email:           validators.email(fields.email),
      mobile:          validators.mobile(fields.mobile),
      collectorId:     validators.collectorId(fields.collectorId),
      password:        validators.password(fields.password) || (fields.password && !pwdRules.every(r => r.test(fields.password)) ? 'Password does not meet all requirements' : ''),
      confirmPassword: validators.confirmPassword(fields.confirmPassword, fields.password),
      address:         validators.address(fields.address),
    };
    setTouched(Object.fromEntries(Object.keys(initFields()).map(k => [k, true])));

    const relevantErrors = screen === 'register'
      ? Object.entries(currentErrors).filter(([k]) => k !== 'collectorId' && !(k === 'address' && userRole !== 'Citizen')).map(([, v]) => v)
      : screen === 'login'
        ? [userRole === 'Collector' ? currentErrors.collectorId : currentErrors.email, currentErrors.password]
        : [];
    if (relevantErrors.some(Boolean)) return;

    setLoading(true);
    try {
      if (screen === 'register') {
        const body = {
          name: fields.fullName, email: fields.email, password: fields.password, phone: fields.mobile,
          role: userRole === 'Green Champion' ? 'GreenChampion' : userRole,
          ...(userRole === 'Citizen'        && { address:  fields.address }),
          ...(userRole === 'Green Champion' && { locality: fields.areaLocality }),
        };
        let res, data;
        try {
          res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          data = await res.json();
        } catch {
          toast.success(`Welcome, ${fields.fullName}! Registration successful.`);
          setTimeout(() => { reset('role-select', null); onClose(); navigate('/dashboard'); }, 300);
          return;
        }
        if (!res.ok) {
          if (res.status === 409) toast.warning('User already exists, please login.');
          else toast.error(data.message || 'Registration failed.');
          return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(`Welcome, ${data.user.name}! Registration successful.`);
        setTimeout(() => { reset('role-select', null); onClose(); navigate('/dashboard'); }, 300);

      } else if (screen === 'login') {
        const body = {
          role: userRole === 'Green Champion' ? 'GreenChampion' : userRole,
          password: fields.password,
          ...(userRole === 'Collector' ? { collectorId: fields.collectorId } : { email: fields.email }),
        };
        let res, data;
        try {
          res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          data = await res.json();
        } catch {
          toast.success(`Welcome back! Signed in as ${userRole}.`);
          setTimeout(() => { reset('role-select', null); onClose(); navigate('/dashboard'); }, 300);
          return;
        }
        if (!res.ok) { toast.error(data.message || 'Login failed. Check your credentials.'); return; }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(`Welcome back, ${data.user.name}!`);
        setTimeout(() => { reset('role-select', null); onClose(); navigate('/dashboard'); }, 300);
      }
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const fp = field => ({ value: fields[field], onChange: handleChange(field), onBlur: handleBlur(field), error: errors[field], touched: touched[field], dark });

  const headerTitle = { 'role-select': 'Get Started', register: `Register as ${userRole}`, login: `Sign in — ${userRole}`, forgot: 'Reset Password' }[screen];

  // ── theme shortcuts ──
  const dlg  = dark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const hdr  = dark ? 'border-slate-700' : 'border-slate-100';
  const muted= dark ? 'text-slate-400' : 'text-slate-500';
  const closeBtn = dark ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className={`relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl ${dlg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between border-b px-4 sm:px-6 py-3.5 sm:py-4 ${hdr}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">🌱</span>
            <span className={`text-sm sm:text-base font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{headerTitle}</span>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close"
            className={`rounded-lg p-1.5 transition ${closeBtn}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[82vh] sm:max-h-[80vh] overflow-y-auto px-4 sm:px-7 py-4 sm:py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* ── ROLE SELECTION ── */}
          {screen === 'role-select' && (
            <div className="space-y-5">
              <p className={`text-sm ${muted}`}>Select your role to continue.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ROLES.map(({ key, icon: Icon, desc }) => (
                  <button key={key} type="button" onClick={() => selectRole(key)}
                    className={`flex sm:flex-col items-center gap-3 sm:gap-2 rounded-xl border-2 px-4 sm:px-3 py-4 sm:py-5 text-left sm:text-center transition hover:border-green-500 hover:shadow-md group ${
                      dark ? 'border-slate-700 bg-slate-800 hover:bg-green-900/30' : 'border-slate-200 bg-white hover:bg-green-50'
                    }`}>
                    <span className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition ${
                      dark ? 'bg-slate-700 group-hover:bg-green-900' : 'bg-slate-100 group-hover:bg-green-100'
                    }`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 transition ${dark ? 'text-slate-400 group-hover:text-green-400' : 'text-slate-500 group-hover:text-green-600'}`} />
                    </span>
                    <span className="flex flex-col sm:items-center gap-0.5">
                      <span className={`text-sm font-semibold ${dark ? 'text-slate-200 group-hover:text-green-400' : 'text-slate-800 group-hover:text-green-700'}`}>{key}</span>
                      <span className={`text-xs ${dark ? 'text-slate-500 group-hover:text-green-500' : 'text-slate-400 group-hover:text-green-600'}`}>{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {screen === 'forgot' && (
            <div className="space-y-4">
              <button type="button" onClick={() => reset('login')}
                className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
                <HiArrowLeft className="h-4 w-4" /> Back to Sign in
              </button>
              {forgotSent ? (
                <div className={`rounded-xl border p-5 text-center space-y-2 ${dark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
                  <HiCheckCircle className="h-9 w-9 text-green-500 mx-auto" />
                  <p className={`text-sm font-semibold ${dark ? 'text-green-400' : 'text-green-700'}`}>Password reset successfully!</p>
                  <p className={`text-xs ${dark ? 'text-green-500' : 'text-green-600'}`}>You can now sign in with your new password.</p>
                  <button type="button" onClick={() => reset('login')} className="text-sm font-medium text-green-500 hover:underline">Go to Sign in</button>
                </div>
              ) : (
                <form noValidate autoComplete="off" className="space-y-4" onSubmit={e => {
                  e.preventDefault();
                  setTouched(t => ({ ...t, email: true, password: true }));
                  if (!validators.email(fields.email) && fields.password && pwdRules.every(r => r.test(fields.password))) {
                    setForgotSent(true);
                    toast.success('Password reset successfully! You can now sign in.');
                  } else if (validators.email(fields.email)) {
                    toast.error('Enter a valid registered email.');
                  } else {
                    toast.error('Password does not meet all requirements.');
                  }
                }}>
                  <p className={`text-sm ${muted}`}>Enter your registered email and set a new password.</p>
                  <InputField id="forgotEmail" label="Registered Email" type="email" placeholder="name@company.com" icon={HiMail} dark={dark}
                    value={fields.email} onChange={handleChange('email')} onBlur={handleBlur('email')} error={errors.email} touched={touched.email} />
                  <div>
                    <InputField id="forgotPassword" label="New Password" type="password" icon={HiLockClosed} dark={dark}
                      value={fields.password} onChange={handleChange('password')} onBlur={handleBlur('password')} error={errors.password} touched={touched.password} />
                    <PasswordStrength value={fields.password} dark={dark} />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                    Reset Password
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── REGISTER / LOGIN ── */}
          {(screen === 'register' || screen === 'login') && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => reset('role-select', null)}
                  className={`flex items-center gap-1 text-sm transition hover:text-green-500 ${muted}`}>
                  <HiArrowLeft className="h-4 w-4" /> Change role
                </button>
                {userRole !== 'Collector' && (
                  <p className={`text-sm ${muted}`}>
                    {screen === 'login' ? 'No account? ' : 'Have an account? '}
                    <button type="button" onClick={() => reset(screen === 'login' ? 'register' : 'login')}
                      className="font-medium text-green-500 hover:underline">
                      {screen === 'login' ? 'Register' : 'Sign in'}
                    </button>
                  </p>
                )}
              </div>

              {/* Role badge */}
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {(() => { const r = ROLES.find(r => r.key === userRole); const Icon = r?.icon; return Icon ? <Icon className="h-4 w-4 text-green-500" /> : null; })()}
                <span className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{userRole}</span>
                <span className={`ml-auto text-xs ${muted}`}>{screen === 'login' ? 'Login' : 'Registration'}</span>
              </div>

              {/* Collector banner */}
              {userRole === 'Collector' && (
                <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${dark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <HiInformationCircle className={`h-5 w-5 shrink-0 mt-0.5 ${dark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-xs leading-relaxed ${dark ? 'text-blue-300' : 'text-blue-700'}`}>
                    Collector accounts are issued by the municipality administrator. If you don't have credentials, please contact your local municipal office.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
                {/* Dummy fields to prevent browser autofill */}
                <input type="text" style={{ display: 'none' }} autoComplete="username" readOnly />
                <input type="password" style={{ display: 'none' }} autoComplete="new-password" readOnly />
                {screen === 'register' && userRole === 'Citizen' && (<>
                  <InputField id="fullName" label="Full Name" placeholder="John Doe" icon={HiUser} {...fp('fullName')} />
                  <InputField id="email" label="Email" type="email" placeholder="name@company.com" icon={HiMail} {...fp('email')} />
                  <InputField id="mobile" label="Mobile Number" type="tel" placeholder="9876543210" icon={HiPhone} maxLength={10} dark={dark}
                    value={fields.mobile} onBlur={handleBlur('mobile')} error={errors.mobile} touched={touched.mobile}
                    onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,10); setFields(f=>({...f,mobile:v})); setTouched(t=>({...t,mobile:true})); }} />
                  <div><InputField id="password" label="Password" type="password" icon={HiLockClosed} {...fp('password')} /><PasswordStrength value={fields.password} dark={dark} /></div>
                  <InputField id="confirmPassword" label="Confirm Password" type="password" icon={HiLockClosed} {...fp('confirmPassword')} />
                  <InputField id="address" label="Address" placeholder="123 Main St, City..." icon={HiLocationMarker} {...fp('address')} />
                </>)}

                {screen === 'register' && userRole === 'Green Champion' && (<>
                  <InputField id="fullName" label="Full Name" placeholder="John Doe" icon={HiUser} {...fp('fullName')} />
                  <InputField id="email" label="Email" type="email" placeholder="name@company.com" icon={HiMail} {...fp('email')} />
                  <InputField id="mobile" label="Mobile Number" type="tel" placeholder="9876543210" icon={HiPhone} maxLength={10} dark={dark}
                    value={fields.mobile} onBlur={handleBlur('mobile')} error={errors.mobile} touched={touched.mobile}
                    onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,10); setFields(f=>({...f,mobile:v})); setTouched(t=>({...t,mobile:true})); }} />
                  <div><InputField id="password" label="Password" type="password" icon={HiLockClosed} {...fp('password')} /><PasswordStrength value={fields.password} dark={dark} /></div>
                  <InputField id="confirmPassword" label="Confirm Password" type="password" icon={HiLockClosed} {...fp('confirmPassword')} />
                  <InputField id="areaLocality" label="Area / Locality" placeholder="Your Locality" icon={HiLocationMarker}
                    value={fields.areaLocality} onChange={handleChange('areaLocality')} onBlur={handleBlur('areaLocality')} dark={dark} />
                </>)}

                {screen === 'login' && userRole === 'Citizen' && (<>
                  <InputField id="loginEmail" label="Email / Mobile" placeholder="Email or 10-digit mobile" icon={HiMail} {...fp('email')} />
                  <InputField id="loginPassword" label="Password" type="password" icon={HiLockClosed} {...fp('password')} />
                </>)}

                {screen === 'login' && userRole === 'Green Champion' && (<>
                  <InputField id="gcEmail" label="Email / Mobile" placeholder="Email or 10-digit mobile" icon={HiMail} {...fp('email')} />
                  <InputField id="gcPassword" label="Password" type="password" icon={HiLockClosed} {...fp('password')} />
                </>)}

                {screen === 'login' && userRole === 'Collector' && (<>
                  <InputField id="collectorId" label="Collector ID" placeholder="COL-12345" icon={HiIdentification} dark={dark}
                    value={fields.collectorId} onChange={handleChange('collectorId')} onBlur={handleBlur('collectorId')} error={errors.collectorId} touched={touched.collectorId} />
                  <InputField id="collectorPassword" label="Password" type="password" icon={HiLockClosed} {...fp('password')} />
                </>)}

                {screen === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className={`flex cursor-pointer items-center gap-2 text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-500 text-green-600 focus:ring-green-500 bg-transparent" />
                      Remember me
                    </label>
                    {userRole !== 'Collector' && (
                      <button type="button" onClick={() => reset('forgot')} className="text-sm font-medium text-green-500 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <button type="submit" disabled={loading}
                    className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Please wait...</span>
                      : screen === 'login' ? `Sign In as ${userRole}` : `Register as ${userRole}`
                    }
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
