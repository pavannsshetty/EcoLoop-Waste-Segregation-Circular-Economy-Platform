import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ModalOverlay = ({ children, onClose, className = '' }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm ${className}`}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {children}
    </div>,
    document.body
  );
};

export default ModalOverlay;
