import { useEffect, useState, useRef, Fragment } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiPhone, HiUser, HiCheckCircle, HiMap, HiFlag, HiExclamation } from 'react-icons/hi';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import socket from '../../socket';
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

const fmtDt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const sevCls = (sev, dk) => {
  const map = {
    High: dk('bg-red-900/40 text-red-400 border-red-800', 'bg-red-100 text-red-700 border-red-200'),
    Medium: dk('bg-yellow-900/40 text-yellow-400 border-yellow-800', 'bg-yellow-100 text-yellow-800 border-yellow-200'),
    Low: dk('bg-green-900/40 text-green-400 border-green-800', 'bg-green-100 text-green-700 border-green-200'),
  };
  return map[sev] || map.Low;
};

const staCls = (st, dk) => {
  const map = {
    Submitted:   dk('bg-slate-700 text-slate-300', 'bg-yellow-100 text-yellow-800'),
    Verified:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    Arrived:     dk('bg-teal-900/40 text-teal-400', 'bg-teal-100 text-teal-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Resolved:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Completed:   dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Delayed:     dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700'),
  };
  return map[st] || map.Submitted;
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DetailModal = ({ report, onClose, dk }) => {
  const [dmMapLayer, setDmMapLayer] = useState('osm');
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Citizen Details</p>
            <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>
          {report.reportId && (
            <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
              {report.reportId}
            </span>
          )}
          <div>
            <p className={`text-xs ${label}`}>Citizen</p>
            <div className={`flex items-center gap-2 ${value}`}>
              <HiUser className="h-4 w-4 text-green-500" />
              <span className="font-medium">{report.userId?.name || 'Unknown Citizen'}</span>
            </div>
          </div>
          {report.userId?.phone && (
            <div>
              <p className={`text-xs ${label}`}>Phone</p>
              <a href={`tel:${report.userId.phone}`}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:underline break-all">
                <HiPhone className="h-4 w-4 shrink-0" /> {report.userId.phone}
              </a>
            </div>
          )}
          {report.userId?.email && (
            <div>
              <p className={`text-xs ${label}`}>Email</p>
              <p className={`text-sm ${value} break-all`}>{report.userId.email}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Pickup Address</p>
            <p className={`text-sm ${value}`}>
              {[report.houseNo, report.street, report.village, report.landmark].filter(Boolean).join(', ')}
            </p>
          </div>
          {report.location?.lat && report.location?.lng && (
            <div className={`flex items-center gap-2 flex-wrap ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-4 w-4 shrink-0" />
              <span className={`text-xs font-semibold ${dk('text-green-400', 'text-green-700')}`}>GPS Verified Location</span>
              <div className={`text-[10px] font-mono ${dk('text-slate-500', 'text-slate-400')}`}>
                ({report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)})
              </div>
            </div>
          )}
          {report.location?.lat && report.location?.lng && (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <MapContainer
                key={`detail-${report._id}`}
                center={[report.location.lat, report.location.lng]}
                zoom={15}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                className="w-full h-full z-10"
              >
                {(() => {
                  const currentLayer = getMapLayer(dmMapLayer);
                  return (
                    <TileLayer
                      key={`tile-${dmMapLayer}`}
                      attribution={currentLayer.attribution}
                      url={currentLayer.url}
                      maxZoom={currentLayer.maxZoom}
                      minZoom={currentLayer.minZoom}
                    />
                  );
                })()}
                <MapLayerSwitcher currentLayer={dmMapLayer} onLayerChange={setDmMapLayer} position="top-right" />
                <Marker position={[report.location.lat, report.location.lng]} />
              </MapContainer>
            </div>
          )}
          {report.location?.address && (
            <p className={`text-xs ${value}`}>{report.location.address}</p>
          )}
          <div>
            <p className={`text-xs ${label}`}>Priority</p>
            <p className={`text-sm font-medium ${value}`}>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                report.priorityLevel === 'Urgent'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                <HiFlag className="h-3 w-3" /> {report.priorityLevel || 'Normal'}
              </span>
            </p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Waste Type</p>
            <p className={`text-sm font-medium ${value}`}>{report.wasteType || 'N/A'}</p>
          </div>
          {report.quantity && (
            <div>
              <p className={`text-xs ${label}`}>Quantity</p>
              <p className={`text-sm font-medium ${value}`}>{report.quantity}</p>
            </div>
          )}
          {report.description && (
            <div>
              <p className={`text-xs ${label}`}>Description</p>
              <p className={`text-sm ${value}`}>{report.description}</p>
            </div>
          )}
          {report.completionPhoto && (
            <div>
              <p className={`text-xs ${label}`}>Completion Photo</p>
              <img src={report.completionPhoto} alt="Completed" className="w-full max-w-full h-auto max-h-40 rounded-lg object-cover mt-1" />
            </div>
          )}
          {report.completionNotes && (
            <div>
              <p className={`text-xs ${label}`}>Completion Notes</p>
              <p className={`text-sm ${value}`}>{report.completionNotes}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(report.status, dk)}`}>{report.status}</span>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Created</p>
            <p className={`text-sm ${value}`}>{fmtDt(report.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RevokeConfirmModal = ({ report, onClose, onRevoke, dk, loading }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-sm max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Revoke Completion</p>
            <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>
          <div className={`p-3 rounded-lg border ${dk('bg-red-900/10 border-red-800/30', 'bg-red-50 border-red-200')}`}>
            <p className={`text-sm font-medium ${dk('text-red-300', 'text-red-700')}`}>
              Are you sure you want to revoke this completed report?
            </p>
            <p className={`text-xs mt-1 ${dk('text-red-400/70', 'text-red-500/70')}`}>
              The report will be restored to active status and will not count as completed.
            </p>
          </div>
          <div className="space-y-1 text-xs">
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Report: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span>
            </p>
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Waste: <span className="font-medium">{report.wasteType}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button type="button" onClick={onClose}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50')}`}>
              Cancel
            </button>
            <button type="button" onClick={onRevoke} disabled={loading}
              className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-500 transition disabled:opacity-60">
              {loading ? 'Revoking...' : 'Yes, Revoke'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompletePickupModal = ({ report, onClose, onDone, dk }) => {
  const [photo, setPhoto] = useState('');
  const [preview, setPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhoto(`[photo:${f.name}]`);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!photo) {
      setError('Completion photo is required.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('completionPhoto', file);
      fd.append('status', 'Resolved');
      fd.append('completionNotes', notes);
      const res = await fetch(`${API}/api/collector/report/${report._id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message);
        return;
      }
      const data = await res.json();
      onDone(data.report);
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const input = dk(
    'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500',
    'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
  );
  const dash = dk('border-slate-600 hover:border-green-500', 'border-slate-300 hover:border-green-500');
  const btnGhost = dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-md max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Complete Pickup</p>
            <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${label}`}>
              Completion Photo <span className="text-red-500">*</span>
            </label>
            <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-5 transition ${dash}`}>
              {preview ? (
                <img src={preview} alt="" className="h-28 w-full max-w-full rounded-lg object-cover" />
              ) : (
                <>
                  <HiPhotograph className={`h-8 w-8 ${dk('text-slate-500', 'text-slate-400')}`} />
                  <span className={`text-xs ${label}`}>Upload completion photo</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${label}`}>Completion Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what was done..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button type="button" onClick={onClose} className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${btnGhost}`}>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={loading}
              className="flex-1 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60">
              {loading ? 'Completing...' : 'Complete Pickup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VerificationModal = ({ report, onClose, onVerify, dk }) => {
  const [vmMapLayer, setVmMapLayer] = useState('osm');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');
  const input = dk('border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500', 'border-slate-200 bg-white text-slate-900 placeholder-slate-400');

  const submitVerify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/report/${report._id}/collector-verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, checklist: { wasteVisible: true, typeCorrect: true, descriptionMatches: true, locationReasonable: true } }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onVerify(data.report);
      onClose();
    } catch {} finally { setLoading(false); }
  };

  const submitReject = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/report/${report._id}/collector-verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, action: 'reject' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onVerify(data.report);
      onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Verify Pickup Request</p>
            <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
              <HiX className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <p className={label}>Request: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span></p>
            <p className={label}>Citizen: <span className="font-medium">{report.userId?.name}</span></p>
            <p className={label}>Waste: <span className="font-medium">{report.wasteType}</span></p>
          </div>
          {report.description && (
            <div>
              <p className={`text-xs mb-1 block ${label}`}>Description</p>
              <p className={`text-sm ${value}`}>{report.description}</p>
            </div>
          )}
          <div>
            <p className={`text-xs mb-1 block ${label}`}>Pickup Address</p>
            <p className={`text-xs ${value}`}>{[report.houseNo, report.street, report.village, report.landmark].filter(Boolean).join(', ')}</p>
            {report.location?.lat && report.location?.lng && (
              <div className="mt-1 relative w-full h-24 rounded-lg overflow-hidden border">
                <MapContainer key={`verify-${report._id}`} center={[report.location.lat, report.location.lng]} zoom={14} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full z-10">
                  {(() => {
                    const currentLayer = getMapLayer(vmMapLayer);
                    return (
                      <TileLayer key={`tile-${vmMapLayer}`} attribution={currentLayer.attribution} url={currentLayer.url} maxZoom={currentLayer.maxZoom} minZoom={currentLayer.minZoom} />
                    );
                  })()}
                  <MapLayerSwitcher currentLayer={vmMapLayer} onLayerChange={setVmMapLayer} position="top-right" />
                  <Marker position={[report.location.lat, report.location.lng]} />
                </MapContainer>
              </div>
            )}
          </div>
          <div>
            <label className={`text-xs mb-1 block ${label}`}>Verification Notes <span className="text-slate-500">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your verification..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`} />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
            <button type="button" onClick={onClose}
              className={`sm:flex-1 rounded-lg border py-1 text-sm font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50')}`}>Cancel</button>
            <button type="button" onClick={submitReject} disabled={loading}
              className={`sm:flex-1 rounded-lg border py-1 text-sm font-semibold transition disabled:opacity-50 ${dk('border-red-700 text-red-400 hover:bg-red-900/30', 'border-red-300 text-red-700 hover:bg-red-50')}`}>
              Reject Request
            </button>
            <button type="button" onClick={submitVerify} disabled={loading}
              className="sm:flex-1 rounded-lg bg-green-600 text-white py-1 text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkflowProgress = ({ status, dk }) => {
  const steps = [
    { key: 'Verified', label: 'Verify' },
    { key: 'Assigned', label: 'Accept' },
    { key: 'Arrived', label: 'Arrive' },
    { key: 'In Progress', label: 'Work' },
    { key: 'Completed', label: 'Done' },
  ];
  const statusOrder = ['Submitted', 'Verified', 'Assigned', 'Arrived', 'In Progress', 'Resolved', 'Completed'];
  const currentIdx = statusOrder.indexOf(status);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((step, idx) => {
        const state = idx < currentIdx ? 'completed' : idx === currentIdx ? 'current' : 'pending';
        return (
          <Fragment key={step.key}>
            {idx > 0 && <span className={`text-[10px] ${dk('text-slate-600', 'text-slate-300')}`}>{'▸'}</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition ${
              state === 'completed' ? dk('bg-green-900/50 text-green-400', 'bg-green-100 text-green-700') :
              state === 'current' ? dk('bg-blue-900/50 text-blue-400 ring-1 ring-blue-500', 'bg-blue-100 text-blue-700 ring-1 ring-blue-400') :
              dk('bg-slate-800 text-slate-500', 'bg-slate-100 text-slate-400')
            }`}>
              {step.label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
};

const HomePickupTasks = () => {
  const { dark } = useTheme();
  const { user: ctxUser, loading: userLoading } = useUser();
  const dk = (d, l) => (dark ? d : l);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [detail, setDetail] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [distances, setDistances] = useState({});
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [routeMapTarget, setRouteMapTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [complete, setComplete] = useState(null);
  const [mapLayer, setMapLayer] = useState('osm');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCollectorPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!collectorPos) return;
    const map = {};
    reports.forEach((r) => {
      if (r.location?.lat != null && r.location?.lng != null) {
        const d = haversine(collectorPos.lat, collectorPos.lng, r.location.lat, r.location.lng);
        map[r._id] = { distance: d, duration: Math.ceil(d / 30 * 60) };
      }
    });
    setDistances(map);
  }, [reports, collectorPos]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/reports/home-pickup?filter=${filter}&sort=${sort}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else {
        // parse server message when available and surface a helpful error
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore JSON parse */ }
        const msg = data?.message || data?.error || `Failed to load reports (${res.status})`;
        console.error('[HomePickupTasks] fetchReports error', res.status, msg, data);
        setError(msg);
      }
    } catch {
      console.error('[HomePickupTasks] fetchReports network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!ctxUser || ctxUser.role !== 'Collector') return;
    fetchReports();
  }, [filter, sort, userLoading, ctxUser]);

  useEffect(() => {
    const handler = (updated) => {
      setReports((rs) => {
        const exists = rs.find((r) => r._id === updated._id);
        if (exists) {
          return rs.map((r) => (r._id === updated._id ? updated : r));
        }
        return [updated, ...rs];
      });
    };
    socket.on('report_updated', handler);
    return () => socket.off('report_updated', handler);
  }, []);

  const markArrived = async (item) => {
    try {
      const res = await fetch(`${API}/api/collector/report/${item._id}/arrived`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setReports((rs) => rs.map((r) => (r._id === item._id ? data.report : r)));
      setSuccessMsg('Marked as arrived at destination');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {}
  };

  const updateStatus = async (item, status) => {
    try {
      const res = await fetch(`${API}/api/collector/report/${item._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setReports((rs) => rs.map((r) => (r._id === item._id ? data.report : r)));
    } catch {}
  };

  const revokeCompletion = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/report/${revokeTarget._id}/revoke`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setReports((rs) => rs.map((r) => (r._id === revokeTarget._id ? data.report : r)));
      setRevokeTarget(null);
    } catch {} finally { setRevokeLoading(false); }
  };

  const onDone = (updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));

  const goToDestination = (r) => {
    setRouteMapTarget(r);
  };

  const availableReports = reports.filter(r =>
    ['Submitted', 'Verified'].includes(r.status)
  );
  const activeReports = reports.filter(r =>
    ['Assigned', 'Arrived', 'In Progress', 'Delayed'].includes(r.status)
  );
  const completedReports = reports.filter(r =>
    ['Resolved', 'Completed'].includes(r.status)
  );

  const renderReportCard = (r) => (
    <div key={r._id} className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-700 text-white">Home Pickup</span>
            {r.reportId && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                {r.reportId}
              </span>
            )}
            <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{r.wasteType}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(r.status, dk)}`}>{r.status}</span>
          </div>

          <WorkflowProgress status={r.status} dk={dk} />

          <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
            <HiUser className="h-3 w-3 text-green-500 shrink-0" />
            {r.userId?.name || 'Unknown Citizen'}
            {r.userId?.phone && (
              <span className={`font-normal ${dk('text-slate-400', 'text-slate-500')}`}>
                · {r.userId.phone}
              </span>
            )}
          </p>

          <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
            <HiLocationMarker className="h-3 w-3 text-green-500 shrink-0" />
            <span className="truncate">
              {[r.houseNo, r.street, r.village].filter(Boolean).join(', ')}
            </span>
            {distances[r._id] && (
              <span className="shrink-0">
                · {distances[r._id].distance < 1
                  ? `${Math.round(distances[r._id].distance * 1000)}m`
                  : `${distances[r._id].distance.toFixed(1)}km`} · {distances[r._id].duration} mins away
              </span>
            )}
          </p>

          {r.priorityLevel && (
            <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>
              <HiFlag className="h-3 w-3 shrink-0" />
              Priority:{' '}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                r.priorityLevel === 'Urgent'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {r.priorityLevel}
              </span>
            </p>
          )}

          <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
            <HiClock className="h-3 w-3 shrink-0" /> Created: {fmt(r.createdAt)}
          </p>

          {r.quantity && (
            <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {r.quantity}</p>
          )}
          {r.description && (
            <p className={`text-xs mt-1 line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{r.description}</p>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {r.userId?.phone && (
            <a
              href={`tel:${r.userId.phone}`}
              className={`flex items-center justify-center h-8 w-8 rounded-full border transition ${dk('border-green-700 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')}`}
              title={`Call ${r.userId.phone}`}
            >
              <HiPhone className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setDetail(r)}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}
          >
            View
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {r.location?.lat != null && r.location?.lng != null && (r.status === 'Assigned' || r.status === 'Arrived') && (
          <button
            type="button"
            onClick={() => goToDestination(r)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              dk('border-green-800/50 text-green-400 hover:bg-green-900/30', 'border-green-200 text-green-600 hover:bg-green-50')
            }`}
          >
            <HiMap className="h-3.5 w-3.5" /> Navigate
          </button>
        )}
        {r.status === 'Submitted' && (
          <button
            type="button"
            onClick={() => setVerifyTarget(r)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
          >
            Verify Request
          </button>
        )}
        {r.status === 'Verified' && (
          <button
            type="button"
            onClick={() => updateStatus(r, 'Assigned')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Accept Pickup
          </button>
        )}
        {r.status === 'Assigned' && (
          <button
            type="button"
            onClick={() => markArrived(r)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition"
          >
            Mark Arrived
          </button>
        )}
        {r.status === 'Arrived' && (
          <button
            type="button"
            onClick={() => updateStatus(r, 'In Progress')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition"
          >
            Start Pickup
          </button>
        )}
        {r.status === 'In Progress' && (
          <>
            <button
              type="button"
              onClick={() => setComplete(r)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
            >
              Complete Pickup
            </button>
            <button
              type="button"
              onClick={() => updateStatus(r, 'Delayed')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition flex items-center gap-1"
            >
              <HiExclamation className="h-3.5 w-3.5" /> Report Delay
            </button>
          </>
        )}
        {(r.status === 'Resolved' || r.status === 'Completed') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
              <HiCheckCircle className="h-3.5 w-3.5" /> Completed {fmt(r.completedAt || r.updatedAt)}
            </span>
            <button
              type="button"
              onClick={() => setRevokeTarget(r)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                dk('border-red-800/50 text-red-400 hover:bg-red-900/30', 'border-red-200 text-red-600 hover:bg-red-50')
              }`}
            >
              <HiX className="h-3.5 w-3.5" /> Revoke Completion
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} dk={dk} />}
      {complete && <CompletePickupModal report={complete} onClose={() => setComplete(null)} onDone={onDone} dk={dk} />}
      {verifyTarget && (
        <VerificationModal
          report={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerify={(updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)))}
          dk={dk}
        />
      )}
      {revokeTarget && (
        <RevokeConfirmModal
          report={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoke={revokeCompletion}
          dk={dk}
          loading={revokeLoading}
        />
      )}
      {routeMapTarget && (
        <RouteMapModal
          report={routeMapTarget}
          onClose={() => setRouteMapTarget(null)}
          dk={dk}
          onArrived={(updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)))}
        />
      )}

      {error && (
        <div className={`text-xs font-medium px-3 py-2 rounded-lg border ${dk('bg-red-900/30 text-red-400 border-red-800', 'bg-red-50 text-red-600 border-red-200')}`}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Home Pickup Tasks</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage home pickup collection tasks</p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className={dk('text-slate-400 hover:text-green-400', 'text-slate-500 hover:text-green-600')}
          aria-label="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          {['all', 'Submitted', 'Verified', 'Assigned', 'Arrived', 'In Progress', 'Completed', 'Resolved', 'Delayed'].map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'All' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="date">Newest First</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {successMsg && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-semibold animate-in slide-in-from-top">
          <HiCheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No home pickup reports found.</div>
      ) : (
        <>
          {availableReports.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${dk('text-slate-300', 'text-slate-700')}`}>Available Tasks</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700')}`}>{availableReports.length}</span>
              </div>
              {availableReports.map(renderReportCard)}
            </div>
          )}
          {activeReports.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${dk('text-slate-300', 'text-slate-700')}`}>My Active Tasks</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800')}`}>{activeReports.length}</span>
              </div>
              {activeReports.map(renderReportCard)}
            </div>
          )}
          {completedReports.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${dk('text-slate-300', 'text-slate-700')}`}>Completed Tasks</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700')}`}>{completedReports.length}</span>
              </div>
              {completedReports.map(renderReportCard)}
            </div>
          )}
          {reports.length > 0 && availableReports.length === 0 && activeReports.length === 0 && completedReports.length === 0 && (
            <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No reports match the current filter.</div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePickupTasks;
