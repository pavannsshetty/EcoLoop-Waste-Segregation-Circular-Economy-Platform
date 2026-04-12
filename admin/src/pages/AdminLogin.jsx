import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUser, HiLockClosed, HiEye, HiEyeOff, HiMoon, HiSun } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Login failed.');
        return;
      }
      localStorage.setItem('admin-token', data.token);
      localStorage.setItem('admin-user', data.username);
      navigate('/admin/dashboard');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const shell = dk('bg-slate-950', 'bg-slate-100');
  const card = dk('bg-slate-900 border-slate-800', 'bg-white border-slate-200 shadow-xl');
  const title = dk('text-white', 'text-slate-900');
  const sub = dk('text-slate-400', 'text-slate-500');
  const inp = dk(
    'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500',
    'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
  );

  return (
    <div className={`min-h-screen flex flex-col ${shell}`}>
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={toggleDark}
          aria-label="Toggle theme"
          className={`flex items-center justify-center h-9 w-9 rounded-xl transition ${dk('text-yellow-400 hover:bg-white/10', 'text-slate-600 hover:bg-white')}`}
        >
          {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 -mt-14">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-2xl">🌱</span>
              <span className={`text-xl font-extrabold ${title}`}>EcoLoop</span>
            </div>
            <p className={`${sub} text-sm`}>Admin Portal</p>
          </div>

          <div className={`rounded-2xl border shadow-2xl p-6 space-y-5 ${card}`}>
            <h1 className={`text-lg font-bold ${title}`}>Sign in to Admin</h1>

            {error && (
              <div className="rounded-xl bg-red-100 border border-red-200 dark:bg-red-900/30 dark:border-red-700 px-4 py-2.5 text-sm text-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-medium mb-1 block ${sub}`}>Username</label>
                <div className="relative">
                  <HiUser className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="Admin username"
                    className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${inp}`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-medium mb-1 block ${sub}`}>Password</label>
                <div className="relative">
                  <HiLockClosed className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk('text-slate-500', 'text-slate-400')}`} />
                  <input
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${inp}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${dk('text-slate-500 hover:text-slate-300', 'text-slate-400 hover:text-slate-600')}`}
                  >
                    {show ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
