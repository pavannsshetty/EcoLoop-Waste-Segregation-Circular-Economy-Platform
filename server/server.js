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
    'https://ecoloop-waste-segregation-circular-economy-platform.pages.dev',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/citizen',       require('./routes/citizenRoutes'));
app.use('/api/user',          require('./routes/userRoutes'));
app.use('/api/waste',         require('./routes/wasteRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/scrap',         require('./routes/scrapRoutes'));
app.use('/api/rewards',       require('./routes/rewardsRoutes'));
app.use('/api/leaderboard',   require('./routes/leaderboardRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/collector',     require('./routes/collectorRoutes'));

app.get('/', (req, res) => res.send('EcoLoop API is running...'));

socket.init(server);

server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
