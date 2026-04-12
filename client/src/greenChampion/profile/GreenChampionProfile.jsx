import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const GreenChampionProfile = () => {
  const { dark } = useTheme();
  const { user: ctx } = useUser();
  const user = ctx || JSON.parse(localStorage.getItem('user') || '{}');
  const dk = (d, l) => (dark ? d : l);
  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Profile</h1>
      <div className={`mt-4 rounded-2xl border p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100 shadow-sm')}`}>
        <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-800')}`}>{user.name || 'Green Champion'}</p>
        <p className={`text-xs mt-1 ${dk('text-slate-400', 'text-slate-500')}`}>Extended profile editing coming soon.</p>
      </div>
    </div>
  );
};

export default GreenChampionProfile;
