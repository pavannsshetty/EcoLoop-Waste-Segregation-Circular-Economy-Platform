const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'name email role phone greenChampionId');
    for (const u of users) {
      console.log(`NAME: ${u.name} | EMAIL: ${u.email} | ROLE: ${u.role} | PHONE: ${u.phone} | GCID: ${u.greenChampionId}`);
    }
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}
checkUsers();
