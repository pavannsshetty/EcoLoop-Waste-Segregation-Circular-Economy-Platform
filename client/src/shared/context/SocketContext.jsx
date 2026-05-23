import { createContext, useContext, useEffect } from 'react';
import socket from '../../socket';
import { useUser } from './UserContext';

const SocketContext = createContext({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, refreshUser } = useUser();

  useEffect(() => {
    if (user && user._id) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('join', user._id);
      console.log('Socket joining room:', user._id);
      socket.on('profile_updated', refreshUser);
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      socket.off('profile_updated', refreshUser);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user, refreshUser]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
