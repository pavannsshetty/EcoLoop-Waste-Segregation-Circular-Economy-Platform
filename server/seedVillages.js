const mongoose = require('mongoose');
const Village = require('./models/Village');
const { villages } = require('./data/kundapuraVillages');
require('dotenv').config();

const boundaryData = {
  Ampar: {
    center: { lat: 13.6333, lng: 74.8833 },
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.8700, 13.6450], [74.9000, 13.6450], [74.9000, 13.6200], [74.8700, 13.6200], [74.8700, 13.6450],
      ]],
    },
  },
  Beejadi: {
    center: { lat: 13.5852, lng: 74.7001 },
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.6900, 13.5950], [74.7100, 13.5950], [74.7100, 13.5750], [74.6900, 13.5750], [74.6900, 13.5950],
      ]],
    },
  },
  Kumbashi: {
    center: { lat: 13.5645, lng: 74.7210 },
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.7100, 13.5750], [74.7350, 13.5750], [74.7350, 13.5550], [74.7100, 13.5550], [74.7100, 13.5750],
      ]],
    },
  },
  Tallur: {
    center: { lat: 13.6550, lng: 74.7050 },
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.6950, 13.6650], [74.7150, 13.6650], [74.7150, 13.6450], [74.6950, 13.6450], [74.6950, 13.6650],
      ]],
    },
  },
};

const seedVillages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const villageDocs = villages.map(({ village }) => ({
      name: village,
      ...(boundaryData[village] || {}),
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
