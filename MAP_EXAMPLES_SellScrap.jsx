/**
 * MIGRATION EXAMPLE FOR SellScrap.jsx
 * 
 * Replace the map section with the following code.
 * This adds layer switching support while maintaining all existing functionality.
 */

import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { getMapLayer } from '../../shared/utils/mapLayers';
import MapLayerSwitcher from '../../shared/components/MapLayerSwitcher';

// In your component's state:
const [mapLayer, setMapLayer] = useState('osm');

// In your render/return, replace the TileLayer:

// OLD CODE:
/*
<MapContainer center={[13.6262, 74.6908]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full">
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  <Marker position={[13.6262, 74.6908]} />
</MapContainer>
*/

// NEW CODE:
/*
const currentLayer = getMapLayer(mapLayer);

<MapContainer center={[13.6262, 74.6908]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full">
  <TileLayer
    key={`tile-${mapLayer}`}
    url={currentLayer.url}
    attribution={currentLayer.attribution}
    maxZoom={currentLayer.maxZoom}
    minZoom={currentLayer.minZoom}
  />
  <Marker position={[13.6262, 74.6908]} />
  <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
</MapContainer>
*/
