import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  HiExclamation, HiHome, HiClipboardList, HiCheckCircle, HiClock,
  HiLocationMarker, HiFire, HiFilter, HiMap, HiX, HiFlag, HiAdjustments,
} from 'react-icons/hi';
import ModalOverlay from '../components/ModalOverlay';
import {
  MapContainer, TileLayer, GeoJSON, useMap,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';

// ─────────────────── Constants ───────────────────

const KUNDAPURA_CENTER = [13.6333, 74.6833];
const HOTSPOT_RADIUS = 50; // meters

const HEATMAP_MIN_POINTS = 100;

const STATUS_COLORS = {
  Submitted: '#F59E0B', Verified: '#3B82F6', Assigned: '#8B5CF6',
  'In Progress': '#06B6D4', Resolved: '#22C55E', Rejected: '#EF4444',
  'Under Re-Verification': '#F97316', Reopened: '#EC4899', Cancelled: '#6B7280',
  'Clarification Requested': '#F59E0B', Resubmitted: '#3B82F6',
};

const QUICK_FILTERS = [
  { label: 'All Time', days: null },
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
];

const STATUS_FILTERS = ['All', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const TYPE_FILTERS = ['All', 'Public', 'Home Pickup'];
const PRIORITY_FILTERS = ['All', 'Normal', 'Urgent'];

const INITIAL_STATS = {
  total: 0, publicReports: 0, homePickup: 0, pending: 0, assigned: 0,
  inProgress: 0, completed: 0, rejected: 0, reportsToday: 0,
  reportsThisWeek: 0, reportsThisMonth: 0, mostReportedVillage: 'N/A',
};

// ──────────────── Icon Helpers ──────────────────

const createIcon = (color, label) => L.divIcon({
  className: 'w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 border-white text-xs font-bold',
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label || ''}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const PUBLIC_ICON = createIcon('#EF4444');
const PICKUP_ICON = createIcon('#3B82F6');

const CLUSTER_ICON = (count, color) => L.divIcon({
  className: '',
  html: `<div style="background:${color};width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;border:3px solid rgba(255,255,255,0.8);box-shadow:0 3px 10px rgba(0,0,0,0.4)">${count}</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

// ────────────── Helper Functions ────────────────

const getQuickDateRange = (days) => {
  if (!days) return { startDate: null, endDate: null };
  const now = new Date();
  if (days === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }
  if (days === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  if (days === 0) start.setHours(0, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const detectHotspots = (reports, radius = HOTSPOT_RADIUS) => {
  if (!reports.length) return [];
  const valid = reports.filter(r => r.location?.lat && r.location?.lng);
  const groups = [];
  const assigned = new Set();

  valid.forEach((r, i) => {
    if (assigned.has(i)) return;
    const group = { reports: [r], center: { lat: r.location.lat, lng: r.location.lng } };
    assigned.add(i);
    valid.forEach((r2, j) => {
      if (assigned.has(j)) return;
      const d = haversineDistance(r.location.lat, r.location.lng, r2.location.lat, r2.location.lng);
      if (d <= radius) {
        group.reports.push(r2);
        assigned.add(j);
      }
    });
    if (group.reports.length > 1) {
      const avgLat = group.reports.reduce((s, r) => s + r.location.lat, 0) / group.reports.length;
      const avgLng = group.reports.reduce((s, r) => s + r.location.lng, 0) / group.reports.length;
      group.center = { lat: avgLat, lng: avgLng };
      groups.push(group);
    }
  });
  return groups.sort((a, b) => b.reports.length - a.reports.length);
};

const getDateRangeLabel = (startDate, endDate) => {
  if (!startDate && !endDate) return 'All Time';
  if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  if (startDate) return `From ${formatDate(startDate)}`;
  return `Until ${formatDate(endDate)}`;
};

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// ───────────── Custom Leaflet Components ──────────────

function HeatmapLayer({ points, dark }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !points?.length || points.length < HEATMAP_MIN_POINTS) {
      if (layerRef.current) { map?.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }
    const data = points.map(p => [p.lat, p.lng, 1]);
    if (layerRef.current) { layerRef.current.setLatLngs(data); return; }
    layerRef.current = L.heatLayer(data, {
      radius: 25, blur: 15, maxZoom: 17, max: 1.0,
      gradient: dark ? { 0.2: '#2563eb', 0.5: '#f59e0b', 0.8: '#ef4444' } : { 0.2: '#93c5fd', 0.5: '#fbbf24', 0.8: '#ef4444' },
    }).addTo(map);

    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
  }, [map, points, dark]);

  return null;
}

function MarkerClusterLayer({ reports, onMarkerClick }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!map || typeof L.markerClusterGroup !== 'function') return;
    if (clusterRef.current) { map.removeLayer(clusterRef.current); }

    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => {
        const childs = c.getAllChildMarkers();
        let pub = 0, pick = 0;
        childs.forEach(m => { if (m.reportType === 'Public') pub++; else pick++; });
        const color = pub >= pick ? '#EF4444' : '#3B82F6';
        return CLUSTER_ICON(c.getChildCount(), color);
      },
    });

    const markers = [];
    reports.forEach(r => {
      if (!r.location?.lat || !r.location?.lng) return;
      const isPublic = r.reportType === 'Public';
      const icon = isPublic ? PUBLIC_ICON : PICKUP_ICON;
      const m = L.marker([r.location.lat, r.location.lng], { icon });
      m.reportType = r.reportType;
      m.reportData = r;
      m.bindPopup('', { className: 'leaflet-popup-custom' });
      m.on('click', () => onMarkerClick?.(r));
      m.on('popupopen', () => onMarkerClick?.(r));
      markers.push(m);
    });

    mcg.addLayers(markers);
    map.addLayer(mcg);
    clusterRef.current = mcg;

    return () => { if (clusterRef.current) { map.removeLayer(clusterRef.current); } };
  }, [map, reports, onMarkerClick]);

  return null;
}

function MapBoundsUpdater({ villages }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !villages?.length) return;
    const bounds = L.latLngBounds([]);
    villages.forEach(v => {
      if (v.center?.lat && v.center?.lng) bounds.extend([v.center.lat, v.center.lng]);
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 11 });
      map.setMinZoom(map.getBoundsZoom(bounds));
    } else {
      map.setView(KUNDAPURA_CENTER, 10);
    }
  }, [map, villages]);
  return null;
}



// ─────────────── Sub-Components ─────────────────

function StatsCards({ stats, dark, dk, loading }) {
  const cards = [
    { label: 'Total Reports', value: stats.total, icon: HiClipboardList, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Public Waste', value: stats.publicReports, icon: HiExclamation, color: 'from-red-500 to-red-600' },
    { label: 'Home Pickup', value: stats.homePickup, icon: HiHome, color: 'from-blue-500 to-blue-600' },
    { label: 'Pending', value: stats.pending, icon: HiClock, color: 'from-amber-500 to-amber-600' },
    { label: 'Completed', value: stats.completed, icon: HiCheckCircle, color: 'from-green-500 to-green-600' },
  ];
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {cards.map((_, i) => (
          <div key={i} className={`h-16 rounded-lg animate-pulse ${dk('bg-slate-800', 'bg-slate-100')}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-lg px-2.5 py-2 bg-gradient-to-br ${c.color} text-white shadow-sm`}>
          <div className="flex items-center gap-1.5">
            <c.icon className="h-3 w-3 opacity-80 shrink-0" />
            <span className="text-[10px] font-medium opacity-90 truncate">{c.label}</span>
          </div>
          <p className="text-lg font-bold mt-0.5 tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function FilterBar({
  filters, setFilters, villages, collectors, dark, dk,
  quickFilter, setQuickFilter, activeHotspots,
}) {
  const [showMore, setShowMore] = useState(false);
  const inp = `w-full rounded-lg border py-1.5 px-2.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
    dark ? 'bg-white/5 border-gray-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  }`;

  return (
    <div className={`rounded-lg border px-3 py-2 space-y-2 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
      {/* Row 1: Quick Filters + Village + Status + More */}
      <div className="flex flex-wrap items-center gap-1.5">
        <HiFilter className={`h-3.5 w-3.5 shrink-0 ${dk('text-slate-400', 'text-slate-500')}`} />
        {QUICK_FILTERS.map(qf => (
          <button key={qf.label}
            onClick={() => { setQuickFilter(qf.label); setFilters(f => ({ ...f, ...getQuickDateRange(qf.days) })); }}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              quickFilter === qf.label
                ? 'bg-green-500 text-white shadow-sm'
                : dk('text-slate-300 hover:bg-slate-700', 'text-slate-600 hover:bg-slate-100')
            }`}
          >{qf.label}</button>
        ))}
        <div className="border-l border-gray-600/30 h-5 mx-1" />
        <select value={filters.village} onChange={e => setFilters(f => ({ ...f, village: e.target.value }))}
          className={`text-[11px] rounded border px-2 py-1 max-w-[130px] ${dk('bg-slate-800 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')}`}>
          <option value="">All Villages</option>
          {villages.map(v => <option key={v.name || v.village} value={v.name || v.village}>{v.name || v.village}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className={`text-[11px] rounded border px-2 py-1 max-w-[120px] ${dk('bg-slate-800 border-gray-700 text-slate-200', 'bg-white border-slate-200 text-slate-700')}`}>
          <option value="">All Status</option>
          {STATUS_FILTERS.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowMore(!showMore)}
          className={`ml-auto px-2 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
            dk('text-slate-400 hover:bg-slate-700', 'text-slate-500 hover:bg-slate-100')
          }`}>
          <HiAdjustments className="h-3 w-3" />
          {showMore ? 'Less' : 'More'}
        </button>
      </div>

      {/* Active date range indicator */}
      {filters.startDate || filters.endDate ? (
        <div className={`text-[10px] ${dk('text-slate-400', 'text-slate-500')}`}>
          {getDateRangeLabel(filters.startDate, filters.endDate)}
          <button onClick={() => { setQuickFilter('All Time'); setFilters(f => ({ ...f, startDate: null, endDate: null })); }}
            className="ml-2 text-green-500 hover:text-green-400 font-medium">Clear</button>
        </div>
      ) : null}

      {/* More Filters Drawer */}
      {showMore && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-dashed border-gray-700/30">
          <div>
            <label className={`text-[10px] font-medium block mb-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>From</label>
            <input type="date" value={filters.startDate?.split('T')[0] || ''} onChange={e => {
              setFilters(f => ({ ...f, startDate: e.target.value ? new Date(e.target.value).toISOString() : null }));
              setQuickFilter('Custom');
            }} className={inp} />
          </div>
          <div>
            <label className={`text-[10px] font-medium block mb-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>To</label>
            <input type="date" value={filters.endDate?.split('T')[0] || ''} onChange={e => {
              setFilters(f => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : null }));
              setQuickFilter('Custom');
            }} className={inp} />
          </div>
          <div>
            <label className={`text-[10px] font-medium block mb-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Type</label>
            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className={inp}>
              {TYPE_FILTERS.map(t => <option key={t} value={t === 'All' ? '' : t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-[10px] font-medium block mb-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Priority</label>
            <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} className={inp}>
              {PRIORITY_FILTERS.map(p => <option key={p} value={p === 'All' ? '' : p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-[10px] font-medium block mb-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Collector</label>
            <select value={filters.collector} onChange={e => setFilters(f => ({ ...f, collector: e.target.value }))} className={inp}>
              <option value="">All</option>
              {collectors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function HotspotPanel({ hotspots, dark, dk, onZoomTo, loading }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (loading) {
    return (
      <div className={`rounded-lg border p-3 ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <div className={`h-4 w-32 rounded animate-pulse mb-3 ${dk('bg-slate-700', 'bg-slate-200')}`} />
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-12 rounded animate-pulse mb-2 ${dk('bg-slate-800', 'bg-slate-100')}`} />
        ))}
      </div>
    );
  }
  if (!hotspots.length) {
    return (
      <div className={`rounded-lg border p-4 text-center ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
        <HiFire className={`h-6 w-6 mx-auto mb-1 ${dk('text-slate-600', 'text-slate-300')}`} />
        <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>No hotspots detected</p>
      </div>
    );
  }
  return (
    <div className={`rounded-lg border ${dk('bg-white/5 border-gray-700', 'bg-white border-slate-100')}`}>
      <div className="px-3 py-2 border-b border-dashed flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HiFire className={`h-4 w-4 text-orange-500`} />
          <span className={`text-xs font-bold ${dk('text-slate-300', 'text-slate-700')}`}>Top Hotspots</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold`}>
          {hotspots.length}
        </span>
      </div>
      <div className="divide-y divide-gray-700/20 max-h-[300px] overflow-y-auto [scrollbar-width:none]">
        {hotspots.slice(0, 20).map((hs, idx) => {
          const isOpen = openIdx === idx;
          const total = hs.reports.length;
          const pubCount = hs.reports.filter(r => r.reportType === 'Public').length;
          const pickCount = hs.reports.filter(r => r.reportType === 'Home Pickup').length;
          const statusBreakdown = {};
          hs.reports.forEach(r => { statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1; });
          return (
            <div key={idx}>
              <button
                onClick={() => { setOpenIdx(isOpen ? null : idx); onZoomTo?.(hs.center.lat, hs.center.lng, 16); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition hover:bg-black/5 ${
                  isOpen ? dk('bg-slate-700/50', 'bg-slate-50') : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === 0 ? 'bg-red-500 text-white' : idx < 3 ? 'bg-orange-500 text-white' : idx < 5 ? 'bg-amber-500 text-white' : dk('bg-slate-600 text-slate-300', 'bg-slate-200 text-slate-600')
                  }`}>{idx + 1}</span>
                  <span className={`text-xs font-semibold truncate ${dk('text-slate-300', 'text-slate-700')}`}>
                    Hotspot #{idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold ${dk('text-slate-300', 'text-slate-700')}`}>{total}</span>
                  <HiFire className={`h-3 w-3 ${dk('text-orange-500', 'text-orange-400')}`} />
                </div>
              </button>
              {isOpen && (
                <div className={`px-3 pb-2 space-y-1.5 ${dk('bg-slate-700/30', 'bg-slate-50')}`}>
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-red-500 font-semibold">{pubCount} Public</span>
                    <span className="text-blue-500 font-semibold">{pickCount} Pickup</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(statusBreakdown).map(([s, c]) => (
                      <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium`}
                        style={{ background: STATUS_COLORS[s] + '20', color: STATUS_COLORS[s] }}
                      >{s}: {c}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hs.reports.slice(0, 5).map(r => (
                      <span key={r._id} className={`text-[9px] px-1 py-0.5 rounded ${dk('bg-slate-600 text-slate-300', 'bg-slate-200 text-slate-600')}`}>
                        {r.reportId}
                      </span>
                    ))}
                    {hs.reports.length > 5 && (
                      <span className={`text-[9px] px-1 py-0.5 rounded ${dk('text-slate-500', 'text-slate-400')}`}>
                        +{hs.reports.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



function ReportPopup({ report, dark, dk, onClose }) {
  if (!report) return null;
  const { location, userId } = report;
  return (
    <ModalOverlay onClose={onClose} className="flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pointer-events-auto ${
        dk('bg-slate-900 border border-gray-700', 'bg-white border border-slate-200')
      }`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: dark ? 'rgba(55,65,81,0.5)' : 'rgba(226,232,240,0.5)' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${report.reportType === 'Public' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <span className={`text-xs font-bold truncate ${dk('text-white', 'text-slate-900')}`}>{report.reportId}</span>
          </div>
          <button onClick={onClose} className={`p-0.5 rounded shrink-0 ${dk('text-slate-400 hover:bg-slate-700', 'text-slate-500 hover:bg-slate-100')}`}>
            <HiX className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-3 py-2 space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${dk('text-slate-400', 'text-slate-500')}`}>{report.reportType}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold`}
              style={{ background: (STATUS_COLORS[report.status] || '#6B7280') + '20', color: STATUS_COLORS[report.status] || '#6B7280' }}
            >{report.status}</span>
            {report.priorityLevel && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${report.priorityLevel === 'Urgent' ? 'text-red-500' : 'text-blue-500'}`}>
                <HiFlag className="h-2.5 w-2.5" />{report.priorityLevel}
              </span>
            )}
          </div>
          <div className={`${dk('text-slate-300', 'text-slate-600')}`}>
            {userId?.name && <span>{userId.name} · </span>}
            {report.village && <span>{report.village} · </span>}
            <span>{formatDate(report.createdAt)}</span>
          </div>
          <a href={`https://www.google.com/maps?q=${location?.lat},${location?.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 text-[10px] font-semibold">
            <HiLocationMarker className="h-3 w-3" />
            Open in Maps
          </a>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────── Main Component ──────────────────

const WasteIntelligenceMap = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const { socket } = useSocket();

  // ── Data State ──
  const [allReports, setAllReports] = useState([]);
  const [villages, setVillages] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── UI State ──
  const [filters, setFilters] = useState({
    startDate: null, endDate: null, village: '', type: '', status: '', collector: '', priority: '',
  });
  const [quickFilter, setQuickFilter] = useState('All Time');
  const [viewMode, setViewMode] = useState('normal'); // 'normal' | 'heatmap'
  const [showVillageBoundaries, setShowVillageBoundaries] = useState(true);
  const [showHotspots, setShowHotspots] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [hotspots, setHotspots] = useState([]);

  // ── Taluk Boundary (computed) ──
  const talukBoundary = useMemo(() => {
    const withBounds = villages.filter(v => v.boundary?.coordinates?.length);
    if (!withBounds.length) return null;
    const coords = withBounds.map(v => v.boundary.coordinates);
    if (coords.length === 1) return { type: 'MultiPolygon', coordinates: coords };
    return { type: 'MultiPolygon', coordinates: coords };
  }, [villages]);

  // ── Filtered Reports ──
  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      if (filters.type && r.reportType !== filters.type) return false;
      if (filters.village && r.village !== filters.village && r.village !== filters.village) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.priority && r.priorityLevel !== filters.priority) return false;
      if (filters.collector && r.assignedCollector?._id !== filters.collector) return false;
      if (filters.startDate || filters.endDate) {
        const d = new Date(r.createdAt);
        if (filters.startDate && d < new Date(filters.startDate)) return false;
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
      return true;
    });
  }, [allReports, filters]);

  // ── Data Fetching ──
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    const token = localStorage.getItem('admin-token');
    if (!token) { setLoading(false); return; }

    const safeJson = async (res) => {
      if (!res.ok) {
        if (res.status === 401) { localStorage.removeItem('admin-token'); localStorage.removeItem('admin-user'); window.location.href = '/admin/login'; return null; }
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json') && !ct.includes('text/json')) {
        const text = await res.text().catch(() => '');
        if (!text) return null;
        try { return JSON.parse(text); } catch { return null; }
      }
      return res.json();
    };

    let reports = [];
    let villages = [];
    let collectors = [];

    try {
      const reportsRes = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeJson(reportsRes);
      if (data) reports = data.reports || [];
    } catch (e) { setError('Failed to load reports: ' + e.message); }

    try {
      const villagesRes = await fetch('/api/villages');
      const data = await safeJson(villagesRes);
      if (data) villages = Array.isArray(data) ? data : data.villages || [];
    } catch (e) { setError(prev => prev || 'Failed to load villages: ' + e.message); }

    try {
      const collectorsRes = await fetch('/api/admin/collectors', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeJson(collectorsRes);
      if (data) collectors = data.collectors || data || [];
    } catch (e) { setError(prev => prev || 'Failed to load collectors: ' + e.message); }

    // Check for token expiry (all three return 401)
    if (!token || localStorage.getItem('admin-token') !== token) return;

    setAllReports(reports);
    setVillages(villages);
    setCollectors(Array.isArray(collectors) ? collectors : []);

    const total = reports.length;
    const publicReports = reports.filter(r => r.reportType === 'Public').length;
    const homePickup = reports.filter(r => r.reportType === 'Home Pickup').length;
    const pending = reports.filter(r => ['Submitted', 'Verified', 'Under Re-Verification', 'Clarification Requested', 'Resubmitted'].includes(r.status)).length;
    const assigned = reports.filter(r => r.status === 'Assigned').length;
    const inProgress = reports.filter(r => r.status === 'In Progress').length;
    const completed = reports.filter(r => r.status === 'Resolved').length;
    const rejected = reports.filter(r => r.status === 'Rejected').length;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const reportsToday = reports.filter(r => new Date(r.createdAt) >= startOfToday).length;
    const reportsThisWeek = reports.filter(r => new Date(r.createdAt) >= startOfWeek).length;
    const reportsThisMonth = reports.filter(r => new Date(r.createdAt) >= startOfMonth).length;
    const villageCounts = {};
    reports.forEach(r => { const v = r.village || 'Unknown'; villageCounts[v] = (villageCounts[v] || 0) + 1; });
    const mostReportedVillage = Object.entries(villageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    setStats({ total, publicReports, homePickup, pending, assigned, inProgress, completed, rejected, reportsToday, reportsThisWeek, reportsThisMonth, mostReportedVillage });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Hotspot Computation ──
  useEffect(() => {
    setHotspots(detectHotspots(filteredReports));
  }, [filteredReports]);

  // ── Socket Real-time Sync ──
  useEffect(() => {
    if (!socket) return;
    const onReportCreated = (report) => {
      setAllReports(prev => {
        if (prev.some(r => r._id === report._id)) return prev;
        return [report, ...prev];
      });
    };
    const onReportUpdated = (updated) => {
      setAllReports(prev => prev.map(r => r._id === updated._id ? updated : r));
    };
    const onReportsUpdated = () => { fetchData(false); };
    const onCollectorUpdated = () => { fetchData(false); };

    socket.on('report_created', onReportCreated);
    socket.on('report_updated', onReportUpdated);
    socket.on('reports_updated', onReportsUpdated);
    socket.on('collector_updated', onCollectorUpdated);

    return () => {
      socket.off('report_created', onReportCreated);
      socket.off('report_updated', onReportUpdated);
      socket.off('reports_updated', onReportsUpdated);
      socket.off('collector_updated', onCollectorUpdated);
    };
  }, [socket, fetchData]);

  // ── Village Boundary GeoJSON styling ──
  const villageStyle = useCallback(() => ({
    color: dark ? '#4B5563' : '#9CA3AF',
    weight: 1,
    fillColor: dark ? '#374151' : '#E5E7EB',
    fillOpacity: 0.1,
  }), [dark]);

  const talukStyle = useCallback(() => ({
    color: '#059669',
    weight: 3,
    fillColor: dark ? '#065F46' : '#D1FAE5',
    fillOpacity: 0.08,
    dashArray: '8 4',
  }), [dark]);

  const mapRef = useRef(null);

  // ── Handlers ──
  const handleZoomTo = useCallback((lat, lng, zoom = 14) => {
    if (mapRef.current) mapRef.current.setView([lat, lng], zoom);
  }, []);

  // ── Heatmap Points ──
  const heatmapPoints = useMemo(() => {
    return filteredReports
      .filter(r => r.location?.lat && r.location?.lng)
      .map(r => ({ lat: r.location.lat, lng: r.location.lng, intensity: 1 }));
  }, [filteredReports]);

  // ── Render ──
  return (
    <div className={`h-full flex flex-col ${dark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="px-3 sm:px-4 lg:px-5 pt-3 pb-2 space-y-2 shrink-0 max-w-[1600px] mx-auto w-full">
        {/* Header + Stats + Filters — compact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiMap className={`h-4 w-4 ${dk('text-green-400', 'text-green-600')}`} />
            <h1 className={`text-sm sm:text-base font-bold ${dk('text-white', 'text-slate-900')}`}>Waste Intelligence Map</h1>
            {error && <span className="text-[10px] text-red-500 ml-2">{error}</span>}
          </div>
          <span className={`text-[11px] tabular-nums ${dk('text-slate-400', 'text-slate-500')}`}>
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
        </div>

        <StatsCards stats={stats} dark={dark} dk={dk} loading={loading} />
        <FilterBar
          filters={filters} setFilters={setFilters}
          villages={villages} collectors={collectors}
          dark={dark} dk={dk}
          quickFilter={quickFilter} setQuickFilter={setQuickFilter}
          activeHotspots={hotspots.length}
        />
      </div>

      {/* Map — fills remaining height */}
      <div className="flex-1 relative mx-3 sm:mx-4 lg:mx-5 mb-3" style={{ maxWidth: 'calc(1600px - 40px)' }}>
        {/* Map Controls Overlay */}
        <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-1.5">
          {heatmapPoints.length >= HEATMAP_MIN_POINTS && (
            <button
              onClick={() => setViewMode(v => v === 'heatmap' ? 'normal' : 'heatmap')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-lg transition flex items-center gap-1 ${
                viewMode === 'heatmap'
                  ? 'bg-orange-500 text-white'
                  : dk('bg-slate-800 text-slate-200 hover:bg-slate-700', 'bg-white text-slate-700 hover:bg-slate-50')
              }`}
            >
              {viewMode === 'heatmap' ? 'Map' : 'Heatmap'}
            </button>
          )}
          <button
            onClick={() => setShowVillageBoundaries(v => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-lg transition ${
              showVillageBoundaries
                ? dk('bg-green-600 text-white', 'bg-green-500 text-white')
                : dk('bg-slate-800 text-slate-200 hover:bg-slate-700', 'bg-white text-slate-700 hover:bg-slate-50')
            }`}
          >
            Villages
          </button>
          <button
            onClick={() => setShowHotspots(v => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-lg transition ${
              showHotspots
                ? 'bg-orange-500 text-white'
                : dk('bg-slate-800 text-slate-200 hover:bg-slate-700', 'bg-white text-slate-700 hover:bg-slate-50')
            }`}
          >
            Hotspots
          </button>
        </div>

        <MapContainer
          center={KUNDAPURA_CENTER}
          zoom={10}
          className="w-full h-full rounded-lg z-0"
          zoomControl={true}
          scrollWheelZoom={true}
          maxBounds={null}
          minZoom={9}
          maxZoom={18}
        >
          <MapRefSetter mapRef={mapRef} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsUpdater villages={villages} reports={filteredReports} />

          {talukBoundary && (
            <GeoJSON data={talukBoundary} style={talukStyle} />
          )}

          {showVillageBoundaries && villages.map((v, i) => (
            v.boundary?.coordinates?.length ? (
              <GeoJSON key={v._id || i} data={v.boundary} style={villageStyle} />
            ) : null
          ))}

          {showHotspots && hotspots.slice(0, 20).map((hs, i) => (
            <Circle key={i} center={[hs.center.lat, hs.center.lng]} radius={HOTSPOT_RADIUS}
              pathOptions={{ color: i === 0 ? '#EF4444' : i < 3 ? '#F97316' : '#F59E0B', fillColor: i === 0 ? '#EF4444' : i < 3 ? '#F97316' : '#F59E0B', fillOpacity: 0.15, weight: 2, dashArray: '4 4' }}
            />
          ))}

          {viewMode === 'normal' && (
            <MarkerClusterLayer reports={filteredReports} onMarkerClick={setSelectedReport} />
          )}

          {viewMode === 'heatmap' && heatmapPoints.length >= HEATMAP_MIN_POINTS && (
            <HeatmapLayer points={heatmapPoints} dark={dark} />
          )}
        </MapContainer>

        {/* Hotspot Panel — floating overlay on the map */}
        {showHotspots && (
          <div className="absolute top-12 left-2 z-[1000] w-64 max-w-[50vw] max-h-[60vh] overflow-y-auto rounded-lg shadow-xl [scrollbar-width:thin]">
            <HotspotPanel hotspots={hotspots} dark={dark} dk={dk} onZoomTo={handleZoomTo} loading={loading} />
          </div>
        )}
      </div>

      {selectedReport && <ReportPopup report={selectedReport} dark={dark} dk={dk} onClose={() => setSelectedReport(null)} />}
    </div>
  );
};

export default WasteIntelligenceMap;
