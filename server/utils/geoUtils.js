/**
 * Ray-casting algorithm for Point-in-Polygon check.
 * Supports both Polygon and MultiPolygon GeoJSON types.
 * coordinates expected in [lng, lat] order per GeoJSON convention.
 * Full polygon ring support including interior rings (holes).
 */
const pointInRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Check if a point is inside a GeoJSON polygon, respecting interior rings (holes).
 * For a Polygon: coordinates[0] is the outer ring, coordinates[1..] are holes.
 * For a MultiPolygon: each polygon follows the same ring convention.
 */
const isPointInPolygon = (lat, lng, polygon) => {
  if (!polygon || !polygon.type || !polygon.coordinates) return false;

  const x = lng, y = lat;

  if (polygon.type === 'MultiPolygon') {
    for (const polyCoords of polygon.coordinates) {
      if (!polyCoords || polyCoords.length < 1) continue;
      // Must be inside outer ring
      if (!pointInRing(x, y, polyCoords[0])) continue;
      // Must be outside all holes (interior rings)
      let inHole = false;
      for (let r = 1; r < polyCoords.length; r++) {
        if (polyCoords[r].length >= 3 && pointInRing(x, y, polyCoords[r])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  }

  // Polygon (single ring with optional holes)
  if (!polygon.coordinates[0] || polygon.coordinates[0].length < 3) return false;
  if (!pointInRing(x, y, polygon.coordinates[0])) return false;
  // Check interior rings (holes)
  for (let r = 1; r < polygon.coordinates.length; r++) {
    if (polygon.coordinates[r].length >= 3 && pointInRing(x, y, polygon.coordinates[r])) {
      return false;
    }
  }
  return true;
};

module.exports = { isPointInPolygon };
