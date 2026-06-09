const { Server } = require('socket.io');

let io;
const activeUsers = new Map();

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        const allowed = [
          "http://localhost:5173",
          "http://localhost:5174",
          "https://ecoloop-waste-segregation-circular-economy-platform.pages.dev",
          process.env.CLIENT_URL,
        ].filter(Boolean);
        if (!origin || allowed.includes(origin) || origin.endsWith(".pages.dev")) {
          cb(null, true);
        } else {
          cb(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        activeUsers.set(userId, socket.id);
        console.log(`User ${userId} joined room`);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = { init, getIO, emitToUser, emitToAll };
