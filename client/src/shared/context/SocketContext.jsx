import { createContext, useContext, useEffect, useRef } from 'react';
import socket from '../../socket';
import { useUser } from './UserContext';

const SocketContext = createContext({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, refreshUser } = useUser();
  const joined = useRef(false);

  useEffect(() => {
    if (user && user._id) {
      if (!socket.connected) {
        socket.connect();
      }
      if (!joined.current) {
        socket.emit('join', user._id);
        console.log('Socket joining room:', user._id);
        joined.current = true;
      }
      socket.on('profile_updated', () => { refreshUser(); });
    } else {
      joined.current = false;
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      socket.off('profile_updated', refreshUser);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
