import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EcoLoopLogo from '../components/EcoLoopLogo';
import { HiLogout } from 'react-icons/hi';

const ROLE_LABELS = {
  Citizen:       'Citizen Dashboard',
  Collector:     'Collector Dashboard',
  GreenChampion: 'Green Champion Dashboard',
};

const DashboardPlaceholder = () => {
  const navigate = useNavigate();
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const label = ROLE_LABELS[user.role] || 'Dashboard';

  useEffect(() => {
    if (user.role === 'Citizen') navigate('/citizen', { replace: true });
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7FDF8] flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm h-16 flex items-center justify-between px-6">
        <EcoLoopLogo height={34} />
        <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition">
          <HiLogout className="h-5 w-5" /> Sign Out
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-3xl font-bold text-[#1F2937]">{label}</h1>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
