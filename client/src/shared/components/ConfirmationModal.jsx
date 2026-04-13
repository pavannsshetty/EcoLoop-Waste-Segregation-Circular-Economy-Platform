import { HiExclamation, HiX } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  type = "danger" 
}) => {
  const { dark } = useTheme();
  if (!isOpen) return null;

  const colors = {
    danger:  { icon: 'text-red-600', bg: 'bg-red-100', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { icon: 'text-amber-600', bg: 'bg-amber-100', btn: 'bg-amber-600 hover:bg-amber-700' },
    info:    { icon: 'text-blue-600', bg: 'bg-blue-100', btn: 'bg-blue-600 hover:bg-blue-700' }
  };

  const theme = colors[type] || colors.danger;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-md rounded-none shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 ${dark ? 'bg-[#151B23] border border-white/5' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`h-12 w-12 rounded-none ${theme.bg} dark:bg-opacity-20 flex items-center justify-center`}>
              <HiExclamation className={`h-7 w-7 ${theme.icon}`} />
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
              <HiX className="h-6 w-6" />
            </button>
          </div>
          
          <h3 className={`text-xl font-bold tracking-tight mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{message}</p>
        </div>
        
        <div className={`px-6 py-4 flex flex-col sm:flex-row gap-3 ${dark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-none text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2.5 rounded-none text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all active:scale-95 ${theme.btn}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
