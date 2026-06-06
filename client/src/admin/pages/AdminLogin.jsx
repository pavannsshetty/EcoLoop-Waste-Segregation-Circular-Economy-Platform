import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLockClosed, HiUser, HiEye, HiEyeOff } from 'react-icons/hi';
import EcoLoopLogo from '../../shared/components/EcoLoopLogo';
import { useTheme } from '../../shared/context/ThemeContext';
import DarkBg from '../../shared/components/DarkBg';
import { API } from '../../shared/constants';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data));
        navigate('/admin/manage-citizens');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${dark ? 'bg-black' : 'bg-[#F4FBF6]'}`}>
      {dark && <DarkBg />}
      {!dark && (
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      )}

      <button onClick={toggleDark}
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-lg flex items-center justify-center border transition hover:scale-105 active:scale-90"
        style={{ backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'white', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
        {dark ? <HiLockClosed className="h-4 w-4 text-yellow-400" /> : <HiLockClosed className="h-4 w-4 text-slate-500" />}
      </button>

      <div className={`relative w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in duration-500 ${dark ? 'bg-[#0d0d0d] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-400" />

        <div className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <EcoLoopLogo height={44} dark={dark} />
          </div>

          <h2 className={`text-center text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>Admin Login</h2>
          <p className={`text-center text-xs mb-6 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>EcoLoop Management Panel</p>

          {error && (
            <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              dark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              <HiLockClosed className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Username</label>
              <div className="relative">
                <HiUser className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input value={username} onChange={e => setUsername(e.target.value)}
                  required autoFocus
                  className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                    dark ? 'bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  placeholder="Enter admin username" />
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Password</label>
              <div className="relative">
                <HiLockClosed className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  required
                  className={`w-full h-10 pl-9 pr-10 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500/40 ${
                    dark ? 'bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  placeholder="Enter password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  {showPw ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
