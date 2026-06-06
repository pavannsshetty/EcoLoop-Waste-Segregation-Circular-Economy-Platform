import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL || undefined;
const socket = io(socketUrl, {
  path: '/socket.io',
  autoConnect: false,
  transports: ['websocket'],
  ackTimeout: 0,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error);
});

export default socket;
