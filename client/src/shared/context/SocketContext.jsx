import { createContext, useContext, useEffect } from 'react';
import socket from '../../socket';
import { useUser } from './UserContext';

const SocketContext = createContext({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useUser();

  useEffect(() => {
    if (user && user._id) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('join', user._id);
      console.log('Socket joining room:', user._id);
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
