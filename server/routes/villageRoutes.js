const express = require('express');
const router = express.Router();
const Village = require('../models/Village');
const { villages, getCanonicalVillageName } = require('../data/kundapuraVillages');

const toApiVillage = (base, dbVillage) => ({
  id: base.id,
  village: base.village,
  name: base.village,
  taluk: base.taluk,
  center: dbVillage?.center || null,
  boundary: dbVillage?.boundary || null,
});

router.get('/', async (req, res) => {
  try {
    const villageDocs = await Village.find().select('name center boundary').lean();
    const dbByName = new Map(villageDocs.map(v => [v.name.toLowerCase(), v]));
    res.json(villages.map(v => toApiVillage(v, dbByName.get(v.village.toLowerCase()))));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching villages' });
  }
});

router.get('/:name', async (req, res) => {
  try {
    const canonicalName = getCanonicalVillageName(req.params.name);
    if (!canonicalName) return res.status(404).json({ message: 'Village not found' });

    const villageDoc = await Village.findOne({
      name: { $regex: new RegExp(`^${canonicalName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') },
    }).select('name center boundary').lean();

    const base = villages.find(v => v.village === canonicalName);
    res.json(toApiVillage(base, villageDoc));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching village' });
  }
});

module.exports = router;
