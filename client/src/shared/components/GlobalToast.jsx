import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { HiX } from 'react-icons/hi';

const TOAST_DURATION = 6000;
const MAX_TOASTS = 5;

const TYPE_META = {
  report:       { icon: '📋', color: 'border-l-blue-500', bg: 'bg-blue-50' },
  status:       { icon: '🔄', color: 'border-l-emerald-500', bg: 'bg-emerald-50' },
  support:      { icon: '🤝', color: 'border-l-purple-500', bg: 'bg-purple-50' },
  escalation:   { icon: '⚠️', color: 'border-l-red-500', bg: 'bg-red-50' },
  delay:        { icon: '⏰', color: 'border-l-amber-500', bg: 'bg-amber-50' },
  pickup:       { icon: '🚛', color: 'border-l-orange-500', bg: 'bg-orange-50' },
  scrap:        { icon: '♻️', color: 'border-l-teal-500', bg: 'bg-teal-50' },
  reward:       { icon: '🏆', color: 'border-l-yellow-500', bg: 'bg-yellow-50' },
  order:        { icon: '🛒', color: 'border-l-emerald-500', bg: 'bg-emerald-50' },
  'Eco Events': { icon: '🌿', color: 'border-l-green-500', bg: 'bg-green-50' },
  System:       { icon: '🔔', color: 'border-l-slate-500', bg: 'bg-slate-50' },
};

const getMeta = (type) => TYPE_META[type] || { icon: '📢', color: 'border-l-gray-500', bg: 'bg-gray-50' };

const TYPE_NAV = {
  report:     '/citizen/public-reports',
  status:     '/citizen/public-reports',
  support:    '/citizen/nearby-issues',
  escalation: '/citizen/public-reports',
  delay:      '/citizen/public-reports',
  pickup:     '/citizen/home-reports',
  scrap:      '/citizen/scrap-requests',
  reward:     '/citizen/my-rewards',
  order:      '/citizen/eco-shopping',
};

export default function GlobalToast() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);
  const soundRef = useRef(null);

  const playSound = useCallback(() => {
    try {
      if (!soundRef.current) {
        soundRef.current = new Audio('/sound-popup.mp3');
        soundRef.current.volume = 0.3;
      }
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const deriveNavPath = useCallback((notification) => {
    if (notification.actionUrl) return notification.actionUrl;
    if (notification.reportId) return TYPE_NAV.report;
    return TYPE_NAV[notification.type] || '/citizen/notifications';
  }, []);

  const addToast = useCallback((notification, navPathOverride) => {
    const id = ++idCounter.current;
    const toast = {
      id,
      _id: notification._id,
      title: notification.title || 'Notification',
      message: notification.description || notification.message || '',
      type: notification.type || 'System',
      reportId: notification.reportId || null,
      navPath: navPathOverride || deriveNavPath(notification),
    };

    setToasts(prev => {
      const isDuplicate = prev.some(t =>
        t._id && t._id === toast._id ||
        (!t._id && !toast._id && t.title === toast.title && t.message === toast.message)
      );
      if (isDuplicate) return prev;
      return [...prev, toast].slice(-MAX_TOASTS);
    });

    playSound();
    setTimeout(() => removeToast(id), TOAST_DURATION);
  }, [playSound, removeToast, deriveNavPath]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (data) => {
      const notification = data.notification || data;
      if (notification && notification.title) addToast(notification);
    };
    const handlePopupNotification = (data) => {
      if (data && data.title) {
        addToast({
          _id: data._id || `${Date.now()}-${Math.random()}`,
          title: data.title,
          description: data.message,
          type: data.type || 'System',
          reportId: data.reportId,
        }, data.url || data.actionUrl);
      }
    };
    socket.on('notification', handleNotification);
    socket.on('notification_broadcast', handleNotification);
    socket.on('popup_notification', handlePopupNotification);
    return () => {
      socket.off('notification', handleNotification);
      socket.off('notification_broadcast', handleNotification);
      socket.off('popup_notification', handlePopupNotification);
    };
  }, [socket, addToast]);

  const handleClick = (toast) => {
    if (toast.navPath) {
      if (toast.navPath.startsWith('http')) {
        window.open(toast.navPath, '_blank');
      } else {
        navigate(toast.navPath);
      }
    } else {
      navigate('/citizen/notifications');
    }
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const meta = getMeta(toast.type);
        return (
          <div
            key={toast.id}
            onClick={() => handleClick(toast)}
            className={`pointer-events-auto relative overflow-hidden rounded-xl shadow-xl border border-slate-200 cursor-pointer transition-all duration-300 animate-in slide-in-from-right-2 ${meta.bg} ${meta.color} border-l-4`}
          >
            <div className="flex items-start gap-3 p-3">
              <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate pr-6">{toast.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                className="absolute top-2 right-2 shrink-0 p-0.5 rounded-full hover:bg-black/5 transition text-slate-400 hover:text-slate-600"
              >
                <HiX className="h-4 w-4" />
              </button>
            </div>
            <div
              className="h-0.5 bg-green-500/40 origin-left"
              style={{ animation: `shrink ${TOAST_DURATION}ms linear forwards` }}
            />
          </div>
        );
      })}
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
