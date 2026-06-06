/**
 * Map Tile Layer Configurations
 * Provides consistent tile layer URLs and attributions across the application
 */

export const MAP_LAYERS = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 0,
  },
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom: 18,
    minZoom: 0,
  },
};

export const getMapLayer = (layerId = 'osm') => {
  return MAP_LAYERS[layerId] || MAP_LAYERS.osm;
};

export const getAllMapLayers = () => {
  return Object.values(MAP_LAYERS);
};
