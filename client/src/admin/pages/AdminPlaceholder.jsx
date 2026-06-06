import { useLocation } from 'react-router-dom';
import { HiCube } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const AdminPlaceholder = () => {
  const location = useLocation();
  const { dark } = useTheme();
  const dk = (d, l) => dark ? d : l;
  const name = location.pathname.split('/').pop().replace(/-/g, ' ');
  const title = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className={`flex flex-col items-center justify-center py-24 gap-4 ${dk('text-slate-400', 'text-slate-400')}`}>
      <HiCube className="h-16 w-16 opacity-20" />
      <h2 className={`text-lg font-bold ${dk('text-slate-300', 'text-slate-600')}`}>{title}</h2>
      <p className="text-sm">This section is under development.</p>
    </div>
  );
};

export default AdminPlaceholder;
