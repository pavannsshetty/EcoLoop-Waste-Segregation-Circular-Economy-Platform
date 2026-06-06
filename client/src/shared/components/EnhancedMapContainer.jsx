import { useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { getMapLayer } from '../utils/mapLayers';
import MapLayerSwitcher from './MapLayerSwitcher';

/**
 * Enhanced MapContainer with built-in layer switching
 * Usage: Replace MapContainer with EnhancedMapContainer and add MapLayerSwitcher functionality
 * 
 * Props:
 * - showLayerSwitcher (bool): Show layer toggle button. Default: true
 * - defaultLayer (string): 'osm' or 'satellite'. Default: 'osm'
 * - onLayerChange (func): Callback when layer changes
 * - All other MapContainer props...
 */
const EnhancedMapContainer = ({ 
  showLayerSwitcher = true, 
  defaultLayer = 'osm',
  onLayerChange,
  children,
  ...mapProps 
}) => {
  const [mapLayer, setMapLayer] = useState(defaultLayer);
  
  const currentLayer = useMemo(() => getMapLayer(mapLayer), [mapLayer]);
  
  const handleLayerChange = (newLayer) => {
    setMapLayer(newLayer);
    if (onLayerChange) {
      onLayerChange(newLayer);
    }
  };
  
  return (
    <MapContainer {...mapProps}>
      <TileLayer
        key={`tile-${mapLayer}`}
        attribution={currentLayer.attribution}
        url={currentLayer.url}
        maxZoom={currentLayer.maxZoom}
        minZoom={currentLayer.minZoom}
      />
      {showLayerSwitcher && (
        <MapLayerSwitcher 
          currentLayer={mapLayer} 
          onLayerChange={handleLayerChange} 
          position="top-right" 
        />
      )}
      {children}
    </MapContainer>
  );
};

export default EnhancedMapContainer;
