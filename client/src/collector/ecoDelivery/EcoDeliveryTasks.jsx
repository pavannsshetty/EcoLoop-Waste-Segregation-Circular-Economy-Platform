import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiLocationMarker, HiRefresh, HiUser, HiCheckCircle, HiPhone, HiTag, HiMap } from 'react-icons/hi';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import { useSocket } from '../../shared/context/SocketContext';
import { getMapLayer } from '../../shared/utils/mapLayers';
import MapLayerSwitcher from '../../shared/components/MapLayerSwitcher';
import RouteMapModal from '../../shared/components/RouteMapModal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const staCls = (st, dk) => {
  const map = {
    'Pending':         dk('bg-gray-900/40 text-gray-400', 'bg-gray-100 text-gray-700'),
    'Assigned':        dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'Out for Delivery': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    'Delivered':       dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
  };
  return map[st] || map.Pending;
};

const EcoDeliveryTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('token');
  const [mapLayer, setMapLayer] = useState('osm');
  const [routeMapTarget, setRouteMapTarget] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${API}/api/collector/deliveries`
        : `${API}/api/collector/deliveries?filter=${filter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setLoading(false); }
  }, [filter, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handleNewDelivery = () => fetchOrders();
    const handleOrderUpdate = () => fetchOrders();
    socket.on('new_delivery', handleNewDelivery);
    socket.on('ECO_SHOPPING_ORDER_UPDATED', handleOrderUpdate);
    return () => {
      socket.off('new_delivery', handleNewDelivery);
      socket.off('ECO_SHOPPING_ORDER_UPDATED', handleOrderUpdate);
    };
  }, [socket, fetchOrders]);

  const acceptDelivery = async (id) => {
    try {
      const res = await fetch(`${API}/api/collector/delivery/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchOrders();
    } catch {}
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/collector/delivery/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchOrders();
    } catch {}
  };

  const goToDestination = (o) => {
    setRouteMapTarget(o);
  };

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {routeMapTarget && (
        <RouteMapModal
          report={routeMapTarget}
          onClose={() => setRouteMapTarget(null)}
          dk={dk}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Eco Shopping Deliveries</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage product delivery orders</p>
        </div>
        <button type="button" onClick={fetchOrders}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')} aria-label="Refresh">
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          <option value="all">All</option>
          <option value="Pending">Pending</option>
          <option value="Assigned">Assigned</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No deliveries found.</div>
      ) : (
        orders.map((o) => {
          const hasCoords = o.deliveryLatitude && o.deliveryLongitude;
          return (
            <div key={o._id}
              className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-700 text-white">Delivery</span>
                    {o.itemId?.itemName && <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{o.itemId.itemName}</p>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(o.deliveryStatus, dk)}`}>{o.deliveryStatus}</span>
                  </div>
                  {o.userId && (
                    <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                      <HiUser className="h-3 w-3 text-purple-500 shrink-0" /> {o.userId.name || 'Unknown'}
                    </p>
                  )}
                  {o.userId?.phone && (
                    <p className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiPhone className="h-3 w-3 text-purple-500 shrink-0" /> {o.userId.phone}
                    </p>
                  )}
                  {o.deliveryAddress && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiLocationMarker className="h-3 w-3 text-purple-500 shrink-0" />
                      <span className="truncate">{o.deliveryAddress}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className={`text-xs flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                      <HiTag className="h-3 w-3 shrink-0" /> ₹{o.finalAmount}
                    </p>
                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>{o.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {hasCoords && (
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <MapContainer center={[o.deliveryLatitude, o.deliveryLongitude]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full z-10">
                    {(() => {
                      const currentLayer = getMapLayer(mapLayer);
                      return (
                        <TileLayer
                          key={`tile-${mapLayer}`}
                          attribution={currentLayer.attribution}
                          url={currentLayer.url}
                          maxZoom={currentLayer.maxZoom}
                          minZoom={currentLayer.minZoom}
                        />
                      );
                    })()}
                    <MapLayerSwitcher currentLayer={mapLayer} onLayerChange={setMapLayer} position="top-right" />
                    <Marker position={[o.deliveryLatitude, o.deliveryLongitude]} />
                  </MapContainer>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {o.deliveryStatus === 'Pending' && !o.assignedCollector && (
                  <button type="button" onClick={() => acceptDelivery(o._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                    Accept Delivery
                  </button>
                )}
                {hasCoords && o.deliveryStatus !== 'Delivered' && (
                  <button type="button" onClick={() => goToDestination(o)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${dk('border-purple-800/50 text-purple-400 hover:bg-purple-900/30', 'border-purple-200 text-purple-600 hover:bg-purple-50')}`}>
                    <HiMap className="h-3.5 w-3.5" /> Navigate
                  </button>
                )}
                {o.deliveryStatus === 'Assigned' && (
                  <button type="button" onClick={() => updateDeliveryStatus(o._id, 'Out for Delivery')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition">
                    Out for Delivery
                  </button>
                )}
                {o.deliveryStatus === 'Out for Delivery' && (
                  <button type="button" onClick={() => updateDeliveryStatus(o._id, 'Delivered')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition">
                    Mark Delivered
                  </button>
                )}
                {o.deliveryStatus === 'Delivered' && (
                  <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                    <HiCheckCircle className="h-3.5 w-3.5" /> Delivered
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default EcoDeliveryTasks;