import { useState, useEffect } from 'react';
import PopupNotification from './PopupNotification';

/**
 * NotificationQueue Component
 * Manages a queue of popup notifications
 * Displays one notification at a time, queuing others until dismissed
 * 
 * Props:
 * - socket: Socket.io instance
 * - userId: Current user ID
 * - autoClose: Auto-close timeout per notification (ms)
 * - soundPath: Path to notification sound file
 */
const NotificationQueue = ({ socket, userId, autoClose = 8000, soundPath = '/sound-popup.mp3' }) => {
  const [notifications, setNotifications] = useState([]);
  const [displayedNotification, setDisplayedNotification] = useState(null);

  // Listen for popup notifications from socket
  useEffect(() => {
    if (!socket) return;

    const handlePopupNotification = (notification) => {
      setNotifications(prev => [...prev, notification]);
    };

    socket.on('popup_notification', handlePopupNotification);

    return () => {
      socket.off('popup_notification', handlePopupNotification);
    };
  }, [socket]);

  // Display next notification when current one is dismissed
  useEffect(() => {
    if (!displayedNotification && notifications.length > 0) {
      setDisplayedNotification(notifications[0]);
    }
  }, [displayedNotification, notifications]);

  const handleNotificationClose = () => {
    setNotifications(prev => prev.slice(1));
    setDisplayedNotification(null);
  };

  const handleNotificationAction = (notification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <>
      {displayedNotification && (
        <PopupNotification
          notification={displayedNotification}
          onClose={handleNotificationClose}
          onAction={handleNotificationAction}
          autoClose={autoClose}
          playSound={true}
          soundPath={soundPath}
        />
      )}
    </>
  );
};

export default NotificationQueue;
