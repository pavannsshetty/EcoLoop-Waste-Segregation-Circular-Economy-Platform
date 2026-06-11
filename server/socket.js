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
          "https://eco-loop-waste-segregation-circular.vercel.app",
          process.env.CLIENT_URL,
        ].filter(Boolean);
        if (!origin || allowed.includes(origin)) {
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

const emitPopupNotification = (userId, data) => {
  if (io) {
    io.to(userId).emit('popup_notification', data);
  }
};

const emitPopupNotificationBulk = (userIds, data) => {
  if (io) {
    userIds.forEach((uid) => {
      io.to(uid).emit('popup_notification', data);
    });
  }
};

const broadcastPopupNotification = (data) => {
  if (io) {
    io.emit('popup_notification', data);
  }
};

const emitAnalyticsUpdate = (scope = 'all', identifier = null) => {
  if (io) {
    io.emit('analytics_updated', { scope, identifier, timestamp: new Date() });
  }
};

module.exports = { init, getIO, emitToUser, emitToAll, emitPopupNotification, emitPopupNotificationBulk, broadcastPopupNotification, emitAnalyticsUpdate };
