import { useState } from 'react';
import { HiOutlineViewGrid, HiOutlinePhotograph } from 'react-icons/hi';

const MapLayerSwitcher = ({ currentLayer, onLayerChange, position = 'top-right' }) => {
  const [expanded, setExpanded] = useState(false);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const layers = [
    {
      id: 'osm',
      label: 'Map',
      icon: <HiOutlineViewGrid className="h-5 w-5" />,
      description: 'OpenStreetMap',
    },
    {
      id: 'satellite',
      label: 'Satellite',
      icon: <HiOutlinePhotograph className="h-5 w-5" />,
      description: 'Esri World Imagery',
    },
  ];

  return (
    <div className={`absolute ${positionClasses[position] || positionClasses['top-right']} z-[400] flex flex-col gap-1`}>
      {expanded && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-2 flex flex-col gap-1">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => {
                onLayerChange(layer.id);
                setExpanded(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                currentLayer === layer.id
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title={layer.description}
            >
              {layer.icon}
              {layer.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 shadow-lg transition flex items-center justify-center"
        title="Toggle map layers"
      >
        <HiOutlineViewGrid className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
};

export default MapLayerSwitcher;
