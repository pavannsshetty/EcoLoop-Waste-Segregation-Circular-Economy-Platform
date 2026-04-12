import { useTheme } from '../../shared/context/ThemeContext';

const GreenChampionDashboard = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Green Champion</h1>
      <p className={`mt-2 text-sm ${dk('text-slate-400', 'text-slate-600')}`}>
        Campaign tools and impact metrics will appear here in a future release.
      </p>
      <div className={`mt-6 rounded-2xl border p-5 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100 shadow-sm')}`}>
        <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>Dashboard content coming soon.</p>
      </div>
    </div>
  );
};

export default GreenChampionDashboard;
