import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL || undefined;
const socket = io(socketUrl, {
  path: '/socket.io',
  autoConnect: false,
  transports: ['websocket'],
  ackTimeout: 0,
});

export default socket;
