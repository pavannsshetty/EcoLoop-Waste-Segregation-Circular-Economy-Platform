import { createContext, useContext, useEffect } from 'react';
import socket from '../socket';

const SocketContext = createContext({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    const adminToken = localStorage.getItem('admin-token');
    if (adminToken) {
      if (!socket.connected) {
        socket.connect();
      }
      // You could emit a join room for admins if needed
      console.log('Admin socket connected');
    }

    return () => {
      // Optional: don't disconnect if you want persistent connection
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
