import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiUser, HiLockClosed, HiEye, HiEyeOff,
  HiMoon, HiSun, HiSparkles, HiShieldCheck,
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useToast, ToastContainer } from '../components/Toast';

const InputField = ({ id, label, type = 'text', placeholder, icon: Icon, value, onChange, error, dark }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;

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
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={isPassword ? 'current-password' : 'off'}
          className={[
            'w-full rounded-lg border py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2',
            dark ? 'bg-white/5 text-slate-100 placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400',
            Icon ? 'pl-9' : 'px-3.5',
            isPassword ? 'pr-10' : 'pr-3.5',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
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
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { toasts, toast, remove } = useToast();

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '', submit: '' })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username) errs.username = 'Username is required.';
    if (!form.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.message || 'Login failed.' }); return; }
      localStorage.setItem('admin-token', data.token);
      localStorage.setItem('admin-user', data.username);
      toast.success('Login successful! Welcome back.');
      setTimeout(() => navigate('/admin/dashboard'), 500);
    } catch {
      setErrors({ submit: 'Network error. Is the server running?' });
    } finally {
      setLoading(false);
    }
  };

  const shell  = dark ? 'bg-slate-950' : 'bg-slate-100';
  const dlg    = dark ? 'bg-black/90 border border-gray-800 text-slate-100' : 'bg-white text-slate-900';
  const hdr    = dark ? 'border-gray-800' : 'border-slate-100';
  const muted  = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen flex flex-col ${shell}`}>
      <ToastContainer toasts={toasts} onRemove={remove} />
      {/* Theme toggle */}
      <div className="flex justify-end p-4">
        <button type="button" onClick={toggleDark} aria-label="Toggle theme"
          className={`flex items-center justify-center h-9 w-9 rounded-xl transition ${dark ? 'text-yellow-400 hover:bg-white/10' : 'text-slate-600 hover:bg-white'}`}>
          {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
        </button>
      </div>

      {/* Centered dialog */}
      <div className="flex-1 flex items-center justify-center p-4 -mt-14">
        <div className={`w-full max-w-md rounded-2xl shadow-2xl ${dlg}`}>

          {/* Header */}
          <div className={`flex items-center gap-2 border-b px-6 py-4 ${hdr}`}>
            <HiSparkles className="h-5 w-5 text-green-500" />
            <span className={`text-base font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>Admin Portal</span>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Role badge */}
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${dark ? 'bg-white/5 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
              <HiShieldCheck className="h-4 w-4 text-green-500" />
              <span className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Administrator</span>
              <span className={`ml-auto text-xs ${muted}`}>Login</span>
            </div>

            {errors.submit && (
              <div className={`rounded-lg border px-4 py-2.5 text-sm ${dark ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <InputField
                id="username" label="Username" placeholder="Admin username"
                icon={HiUser} value={form.username}
                onChange={e => set('username', e.target.value)}
                error={errors.username} dark={dark}
              />
              <InputField
                id="password" label="Password" type="password" placeholder="••••••••"
                icon={HiLockClosed} value={form.password}
                onChange={e => set('password', e.target.value)}
                error={errors.password} dark={dark}
              />

              <div className="pt-1">
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Logging in...
                      </span>
                    : 'Login as Admin'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
