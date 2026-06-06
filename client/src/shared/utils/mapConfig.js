/**
 * Map Initialization and Configuration Helper
 * Centralizes all map setup logic to ensure consistency across the app
 */

import * as L from 'leaflet';
import { getMapLayer } from './mapLayers';

// Fix Leaflet marker icon issue globally
export const initializeLeaflet = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

// Get tile layer configuration for specific layer type
export const getTileLayerConfig = (layerId = 'osm') => {
  const layer = getMapLayer(layerId);
  return {
    url: layer.url,
    attribution: layer.attribution,
    maxZoom: layer.maxZoom,
    minZoom: layer.minZoom,
  };
};

// Default map layer (OSM)
export const DEFAULT_MAP_LAYER = getTileLayerConfig('osm');

// Get satellite layer config
export const SATELLITE_MAP_LAYER = getTileLayerConfig('satellite');
