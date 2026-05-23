import { useEffect, useRef, useState } from 'react';
import { HiChevronDown, HiLocationMarker } from 'react-icons/hi';

const VillageDropdown = ({ value, onChange, error, touched, dark, villages = [], placeholder = 'Search your village...' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const filtered = villages.filter((v) => v.name.toLowerCase().includes(query.toLowerCase()));
  const hasError = touched && error;
  const isOk = touched && !error && value;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (v) => {
    onChange(v.name);
    setQuery(v.name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${hasError ? 'text-red-500' : isOk ? 'text-green-500' : dark ? 'text-slate-500' : 'text-slate-400'}`}>
          <HiLocationMarker className="h-4 w-4" />
        </span>
        <input
          value={open ? query : value}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={(e) => { setQuery(e.target.value); onChange(''); }}
          placeholder={placeholder}
          autoComplete="off"
          className={[
            'w-full rounded-sm border py-3 pl-9 pr-9 text-sm shadow-sm transition focus:outline-none focus:ring-2',
            dark ? 'bg-white/5 text-slate-100 placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400',
            hasError ? 'border-red-400 focus:ring-red-400' : isOk ? 'border-green-400 focus:ring-green-400' : dark ? 'border-slate-700 focus:ring-green-500' : 'border-slate-200 focus:ring-green-500',
          ].join(' ')}
        />
        <HiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-transform pointer-events-none ${open ? 'rotate-180' : ''} ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>

      {open && (
        <ul className={`absolute top-full z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-sm border shadow-lg text-sm ${dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
          {filtered.length === 0
            ? <li className={`px-4 py-2.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No villages found</li>
            : filtered.map((v) => (
              <li
                key={v._id || v.id || v.name}
                onMouseDown={() => select(v)}
                className={`px-4 py-2.5 cursor-pointer transition ${value === v.name ? 'bg-green-600 text-white' : dark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
              >
                {v.name}
              </li>
            ))}
        </ul>
      )}

      {hasError && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default VillageDropdown;
