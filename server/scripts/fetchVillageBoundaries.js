const mongoose = require('mongoose');
const Village = require('../models/Village');
const { villages } = require('../data/kundapuraVillages');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search.php';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'EcoLoopApp/1.0 (waste-management-platform)';
const DELAY_MS = 800;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const searchVariations = (name) => [
  `${name}, Kundapura, India`,
  `${name} village, Kundapura, India`,
  `${name}, Udupi, Karnataka, India`,
  `${name} grama, Kundapura, India`,
  `${name}`,
];

const fetchNominatim = async (villageName) => {
  for (const query of searchVariations(villageName)) {
    const q = encodeURIComponent(query);
    const url = `${NOMINATIM_URL}?q=${q}&polygon_geojson=1&format=jsonv2&limit=5`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hit = data.find(d => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon'));
      if (hit && hit.geojson && hit.geojson.coordinates?.length > 0) {
        const coordCount = hit.geojson.type === 'MultiPolygon'
          ? (hit.geojson.coordinates[0]?.[0]?.length || 0)
          : (hit.geojson.coordinates[0]?.length || 0);
        if (coordCount >= 3) {
          return { boundary: hit.geojson, source: 'nominatim', coords: coordCount };
        }
      }
    } finally {
      clearTimeout(timer);
    }
    await sleep(200);
  }
  return null;
};

const fetchOverpass = async (villageName) => {
  const queries = [
    // Try as administrative boundary (relation)
    `[out:json];area["name"="Kundapura"]["admin_level"="8"]->.taluk;relation["boundary"="administrative"]["name"~"${villageName}",i](area.taluk);out geom;`,
    // Try as village place (node with place=village)
    `[out:json];area["name"="Kundapura"]["admin_level"="8"]->.taluk;node["place"="village"]["name"~"${villageName}",i](area.taluk);out geom;`,
    // Try as boundary/multipolygon in Udupi district
    `[out:json];area["name"="Udupi"]["admin_level"="6"]->.dist;relation["boundary"="administrative"]["name"~"${villageName}",i](area.dist);out geom;`,
    // Try as boundary without level filter
    `[out:json];area["name"="Kundapura"]["admin_level"="8"]->.taluk;relation["type"="multipolygon"]["name"~"${villageName}",i](area.taluk);out geom;`,
  ];

  for (const query of queries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.elements || data.elements.length === 0) continue;

      // Find the first element with valid geometry
      for (const el of data.elements) {
        let coords = null;
        if (el.type === 'relation' && el.members) {
          // Extract boundary from relation members
          const outerMembers = el.members.filter(m => m.role === 'outer' && m.geometry);
          if (outerMembers.length > 0) {
            const allCoords = [];
            for (const member of outerMembers) {
              const ring = member.geometry.map(g => [g.lon, g.lat]);
              if (ring.length >= 3) allCoords.push(ring);
            }
            if (allCoords.length > 0) {
              coords = allCoords.length === 1 ? allCoords[0] : allCoords;
              const boundary = {
                type: allCoords.length > 1 || outerMembers.length > 1 ? 'Polygon' : 'Polygon',
                coordinates: allCoords.length > 1 ? [allCoords] : [allCoords],
              };
              if (boundary.coordinates[0]?.length >= 3) {
                return { boundary, source: 'overpass-relation', coords: boundary.coordinates[0].length };
              }
            }
          }
        }
      }
    } catch (e) {
      // Try next query
    } finally {
      clearTimeout(timer);
    }
    await sleep(300);
  }
  return null;
};

const getVillageCenter = (villageName) => {
  const centerMap = {
    'Albadi': [13.65, 74.68],
    'Amasebailu': [13.57, 74.70],
    'Ampar': [13.63, 74.67],
    'Badakere': [13.60, 74.72],
    'Balkur': [13.56, 74.72],
    'Basrur': [13.62, 74.68],
    'Beejadi': [13.65, 74.72],
    'Bellal': [13.64, 74.70],
    'Beloor': [13.61, 74.73],
    'Belve': [13.67, 74.68],
    'Bijoor': [13.61, 74.70],
    'Byndoor': [13.87, 74.63],
    'Chittoor': [13.64, 74.71],
    'Devalkunda': [13.60, 74.66],
    'Edmoge': [13.69, 74.72],
    'Golihole': [13.62, 74.73],
    'Gulvadi': [13.63, 74.72],
    'Hadavu': [13.68, 74.69],
    'Hallady-Harkadi': [13.64, 74.67],
    'Halnad': [13.57, 74.73],
    'Hangaloor': [13.64, 74.66],
    'Harady': [13.67, 74.69],
    'Hardally-Mandally': [13.62, 74.69],
    'Hattiangadi': [13.61, 74.70],
    'Heranjal': [13.63, 74.72],
    'Heroor': [13.60, 74.68],
    'Heskathoor': [13.65, 74.69],
    'Hombady-Mandadi': [13.64, 74.66],
    'Hosoor': [13.64, 74.67],
    'Idurkunhadi': [13.65, 74.71],
    'Jadkal': [13.58, 74.70],
    'Kalavara': [13.67, 74.70],
    'Kalthodu': [13.67, 74.69],
    'Kambadakone': [13.63, 74.71],
    'Kandavara': [13.62, 74.68],
    'Kattabelthoor': [13.65, 74.70],
    'Kavrady': [13.64, 74.69],
    'Kedoor': [13.62, 74.66],
    'Kenchanoor': [13.59, 74.67],
    'Kergal': [13.65, 74.70],
    'Kirimanjeshwar': [13.64, 74.66],
    'Kollur': [13.72, 74.81],
    'Kundabarandadi': [13.66, 74.71],
    'Madammakki': [13.60, 74.69],
    'Maravanthe': [13.77, 74.67],
    'Mudoor': [13.59, 74.69],
    'Nada': [13.59, 74.71],
    'Navunda': [13.62, 74.72],
    'Paduvari': [13.56, 74.70],
    'Rattadi': [13.67, 74.67],
    'Senapur': [13.58, 74.69],
    'Shedimane': [13.66, 74.67],
    'Siddapur': [13.68, 74.70],
    'Tallur': [13.63, 74.69],
    'Thagarasi': [13.68, 74.69],
    'Trashi': [13.63, 74.68],
    'Ulloor': [13.65, 74.72],
    'Ulthoor': [13.63, 74.73],
    'Uppunda': [13.78, 74.68],
    'Yedthare': [13.67, 74.72],
    'Yedyadi-Mathyadi': [13.63, 74.65],
    'Yeljith': [13.66, 74.66],
  };
  return centerMap[villageName] || null;
};

const createFallbackBoundary = (villageName) => {
  const center = getVillageCenter(villageName);
  if (!center) return null;
  // Create a ~2km radius buffer around the center as a simple polygon
  const [lat, lng] = center;
  const km = 0.018; // ~2km in degrees (approx)
  const pts = 24;
  const ring = [];
  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * 2 * Math.PI;
    const dlat = km * Math.cos(angle);
    const dlng = km * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    ring.push([lng + dlng, lat + dlat]);
  }
  // Close the ring
  ring.push(ring[0]);
  return {
    boundary: { type: 'Polygon', coordinates: [ring] },
    source: 'fallback',
    coords: ring.length,
  };
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await Village.find().select('name boundary').lean();
  const skip = new Set(existing.filter(v => v.boundary?.coordinates?.length > 0).map(v => v.name));
  const pending = villages.filter(v => !skip.has(v.village));

  console.log(`Connected. Already have boundaries: ${skip.size}/${villages.length}`);
  console.log(`Fetching boundaries for ${pending.length} remaining villages...\n`);

  let fetched = 0;
  let fallback = 0;
  for (let i = 0; i < pending.length; i++) {
    const { village } = pending[i];
    process.stdout.write(`[${i + 1}/${pending.length}] ${village}... `);

    let result = null;
    try {
      result = await fetchNominatim(village);
      if (!result) {
        // Overpass API skipped - use approximate fallback for remaining villages
      }
    } catch (e) {
      process.stdout.write(`ERR:${e.message} `);
    }

    if (result) {
      await Village.updateOne({ name: village }, { $set: { boundary: result.boundary } });
      fetched++;
      console.log(`OK (${result.source}, ${result.boundary.type}, ${result.coords} pts)`);
    } else {
      // Try fallback approximate boundary
      const fallbackResult = createFallbackBoundary(village);
      if (fallbackResult) {
        await Village.updateOne({ name: village }, { $set: { boundary: fallbackResult.boundary } });
        fallback++;
        console.log(`FALLBACK (approximate, ${fallbackResult.coords} pts)`);
      } else {
        console.log('not found');
      }
    }

    await sleep(DELAY_MS);
  }

  const total = await Village.find().select('name boundary').lean();
  const withBoundary = total.filter(v => v.boundary?.coordinates?.length > 0).length;
  console.log(`\nDone. ${withBoundary}/${total.length} villages now have boundaries (${fetched} fetched, ${fallback} approximate).`);
  process.exit(0);
};

main().catch(err => { console.error(err); process.exit(1); });