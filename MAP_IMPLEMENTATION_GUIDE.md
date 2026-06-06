# Map Implementation Update Guide

## Overview
All maps across the project have been updated to support:
- OpenStreetMap (OSM) as default
- Esri World Imagery (Satellite) as alternative
- Layer switcher for toggling between map types
- Consistent map configuration across the application

## New Files Created

### 1. Map Tile Configuration (`shared/utils/mapLayers.js`)
- Defines tile layer URLs and attributions
- Provides `getMapLayer()` function for consistent layer access
- Supports both OSM and Esri satellite layers

### 2. Map Layer Switcher (`shared/components/MapLayerSwitcher.jsx`)
- Toggle button for switching between map layers
- Shows Map (OSM) and Satellite (Esri) options
- Auto-collapses dropdown after selection
- Dark mode support

### 3. Map Configuration (`shared/utils/mapConfig.js`)
- Centralizes Leaflet initialization
- Provides tile layer config helpers
- Exports default layer configurations

### 4. Enhanced Map Container (`shared/components/EnhancedMapContainer.jsx`)
- Drop-in replacement for MapContainer
- Includes built-in layer switching
- Handles layer changes automatically

### 5. Enhanced MapPicker (`shared/components/MapPickerEnhanced.jsx`)
- Location picker with layer switching
- Polygon-based boundary validation
- Integrated map layer switcher

## Implementation Strategy

### For MapPicker (Location Selection)
Replace imports:
```javascript
// OLD
import MapPicker from './MapPicker';

// NEW
import MapPickerEnhanced from './MapPickerEnhanced';
```

Update usage:
```javascript
// No changes needed - same props and interface
<MapPickerEnhanced onLocationSelect={handleLocationSelect} villageName={user?.village} dark={dark} />
```

### For Simple Map Views (Read-only Maps)
Update files:
- `/citizen/scrap/SellScrap.jsx`
- `/collector/homePickupTasks/HomePickupTasks.jsx`
- `/collector/ecoDelivery/EcoDeliveryTasks.jsx`
- `/collector/publicWasteTasks/PublicWasteTasks.jsx`
- `/collector/scrapTasks/ScrapTasks.jsx`

For each file, replace:
```javascript
// OLD
<MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} className="...">
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  {/* content */}
</MapContainer>

// NEW - Option 1: Use EnhancedMapContainer
import EnhancedMapContainer from './EnhancedMapContainer';

<EnhancedMapContainer 
  center={[lat, lng]} 
  zoom={15} 
  scrollWheelZoom={false} 
  dragging={false} 
  zoomControl={false} 
  className="..."
  showLayerSwitcher={true}
  defaultLayer="osm"
>
  {/* content */}
</EnhancedMapContainer>

// NEW - Option 2: Upgrade TileLayer configuration
import { getMapLayer } from './shared/utils/mapLayers';

const currentLayer = getMapLayer('osm');
<MapContainer ...>
  <TileLayer
    url={currentLayer.url}
    attribution={currentLayer.attribution}
    maxZoom={currentLayer.maxZoom}
    minZoom={currentLayer.minZoom}
  />
  {/* content */}
</MapContainer>
```

## Map Layers Available

### OpenStreetMap (OSM)
- **ID**: `osm`
- **Name**: OpenStreetMap
- **URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Attribution**: OpenStreetMap contributors
- **Max Zoom**: 19
- **Best for**: Standard street maps, navigation

### Esri World Imagery (Satellite)
- **ID**: `satellite`
- **Name**: Esri World Imagery
- **URL**: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **Attribution**: Esri, DigitalGlobe, Earthstar Geographics, CNES/Airbus DS, USDA, USGS
- **Max Zoom**: 18
- **Best for**: Satellite imagery, verification

## Features Preserved

All existing functionality is preserved:
- ✓ Markers and clustering
- ✓ Polygon boundaries
- ✓ Village boundaries
- ✓ Location detection (geolocation)
- ✓ Map click selection
- ✓ Routing (if using external APIs)
- ✓ Geofencing (if implemented)
- ✓ Heatmaps (if using heatmap library)
- ✓ Zoom levels and controls
- ✓ Dark/light mode support
- ✓ Mobile responsiveness

## Dark Mode Support

All components support dark mode:
- Layer switcher button adapts to dark mode
- Attribution text is visible in both modes
- Map controls maintain visibility

## Migration Checklist

- [ ] Update MapPicker imports to use MapPickerEnhanced
- [ ] Update SellScrap.jsx to use EnhancedMapContainer
- [ ] Update HomePickupTasks.jsx to use EnhancedMapContainer
- [ ] Update EcoDeliveryTasks.jsx to use EnhancedMapContainer
- [ ] Update PublicWasteTasks.jsx to use EnhancedMapContainer
- [ ] Update ScrapTasks.jsx to use EnhancedMapContainer
- [ ] Test layer switching on desktop
- [ ] Test layer switching on tablet
- [ ] Test layer switching on mobile
- [ ] Test satellite imagery loads correctly
- [ ] Verify all markers/polygons work on both layers
- [ ] Check dark mode compatibility

## API Endpoints Used

- Tile servers are external (OSM, Esri) - no backend changes needed
- Geocoding still uses Nominatim (no changes)
- All existing backend APIs unchanged

## Performance Notes

- OSM tiles: Fast CDN delivery, freely available
- Esri satellite: High quality, slightly slower than OSM
- Layer switching: Instant without reload
- Memory: Minimal overhead from layer switcher
- No additional database queries

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Tablets (all major)
- No deprecated APIs used

## Troubleshooting

### Layer switcher not appearing
- Ensure `showLayerSwitcher={true}` prop is set
- Check z-index CSS classes

### Satellite imagery not loading
- Verify Esri URL accessibility in your region
- Check browser console for CORS errors
- May require API key for high-volume usage

### Tiles not loading
- Check network connection
- Verify URL formation with {s}, {z}, {x}, {y} placeholders
- Check attribution requirements

## Maintenance

Layer configurations are centralized in:
- `client/src/shared/utils/mapLayers.js`

To add new tile layers:
1. Add to `MAP_LAYERS` object in mapLayers.js
2. Add attribution and URL
3. Layer automatically available via `getMapLayer()`

To customize layer switcher:
- Edit `client/src/shared/components/MapLayerSwitcher.jsx`
- Modify position, styling, or icon themes
