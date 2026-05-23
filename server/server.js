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
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ecoloop-waste-segregation-circular-economy-platform.pages.dev',
    process.env.CLIENT_URL,
  ].filter(Boolean),
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
