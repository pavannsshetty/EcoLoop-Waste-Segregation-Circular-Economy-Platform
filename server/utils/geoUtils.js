/**
 * Ray-casting algorithm for Point-in-Polygon check.
 * coordinates is an array of [lng, lat] pairs.
 */
const isPointInPolygon = (lat, lng, polygon) => {
  let x = lng, y = lat;
  let inside = false;
  
  // polygon.coordinates[0] is the outer ring
  const vs = polygon.coordinates[0];
  
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    
    let intersect = ((yi > y) != (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
};

module.exports = { isPointInPolygon };
