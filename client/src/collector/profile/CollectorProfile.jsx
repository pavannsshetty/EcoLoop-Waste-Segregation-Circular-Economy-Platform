import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';

const CollectorProfile = () => {
  const { dark } = useTheme();
  const { user: ctx } = useUser();
  const user = ctx || JSON.parse(localStorage.getItem('user') || '{}');
  const dk = (d, l) => (dark ? d : l);

  const rows = [
    { label: 'Full name', value: user.name || '—' },
    { label: 'Collector ID', value: user.collectorId || '—' },
    { label: 'City', value: user.city || '—' },
    { label: 'Area', value: user.area || user.locality || '—' },
    { label: 'Email', value: user.email || '—' },
    { label: 'Phone', value: user.phone || '—' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className={`text-xl font-extrabold ${dk('text-slate-200', 'text-slate-800')}`}>Profile</h1>
        <p className={`text-sm mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Collector account details</p>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-4 ${dk('border-gray-800', 'border-slate-100')}`}>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="h-full w-full object-cover rounded-2xl" />
            ) : (
              (user.name || 'C')[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className={`font-semibold truncate ${dk('text-slate-100', 'text-slate-900')}`}>{user.name || 'Collector'}</p>
            <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Role: Collector</p>
          </div>
        </div>
        <div className={`divide-y ${dk('divide-gray-800', 'divide-slate-100')}`}>
          {rows.map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex justify-between gap-4">
              <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 ${dk('text-slate-500', 'text-slate-400')}`}>{label}</span>
              <span className={`text-sm text-right break-all ${dk('text-slate-200', 'text-slate-800')}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectorProfile;
