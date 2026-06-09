// EcoLoop Server Initialization
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

const http   = require('http');
const socket = require('./socket');

const app  = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://eco-loop-waste-segregation-circular.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/citizen',       require('./routes/citizenRoutes'));
app.use('/api/user',          require('./routes/userRoutes'));
app.use('/api/waste',         require('./routes/wasteRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/scrap',         require('./routes/scrapRoutes'));
app.use('/api/rewards',       require('./routes/rewardRoutes'));
app.use('/api/leaderboard',   require('./routes/leaderboardRoutes'));
app.use('/api/collector',     require('./routes/collectorRoutes'));
app.use('/api/eco-shopping', require('./routes/ecoShoppingRoutes'));
app.use('/api/green-champion', require('./routes/greenChampionRoutes'));

app.use('/api/villages',       require('./routes/villageRoutes'));
app.get('/', (req, res) => res.send('EcoLoop API is running...'));
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
// Also accept HEAD /api/health for Render health checks
app.head('/api/health', (req, res) => res.status(200).end());

// Global error handler (catches multer, validation, and unexpected errors)
app.use((err, req, res, next) => {
  console.error('[ErrorHandler]', err.message || err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field.' });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

socket.init(server);

const { startReportJobs } = require('./jobs/reportJobs');
startReportJobs();

const serverInstance = server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown to prevent EADDRINUSE
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  serverInstance.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  serverInstance.close(() => {
    process.exit(0);
  });
});
