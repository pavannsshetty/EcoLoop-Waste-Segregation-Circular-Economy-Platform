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

const isRectangleBoundary = (b) => {
  try {
    if (!b || !b.coordinates || !b.coordinates[0]) return false;
    const coords = b.coordinates[0];
    if (coords.length !== 5) return false;
    const lats = [...new Set(coords.map(c => c[1]))];
    const lngs = [...new Set(coords.map(c => c[0]))];
    return lats.length === 2 && lngs.length === 2;
  } catch (e) { return false; }
};

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

    let villageDoc = await Village.findOne({
      name: { $regex: new RegExp(`^${canonicalName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') },
    }).select('name center boundary').lean();

    // If the DB boundary looks like a rectangular bbox (seed data), try to fetch a real polygon from Nominatim
    if (villageDoc && isRectangleBoundary(villageDoc.boundary)) {
      try {
        const axios = require('axios');
        const q = encodeURIComponent(`${canonicalName}, Kundapura, India`);
        const url = `https://nominatim.openstreetmap.org/search.php?q=${q}&polygon_geojson=1&format=jsonv2&limit=3`;
        const r = await axios.get(url, { headers: { 'Accept-Language': 'en' } });
        const data = r.data;
        const hit = (Array.isArray(data) && data.find(d => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon'))) || (Array.isArray(data) && data[0]);
        if (hit && hit.geojson && hit.geojson.coordinates && hit.geojson.coordinates.length > 0) {
          const geo = hit.geojson;
          let boundary = null;
          if (geo.type === 'Polygon') boundary = { type: 'Polygon', coordinates: geo.coordinates };
          else if (geo.type === 'MultiPolygon') boundary = { type: 'Polygon', coordinates: geo.coordinates[0] };
          if (boundary) {
            // persist back to DB (best-effort)
            await Village.updateOne({ _id: villageDoc._id }, { $set: { boundary } });
            villageDoc.boundary = boundary;
            console.debug('[villageRoutes] replaced bbox with nominatim polygon for', canonicalName);
          }
        }
      } catch (e) {
        console.debug('[villageRoutes] nominatim polygon fetch failed for', canonicalName, e.message || e);
      }
    }

    const base = villages.find(v => v.village === canonicalName);
    res.json(toApiVillage(base, villageDoc));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching village' });
  }
});

module.exports = router;
