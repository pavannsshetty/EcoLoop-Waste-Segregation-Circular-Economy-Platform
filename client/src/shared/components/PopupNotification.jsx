import { useEffect, useState } from 'react';
import { HiX, HiCheckCircle, HiBell, HiExclamation, HiClock, HiHome, HiShoppingCart, HiSparkles, HiStar } from 'react-icons/hi';
import { MdRecycling, MdWarning, MdEmojiEvents } from 'react-icons/md';
import { FaTrophy } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const TYPE_META = {
  public_waste_report:       { Icon: HiBell, color: 'text-green-600', bg: 'bg-green-100', darkBg: 'dark:bg-green-900/40', darkColor: 'dark:text-green-400' },
  home_pickup_request:       { Icon: HiHome, color: 'text-blue-600', bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/40', darkColor: 'dark:text-blue-400' },
  scrap_collection:          { Icon: MdRecycling, color: 'text-emerald-600', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/40', darkColor: 'dark:text-emerald-400' },
  collector_assignment:      { Icon: HiCheckCircle, color: 'text-teal-600', bg: 'bg-teal-100', darkBg: 'dark:bg-teal-900/40', darkColor: 'dark:text-teal-400' },
  green_champion_request:    { Icon: HiSparkles, color: 'text-purple-600', bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/40', darkColor: 'dark:text-purple-400' },
  approval_request:          { Icon: HiExclamation, color: 'text-orange-600', bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/40', darkColor: 'dark:text-orange-400' },
  eco_shopping_order:        { Icon: HiShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-100', darkBg: 'dark:bg-indigo-900/40', darkColor: 'dark:text-indigo-400' },
  eco_product_purchase:      { Icon: HiShoppingCart, color: 'text-pink-600', bg: 'bg-pink-100', darkBg: 'dark:bg-pink-900/40', darkColor: 'dark:text-pink-400' },
  community_activity:        { Icon: MdEmojiEvents, color: 'text-red-600', bg: 'bg-red-100', darkBg: 'dark:bg-red-900/40', darkColor: 'dark:text-red-400' },
  reward_event:              { Icon: FaTrophy, color: 'text-yellow-600', bg: 'bg-yellow-100', darkBg: 'dark:bg-yellow-900/40', darkColor: 'dark:text-yellow-400' },
  broadcast_message:         { Icon: HiBell, color: 'text-slate-600', bg: 'bg-slate-100', darkBg: 'dark:bg-slate-900/40', darkColor: 'dark:text-slate-400' },
  report_status_update:      { Icon: HiCheckCircle, color: 'text-cyan-600', bg: 'bg-cyan-100', darkBg: 'dark:bg-cyan-900/40', darkColor: 'dark:text-cyan-400' },
  pickup_status_update:      { Icon: HiClock, color: 'text-sky-600', bg: 'bg-sky-100', darkBg: 'dark:bg-sky-900/40', darkColor: 'dark:text-sky-400' },
  scrap_status_update:       { Icon: MdRecycling, color: 'text-green-600', bg: 'bg-green-100', darkBg: 'dark:bg-green-900/40', darkColor: 'dark:text-green-400' },
  order_status_update:       { Icon: HiShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-100', darkBg: 'dark:bg-indigo-900/40', darkColor: 'dark:text-indigo-400' },
  verification_required:     { Icon: MdWarning, color: 'text-red-600', bg: 'bg-red-100', darkBg: 'dark:bg-red-900/40', darkColor: 'dark:text-red-400' },
  report_approved:           { Icon: HiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', darkBg: 'dark:bg-green-900/40', darkColor: 'dark:text-green-400' },
  report_rejected:           { Icon: MdWarning, color: 'text-red-600', bg: 'bg-red-100', darkBg: 'dark:bg-red-900/40', darkColor: 'dark:text-red-400' },
  reward_earned:             { Icon: FaTrophy, color: 'text-yellow-600', bg: 'bg-yellow-100', darkBg: 'dark:bg-yellow-900/40', darkColor: 'dark:text-yellow-400' },
  achievement_unlocked:      { Icon: FaTrophy, color: 'text-purple-600', bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/40', darkColor: 'dark:text-purple-400' },
};

/**
 * PopupNotification Component
 * Displays real-time notifications as floating popups that auto-dismiss
 * 
 * Props:
 * - notification: object with _id, title, description, type, actionUrl
 * - onClose: callback when notification is dismissed
 * - onAction: callback when action button is clicked
 * - autoClose: auto-close timeout in ms (default: 8000)
 * - playSound: whether to play notification sound (default: true)
 */
const PopupNotification = ({
  notification,
  onClose,
  onAction,
  autoClose = 8000,
  playSound = true,
  soundPath = '/sound-popup.mp3'
}) => {
  const { dark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const meta = TYPE_META[notification.type] || TYPE_META.broadcast_message;
  const Icon = meta.Icon;

  // Play sound effect
  useEffect(() => {
    if (playSound) {
      try {
        const audio = new Audio(soundPath);
        audio.volume = 0.3;
        audio.play().catch(err => console.debug('Audio play failed:', err));
      } catch (err) {
        console.debug('Notification sound error:', err);
      }
    }
  }, [playSound, soundPath]);

  // Auto-close notification
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow animation to complete
    }, autoClose);

    return () => clearTimeout(timer);
  }, [autoClose, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleAction = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onAction) onAction(notification);
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] transition-all duration-300 transform ${
        isVisible
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-2 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        className={`w-full sm:w-96 rounded-xl shadow-2xl overflow-hidden ring-1 transition-all duration-300 ${
          dark
            ? 'bg-gray-900 border border-gray-800 ring-gray-700'
            : 'bg-white border border-gray-100 ring-gray-200'
        }`}
      >
        {/* Header with icon and close button */}
        <div className={`flex items-start justify-between p-4 sm:p-5 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.darkBg}`}>
              <Icon className={`h-5 w-5 ${meta.color} ${meta.darkColor}`} />
            </div>

            {/* Title and message */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                {notification.title}
              </h3>
              {notification.description && (
                <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {notification.description}
                </p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`ml-2 flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              dark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <HiX className="h-4 w-4" />
          </button>
        </div>

        {/* Action buttons */}
        {notification.actionUrl && (
          <div className={`flex gap-2 p-4 sm:p-5 border-t ${dark ? 'border-gray-800 bg-gray-950' : 'border-gray-100 bg-gray-50'}`}>
            <button
              onClick={handleAction}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Open
            </button>
            <button
              onClick={handleClose}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                dark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div
          className="h-1 bg-gradient-to-r from-green-500 to-green-400 animate-pulse"
          style={{
            animation: `shrink ${autoClose}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default PopupNotification;
