require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/user',          require('./routes/userRoutes'));
app.use('/api/waste',         require('./routes/wasteRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/rewards',       require('./routes/rewardsRoutes'));
app.use('/api/leaderboard',   require('./routes/leaderboardRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/collector',     require('./routes/collectorRoutes'));

app.get('/', (req, res) => res.send('EcoLoop API is running...'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
