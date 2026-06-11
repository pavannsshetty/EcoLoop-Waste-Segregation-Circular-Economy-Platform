const mongoose = require('mongoose');
const Village = require('./models/Village');
const { villages } = require('./data/kundapuraVillages');
require('dotenv').config();

const seedVillages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const villageDocs = villages.map(({ village }) => ({
      name: village,
    }));

    await Village.deleteMany({});
    await Village.insertMany(villageDocs);

    console.log(`${villageDocs.length} Kundapura Taluk villages seeded successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding villages:', err);
    process.exit(1);
  }
};

seedVillages();
