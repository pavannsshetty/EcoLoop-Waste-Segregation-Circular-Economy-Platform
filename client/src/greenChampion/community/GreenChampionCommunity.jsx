import { useTheme } from '../../shared/context/ThemeContext';

const GreenChampionCommunity = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Community</h1>
      <p className={`mt-2 text-sm ${dk('text-slate-400', 'text-slate-600')}`}>Reserved for community challenges and leaderboards.</p>
    </div>
  );
};

export default GreenChampionCommunity;
