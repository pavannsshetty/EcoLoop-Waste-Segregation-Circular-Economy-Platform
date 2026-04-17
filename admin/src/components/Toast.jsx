import { useState, useCallback, useEffect, useRef } from 'react';
import { HiCheckCircle, HiXCircle, HiInformationCircle, HiExclamation, HiX } from 'react-icons/hi';

const VARIANTS = {
  success: { icon: HiCheckCircle,       bar: 'bg-green-500',  iconCls: 'text-green-500',  bg: 'bg-white border-l-4 border-green-500' },
  error:   { icon: HiXCircle,           bar: 'bg-red-500',    iconCls: 'text-red-500',    bg: 'bg-white border-l-4 border-red-500' },
  info:    { icon: HiInformationCircle, bar: 'bg-blue-500',   iconCls: 'text-blue-500',   bg: 'bg-white border-l-4 border-blue-500' },
  warning: { icon: HiExclamation,       bar: 'bg-yellow-400', iconCls: 'text-yellow-500', bg: 'bg-white border-l-4 border-yellow-400' },
};

const DURATION = 4500;

const ToastItem = ({ id, type = 'info', message, onRemove }) => {
  const v = VARIANTS[type] || VARIANTS.info;
  const Icon = v.icon;
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  }, [id, onRemove]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    timer.current = setTimeout(() => dismiss(), DURATION);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer.current); };
  }, [dismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{ transition: 'opacity 300ms, transform 300ms' }}
      className={[
        'relative flex items-start gap-3 rounded-xl shadow-xl px-4 py-3.5 w-full',
        v.bg,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${v.iconCls}`} />
      <p className="flex-1 text-sm font-medium text-slate-800 leading-snug">{message}</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss"
        className="shrink-0 text-slate-400 hover:text-slate-600 transition mt-0.5">
        <HiX className="h-4 w-4" />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-xl ${v.bar}`}
        style={{ animation: `shrinkWidth ${DURATION}ms linear forwards` }}
      />
    </div>
  );
};

export const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[99999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useRef({
    success: msg => add(msg, 'success'),
    error:   msg => add(msg, 'error'),
    info:    msg => add(msg, 'info'),
    warning: msg => add(msg, 'warning'),
  });

  // Keep the methods up-to-date with the latest `add` (stable, but just in case)
  toast.current.success = msg => add(msg, 'success');
  toast.current.error   = msg => add(msg, 'error');
  toast.current.info    = msg => add(msg, 'info');
  toast.current.warning = msg => add(msg, 'warning');

  return { toasts, toast: toast.current, remove };
};
