import { useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import ModalOverlay from './ModalOverlay';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({ isOpen, onClose, title, icon: Icon, dark = false, children, className = '' }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const modal = modalRef.current;
    if (modal) {
      const focusable = modal.querySelectorAll(FOCUSABLE);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modal.focus();
      }
    }
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const focusable = modal.querySelectorAll(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panelCls = dark
    ? 'bg-slate-900 border border-gray-800'
    : 'bg-white';

  const textCls = dark ? 'text-white' : 'text-slate-900';
  const subCls = dark ? 'text-slate-400' : 'text-slate-400';
  const closeCls = dark
    ? 'text-slate-400 hover:bg-slate-700'
    : 'text-slate-400 hover:bg-slate-100';
  const borderCls = dark ? 'border-slate-700' : 'border-slate-100';

  return (
    <ModalOverlay onClose={onClose} className="flex items-end sm:items-center justify-center sm:p-4 overflow-hidden pointer-events-none">
      <div ref={modalRef} tabIndex={-1} className={`relative z-10 w-full max-w-md sm:max-w-xl rounded-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] pointer-events-auto ${panelCls} ${className}`}>
        <div className={`flex items-center justify-between px-3 sm:px-6 py-3.5 border-b shrink-0 ${borderCls}`}>
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className={`h-5 w-5 shrink-0 ${dark ? 'text-green-400' : 'text-green-500'}`} />}
            <span className={`font-bold text-lg sm:text-xl truncate ${textCls}`}>{title}</span>
          </div>
          <button type="button" onClick={onClose} className={`rounded-none p-1.5 transition shrink-0 ml-2 ${closeCls}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">
          {children}
        </div>
      </div>
    </ModalOverlay>
  );
};

export default Modal;
