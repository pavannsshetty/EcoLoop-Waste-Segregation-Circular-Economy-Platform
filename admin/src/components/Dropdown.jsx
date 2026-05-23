import React, { useState, useEffect, useRef, Children } from 'react';
import { HiChevronDown, HiSearch, HiCheck } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const Dropdown = ({ value, onChange, name, className, children, placeholder, disableSearch, align = 'left' }) => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const options = [];
  React.Children.toArray(children).forEach(child => {
    // If it's a direct option
    if (child && child.type === 'option') {
      options.push({
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = (val, isDisabled) => {
    if (isDisabled) return;
    setOpen(false);
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
    setSearch('');
  };

  const filtered = options.filter(o => 
    o.label?.toString().toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className && className.includes('w-') ? (className.includes('w-full') ? 'w-full' : className.split(' ').filter(c => c.startsWith('w-')).join(' ')) : 'w-full'}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-4 h-11 rounded-xl border transition-all text-left focus:ring-2 focus:ring-green-500/20 outline-none select-none active:scale-[0.98] ${
          dk('bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600 shadow-sm', 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm')
        } ${className?.replace(/w-\S+/g, '')}`}
      >
        <span className="truncate block font-medium flex-1 mr-2">{selectedOption?.label || placeholder || 'Select...'}</span>
        <HiChevronDown className={`shrink-0 transition-transform duration-300 ease-in-out ${open ? '-rotate-180 text-green-500' : dk('text-slate-500', 'text-slate-400')}`} size={18} />
      </button>

      {open && (
        <div 
          className={`absolute z-[100] mt-2 min-w-[220px] rounded-2xl border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ${
            dk('bg-slate-800 border-slate-700 shadow-black/50', 'bg-white border-slate-100 shadow-slate-200/50')
          } ${align === 'right' ? 'right-0' : 'left-0'}`} 
          style={{ 
            maxHeight: 'min(50vh, 320px)', 
            top: '100%', 
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          
          {(!disableSearch && options.length > 8) && (
            <div className={`p-2.5 border-b sticky top-0 z-10 backdrop-blur-md ${dk('border-slate-700/50 bg-slate-800/90', 'border-slate-100 bg-white/90')}`}>
               <div className={`flex items-center gap-2 px-3 rounded-xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group ${
                 dk('bg-slate-900/80 border-slate-700/50 focus-within:border-green-500 shadow-inner', 'bg-slate-100 border-slate-200 focus-within:border-green-500')
               }`}>
                  <HiSearch className={`h-4 w-4 shrink-0 transition-colors ${dk('text-slate-500 group-focus-within:text-green-500', 'text-slate-400 group-focus-within:text-green-500')}`} />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search options..."
                    className="w-full py-2.5 bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
                    autoFocus
                  />
               </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-[250px] p-1.5 custom-scrollbar">
             {filtered.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-8">
                 <p className={`text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No matches found</p>
               </div>
             ) : filtered.map((o, idx) => {
               const isSelected = String(o.value) === String(value);
               return (
                 <button
                   key={idx}
                   type="button"
                   disabled={o.disabled}
                   onClick={() => handleSelect(o.value, o.disabled)}
                   className={`w-full text-left px-4 py-3 text-sm rounded-xl flex items-center justify-between transition-all duration-150 ${
                     o.disabled 
                       ? dk('opacity-50 cursor-not-allowed text-slate-500', 'opacity-50 cursor-not-allowed text-slate-400')
                       : isSelected 
                         ? dk('bg-green-500/15 text-green-500 font-bold', 'bg-green-500 text-green-500 font-bold') 
                         : dk('text-slate-300 hover:bg-slate-700 w-full', 'text-slate-700 hover:bg-slate-50 w-full')
                   }`}
                 >
                   <span className="truncate pr-4 block flex-1">{o.label}</span>
                   {isSelected && <HiCheck className={`shrink-0 ${dk('text-green-500', 'text-green-500')}`} size={16} />}
                 </button>
               )
             })}
          </div>
        </div>
      )}
    </div>
  );
};
export default Dropdown;
