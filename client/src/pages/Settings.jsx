import { useTheme } from '../context/ThemeContext';
import { HiMoon, HiSun } from 'react-icons/hi';

const Toggle = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const Settings = () => {
  const { dark, toggleDark } = useTheme();

  const card    = dark ? 'bg-white/5 border-gray-700' : 'bg-white border-slate-100';
  const title   = dark ? 'text-slate-200' : 'text-slate-800';
  const sub     = dark ? 'text-slate-400' : 'text-slate-500';
  const divider = dark ? 'border-gray-800' : 'border-slate-50';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className={`text-xl font-extrabold ${title}`}>Settings</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>Manage your preferences</p>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b ${divider}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Appearance</p>
        </div>

        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${dark ? 'bg-yellow-900/40 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
              {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${title}`}>Dark Mode</p>
              <p className={`text-xs ${sub}`}>Switch between light and dark theme</p>
            </div>
          </div>
          <Toggle checked={dark} onChange={toggleDark} />
        </div>

        <div className={`px-5 py-4 ${sub} text-xs`}>
          You can also toggle dark mode using the <span className="font-semibold">🌙 / ☀️</span> icon in the top header.
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b ${divider}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>More Settings</p>
        </div>
        <div className={`px-5 py-8 text-center ${sub} text-sm`}>
          More settings coming soon.
        </div>
      </div>
    </div>
  );
};

export default Settings;
