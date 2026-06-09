import { useEffect, useState, useRef } from 'react';
import { HiLocationMarker, HiClock, HiRefresh, HiX, HiPhotograph, HiExclamation, HiCheckCircle, HiUser, HiPhone, HiMap } from 'react-icons/hi';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API } from '../../shared/constants';
import { useTheme } from '../../shared/context/ThemeContext';
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

const getReportQuality = (item) => {
  if (item.status === 'Verified' || item.status === 'Under Re-Verification') return 'Good';
  if (item.aiStatus === 'APPROVED' && !item.duplicateImage) return 'Good';
  return 'Needs Review';
};

const getDuplicateRisk = (item) => {
  if (item.duplicateImage || item.isDuplicate) return 'High';
  if (item.aiStatus === 'SUSPICIOUS') return 'Medium';
  return 'Low';
};

const CLARIFICATION_MAX = 2;

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
    'Under Re-Verification': dk('bg-yellow-900/40 text-yellow-300', 'bg-yellow-100 text-yellow-700'),
    Assigned:    dk('bg-blue-900/40 text-blue-400', 'bg-blue-100 text-blue-700'),
    'In Progress': dk('bg-yellow-900/40 text-yellow-400', 'bg-amber-100 text-amber-800'),
    Resolved:    dk('bg-green-900/40 text-green-400', 'bg-green-100 text-green-700'),
    Delayed:     dk('bg-red-900/40 text-red-400', 'bg-red-100 text-red-700'),
    'Clarification Requested': dk('bg-purple-900/40 text-purple-400', 'bg-purple-100 text-purple-700'),
    Resubmitted: dk('bg-indigo-900/40 text-indigo-400', 'bg-indigo-100 text-indigo-700'),
    'Clarification Expired': dk('bg-gray-700 text-gray-300', 'bg-gray-100 text-gray-600'),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl ${panel}`}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Report Details</p>
          <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {report.reportId && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                {report.reportId}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sevCls(report.severity, dk)}`}>{report.severity}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(report.status, dk)}`}>{report.status}</span>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Waste Type</p>
            <p className={`text-sm font-medium ${value}`}>{report.wasteType}</p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Citizen</p>
            <p className={`text-sm font-medium ${value}`}>
              {report.userId?.name || 'Unknown Citizen'}
              {report.userId?.phone && <span className={`ml-2 text-xs font-normal ${label}`}>· {report.userId.phone}</span>}
            </p>
          </div>
          {report.description && (
            <div>
              <p className={`text-xs ${label}`}>Description</p>
              <p className={`text-sm ${value}`}>{report.description}</p>
            </div>
          )}
          {report.quantity && (
            <div>
              <p className={`text-xs ${label}`}>Quantity</p>
              <p className={`text-sm font-medium ${value}`}>{report.quantity}</p>
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Location</p>
            <p className={`text-sm ${value}`}>{report.location?.address}</p>
            {report.location?.lat && report.location?.lng && (
              <div className="mt-2 space-y-2">
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${dk('bg-green-900/30 text-green-400', 'bg-green-50 text-green-700')}`}>
                    <HiCheckCircle className="h-3 w-3" /> GPS Verified
                  </span>
                </div>
              </div>
            )}
          </div>
          {report.village && (
            <div>
              <p className={`text-xs ${label}`}>Village</p>
              <p className={`text-sm font-medium ${value}`}>{report.village}</p>
            </div>
          )}
          {report.image && (
            <div>
              <p className={`text-xs ${label}`}>Report Image</p>
              <img src={report.image} alt="Waste" className="w-full max-w-full h-auto max-h-40 rounded-lg object-cover mt-1" />
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Report Quality</p>
            <p className={`text-sm font-bold ${getReportQuality(report) === 'Good' ? 'text-green-500' : 'text-amber-500'}`}>
              {getReportQuality(report)}
            </p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>Duplicate Risk</p>
            <p className={`text-sm font-bold ${
              getDuplicateRisk(report) === 'High' ? 'text-red-500' : 
              getDuplicateRisk(report) === 'Medium' ? 'text-amber-500' : 
              'text-green-500'
            }`}>
              {getDuplicateRisk(report)}
            </p>
          </div>
          <div>
            <p className={`text-xs ${label}`}>AI Verification</p>
            <p className={`text-sm ${value}`}>
              {report.aiStatus || 'Not verified'}
              {report.aiGeneratedDetected && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">AI Generated</span>
              )}
            </p>
          </div>
          {report.duplicateImage && (
            <div>
              <p className={`text-xs ${label}`}>Duplicate Report</p>
              <p className="text-sm text-red-500 font-medium">This report may be a duplicate</p>
              <img src={report.duplicateImage} alt="Duplicate" className="w-full max-w-full h-auto max-h-28 rounded-lg object-cover mt-1" />
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Supporting Citizens</p>
            <p className={`text-sm font-medium ${value}`}>{report.supportedBy?.length || 0} citizen{report.supportedBy?.length !== 1 ? 's' : ''}</p>
          </div>
          {report.verificationChecklist && (report.verificationChecklist.wasteVisible || report.verificationChecklist.typeCorrect) && (
            <div>
              <p className={`text-xs ${label}`}>Verification</p>
              <div className="space-y-1 mt-1">
                {Object.entries(report.verificationChecklist).map(([k, v]) => (
                  <p key={k} className={`text-xs flex items-center gap-1 ${v ? 'text-green-500' : 'text-red-400'}`}>
                    {v ? <HiCheckCircle className="h-3 w-3" /> : <HiX className="h-3 w-3" />} {k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </p>
                ))}
              </div>
            </div>
          )}
          {report.clarificationRequests?.length > 0 && (
            <div>
              <p className={`text-xs ${label}`}>Clarification History</p>
              {report.clarificationRequests.map((cr, i) => (
                <div key={i} className={`text-xs mt-1 p-2 rounded-lg ${dk('bg-purple-900/20', 'bg-purple-50')}`}>
                  <p className="font-medium">{cr.reason}</p>
                  {cr.notes && <p className="opacity-70">{cr.notes}</p>}
                  <p className={label}>{fmtDt(cr.requestedAt)}</p>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className={`text-xs ${label}`}>Created</p>
            <p className={`text-sm ${value}`}>{fmtDt(report.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompleteModal = ({ report, onClose, onDone, dk }) => {
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
      const res = await fetch(`${API}/api/collector/report/${report._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'Resolved', completionPhoto: photo, completionNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
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
  const dash = dk('border-slate-600 hover:border-orange-500', 'border-slate-300 hover:border-orange-500');
  const btnGhost = dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-md max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Mark as Resolved</p>
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
              {loading ? 'Saving...' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RevokeConfirmModal = ({ report, onClose, onRevoke, dk, loading }) => {
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
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
              The report will be restored to active status and <strong>will not</strong> count as completed.
            </p>
          </div>
          <div className="space-y-1 text-xs">
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Report: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span>
            </p>
            <p className={dk('text-slate-400', 'text-slate-500')}>
              Waste: <span className="font-medium">{report.wasteType}</span>
            </p>
            {report.completedAt && (
              <p className={dk('text-slate-400', 'text-slate-500')}>
                Completed: <span className="font-medium">{fmtDt(report.completedAt)}</span>
              </p>
            )}
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

const VerificationModal = ({ report, onClose, onVerify, onClarify, dk }) => {
  const [vmMapLayer, setVmMapLayer] = useState('osm');
  const [checklist, setChecklist] = useState({
    wasteVisible: false,
    typeCorrect: false,
    descriptionMatches: false,
    locationReasonable: false,
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClarify, setShowClarify] = useState(false);
  const [clarifyReason, setClarifyReason] = useState('');
  const [clarifyNotes, setClarifyNotes] = useState('');
  const panel = dk('bg-slate-900 border-slate-700', 'bg-white border-slate-200');
  const label = dk('text-slate-400', 'text-slate-500');
  const value = dk('text-slate-100', 'text-slate-800');
  const input = dk('border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500', 'border-slate-200 bg-white text-slate-900 placeholder-slate-400');

  const allChecked = Object.values(checklist).every(Boolean);

  const submitVerify = async () => {
    if (!allChecked) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/report/${report._id}/collector-verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checklist, notes }),
      });
      const data = await res.json();
      if (!res.ok) return;
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
      const data = await res.json();
      if (!res.ok) return;
      onVerify(data.report);
      onClose();
    } catch {} finally { setLoading(false); }
  };

  const submitClarify = async () => {
    if (!clarifyReason) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/waste/report/${report._id}/request-clarification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: clarifyReason, notes: clarifyNotes }),
      });
      const data = await res.json();
      if (!res.ok) return;
      onClarify(data.report);
      onClose();
    } catch {} finally { setLoading(false); }
  };

  const modalBox = (content) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-md max-h-[90vh] flex flex-col sm:rounded-lg border shadow-xl overflow-y-auto ${panel}`}>
        <div className="p-4 sm:p-5 space-y-4">{content}</div>
      </div>
    </div>
  );

  if (showClarify) {
    const reasons = ['Waste Type Incorrect', 'Image Not Clear', 'Description Incomplete', 'Location Incorrect', 'Duplicate Report Suspected', 'Other'];
    return modalBox(
      <>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Request Clarification</p>
          <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1 text-xs">
          <p className={label}>Report: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span></p>
          <p className={label}>Waste: <span className="font-medium">{report.wasteType}</span></p>
          <p className={label}>Citizen: <span className="font-medium">{report.userId?.name}</span></p>
        </div>
        <div>
          <label className={`text-xs mb-1 block ${label}`}>Reason <span className="text-red-500">*</span></label>
          <select value={clarifyReason} onChange={(e) => setClarifyReason(e.target.value)} className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${input}`}>
            <option value="">Select a reason...</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {clarifyReason === 'Other' && (
          <div>
            <label className={`text-xs mb-1 block ${label}`}>Custom Message</label>
            <textarea rows={3} value={clarifyNotes} onChange={(e) => setClarifyNotes(e.target.value)}
              placeholder="Describe what needs clarification..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`} />
          </div>
        )}
        {clarifyReason && clarifyReason !== 'Other' && (
          <div>
            <label className={`text-xs mb-1 block ${label}`}>Additional Notes <span className="text-slate-500">(optional)</span></label>
            <textarea rows={2} value={clarifyNotes} onChange={(e) => setClarifyNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`} />
          </div>
        )}
        {(report.clarificationCount || 0) >= CLARIFICATION_MAX && (
          <p className="text-xs text-red-500">Maximum clarification requests reached. You must verify or reject.</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button type="button" onClick={() => setShowClarify(false)}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50')}`}>Back</button>
          <button type="button" onClick={submitClarify} disabled={loading || !clarifyReason || (report.clarificationCount || 0) >= CLARIFICATION_MAX}
            className="flex-1 rounded-lg bg-yellow-600 text-white py-2.5 text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-60">
            {loading ? 'Sending...' : 'Request Clarification'}
          </button>
        </div>
      </>
    );
  }

  return modalBox(
    <>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${dk('text-white', 'text-slate-800')}`}>Verify Report</p>
        <button type="button" onClick={onClose} className={`p-1 rounded-lg transition ${dk('text-slate-400 hover:text-white hover:bg-slate-800', 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}`}>
          <HiX className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-1 text-xs">
        <p className={label}>Report: <span className="font-medium">{report.reportId || report._id?.slice(-6)}</span></p>
        <p className={label}>Waste: <span className="font-medium">{report.wasteType}</span></p>
        <p className={label}>Citizen: <span className="font-medium">{report.userId?.name}</span></p>
      </div>
      {report.image && (
        <div>
          <p className={`text-xs mb-1 block ${label}`}>Waste Image</p>
          <img src={report.image} alt="Waste" className="w-full max-w-full h-auto max-h-40 rounded-lg object-cover" />
        </div>
      )}
      {report.description && (
        <div>
          <p className={`text-xs mb-1 block ${label}`}>Description</p>
          <p className={`text-sm ${value}`}>{report.description}</p>
        </div>
      )}
      <div>
        <p className={`text-xs mb-1 block ${label}`}>Location</p>
        <p className={`text-xs ${value}`}>{report.location?.address}</p>
        {report.location?.lat && report.location?.lng && (
          <div className="mt-1 relative w-full h-24 rounded-lg overflow-hidden border">
            <MapContainer key={`verify-${report._id}`} center={[report.location.lat, report.location.lng]} zoom={14} scrollWheelZoom={false} dragging={false} zoomControl={false} className="w-full h-full z-10">
              {(() => {
                const currentLayer = getMapLayer(vmMapLayer);
                return (
                  <TileLayer
                    key={`tile-${vmMapLayer}`}
                    attribution={currentLayer.attribution}
                    url={currentLayer.url}
                    maxZoom={currentLayer.maxZoom}
                    minZoom={currentLayer.minZoom}
                  />
                );
              })()}
              <MapLayerSwitcher currentLayer={vmMapLayer} onLayerChange={setVmMapLayer} position="top-right" />
              <Marker position={[report.location.lat, report.location.lng]} />
            </MapContainer>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <p className={`text-xs font-semibold ${value}`}>Verification Checklist</p>
        {[
          { key: 'wasteVisible', label: 'Waste clearly visible in image' },
          { key: 'typeCorrect', label: 'Waste type appears correct' },
          { key: 'descriptionMatches', label: 'Description matches image' },
          { key: 'locationReasonable', label: 'Location appears reasonable' },
        ].map((c) => (
          <label key={c.key} className={`flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition ${dk('border-slate-700 hover:bg-slate-800', 'border-slate-200 hover:bg-slate-50')}`}>
            <input type="checkbox" checked={checklist[c.key]} onChange={() => setChecklist((p) => ({ ...p, [c.key]: !p[c.key] }))} className="h-4 w-4 text-green-600 focus:ring-green-500 rounded" />
            <span className={`text-xs ${dk('text-slate-200', 'text-slate-700')}`}>{c.label}</span>
          </label>
        ))}
      </div>
      <div>
        <label className={`text-xs mb-1 block ${label}`}>Verification Notes <span className="text-slate-500">(optional)</span></label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your verification..."
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${input}`} />
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button type="button" onClick={onClose}
          className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-700 hover:bg-slate-50')}`}>Cancel</button>
        <button type="button" onClick={submitReject} disabled={loading}
          className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition disabled:opacity-50 ${dk('border-red-700 text-red-400 hover:bg-red-900/30', 'border-red-300 text-red-700 hover:bg-red-50')}`}>
          Reject Report
        </button>
        <button type="button" onClick={() => setShowClarify(true)} disabled={(report.clarificationCount || 0) >= CLARIFICATION_MAX}
          className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition disabled:opacity-50 ${dk('border-yellow-700 text-yellow-400 hover:bg-yellow-900/30', 'border-yellow-300 text-yellow-700 hover:bg-yellow-50')}`}>
          Request Clarification
        </button>
        <button type="button" onClick={submitVerify} disabled={loading || !allChecked}
          className="flex-1 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-500 transition disabled:opacity-60">
          {loading ? 'Verifying...' : 'Verify Report'}
        </button>
      </div>
    </>
  );
};

const PublicWasteTasks = () => {
  const { dark } = useTheme();
  const dk = (d, l) => (dark ? d : l);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [detail, setDetail] = useState(null);
  const [complete, setComplete] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [distances, setDistances] = useState({});
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [routeMapTarget, setRouteMapTarget] = useState(null);
  const token = localStorage.getItem('token');
  const [mapLayer, setMapLayer] = useState('osm');

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
      const res = await fetch(`${API}/api/collector/reports/public?filter=${filter}&sort=${sort}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter, sort]);

  // Real-time socket listener
  useEffect(() => {
    const handler = (updated) => {
      setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));
    };
    socket.on('report_updated', handler);
    return () => socket.off('report_updated', handler);
  }, []);

  const updateStatus = async (item, status) => {
    try {
      const res = await fetch(`${API}/api/collector/report/${item._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setReports((rs) => rs.map((r) => (r._id === item._id ? data.report : r)));
      }
    } catch {
    }
  };

  const onDone = (updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)));

  const revokeCompletion = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`${API}/api/collector/report/${revokeTarget._id}/revoke`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setReports((rs) => rs.map((r) => (r._id === revokeTarget._id ? data.report : r)));
        setRevokeTarget(null);
      }
    } catch {} finally { setRevokeLoading(false); }
  };

  const goToDestination = (r) => {
    setRouteMapTarget(r);
  };

  const selectCls = dk(
    'rounded-lg border border-gray-700 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500',
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm'
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500 overflow-hidden">
      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} dk={dk} />}
      {complete && <CompleteModal report={complete} onClose={() => setComplete(null)} onDone={onDone} dk={dk} />}
      {revokeTarget && (
        <RevokeConfirmModal
          report={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoke={revokeCompletion}
          dk={dk}
          loading={revokeLoading}
        />
      )}
      {verifyTarget && (
        <VerificationModal
          report={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerify={(updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)))}
          onClarify={(updated) => setReports((rs) => rs.map((r) => (r._id === updated._id ? updated : r)))}
          dk={dk}
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-bold tracking-tight text-left ${dk('text-slate-200', 'text-slate-800')}`}>Public Waste Tasks</h1>
          <p className={`text-sm font-medium text-left mt-0.5 ${dk('text-slate-400', 'text-slate-500')}`}>Manage public waste collection tasks</p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className={dk('text-slate-400 hover:text-orange-400', 'text-slate-500 hover:text-orange-600')}
          aria-label="Refresh"
        >
          <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
          {['all', 'High', 'Medium', 'Low', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Clarification Requested', 'Resubmitted'].map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'All' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="date">Newest First</option>
          <option value="priority">High Priority First</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`text-center py-16 text-sm ${dk('text-slate-500', 'text-slate-400')}`}>No public waste reports found.</div>
      ) : (
        reports.map((r) => (
          <div
            key={r._id}
            className={`rounded-lg border p-4 space-y-3 shadow-sm transition ${dk('bg-white/5 border-gray-700 hover:bg-white/[0.07]', 'bg-white border-slate-100 hover:shadow-md')}`}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-600 text-white">Public Waste</span>
                  {r.reportId && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                      {r.reportId}
                    </span>
                  )}
                  <p className={`text-sm font-semibold ${dk('text-slate-100', 'text-slate-900')}`}>{r.wasteType}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sevCls(r.severity, dk)}`}>{r.severity}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staCls(r.status, dk)}`}>{r.status}</span>
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${dk('text-slate-200', 'text-slate-700')}`}>
                  <HiUser className="h-3 w-3 text-orange-500 shrink-0" />
                  {r.userId?.name || 'Unknown Citizen'}
                  {r.userId?.phone && (
                    <span className={`font-normal ${dk('text-slate-400', 'text-slate-500')}`}>
                      · {r.userId.phone}
                    </span>
                  )}
                </p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${dk('text-slate-400', 'text-slate-500')}`}>
                  <HiLocationMarker className="h-3 w-3 text-orange-500 shrink-0" />
                  <span className="truncate">{r.location?.address}</span>
                  {distances[r._id] && (
                    <span className="shrink-0">
                      · {distances[r._id].distance < 1
                        ? `${Math.round(distances[r._id].distance * 1000)}m`
                        : `${distances[r._id].distance.toFixed(1)}km`} · {distances[r._id].duration} mins away
                    </span>
                  )}
                </p>
                {r.village && (
                  <p className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${dk('text-orange-400', 'text-orange-700')}`}>
                    <HiLocationMarker className="h-3 w-3 shrink-0" />
                    {r.village}
                  </p>
                )}
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`}>
                  <HiClock className="h-3 w-3 shrink-0" /> {fmt(r.createdAt)}
                </p>

                <div className={`mt-2 p-2 rounded-lg border flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold ${
                  dk('bg-white/[0.02] border-slate-700/50', 'bg-slate-50 border-slate-200/60')
                }`}>
                  <div className="flex items-center gap-1">
                    <span className={dk('text-slate-400', 'text-slate-500')}>Report Quality:</span>
                    <span className={getReportQuality(r) === 'Good' ? 'text-green-500 font-bold' : 'text-amber-500 font-bold'}>
                      {getReportQuality(r)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={dk('text-slate-400', 'text-slate-500')}>Duplicate Risk:</span>
                    <span className={
                      getDuplicateRisk(r) === 'High' ? 'text-red-500 font-bold' : 
                      getDuplicateRisk(r) === 'Medium' ? 'text-amber-500 font-bold' : 
                      'text-green-500 font-bold'
                    }>
                      {getDuplicateRisk(r)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={dk('text-slate-400', 'text-slate-500')}>Supporting Citizens:</span>
                    <span className={`font-bold ${r.supportedBy?.length ? dk('text-green-400', 'text-green-600') : dk('text-slate-300', 'text-slate-700')}`}>
                      {r.supportedBy?.length || 0}
                    </span>
                  </div>
                </div>
                {r.quantity && (
                  <p className={`text-xs font-medium mt-1 ${dk('text-slate-300', 'text-slate-700')}`}>Quantity: {r.quantity}</p>
                )}
                {r.description && (
                  <p className={`text-xs mt-1 line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{r.description}</p>
                )}
                {r.aiGeneratedDetected && (
                  <p className="text-xs mt-1 text-red-500 font-medium flex items-center gap-1">
                    <HiExclamation className="h-3 w-3" /> AI generated content detected
                  </p>
                )}
                {r.supportedBy?.length > 0 && (
                  <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${dk('text-green-400', 'text-green-700')}`}>
                    <HiUser className="h-3 w-3" /> Supported by {r.supportedBy.length} citizen{r.supportedBy.length > 1 ? 's' : ''}
                  </p>
                )}
                {(r.status === 'Clarification Requested') && (
                  <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${dk('text-purple-400', 'text-purple-700')}`}>
                    Awaiting citizen response
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetail(r)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${dk('border-slate-700 text-slate-300 hover:bg-slate-800', 'border-slate-200 text-slate-600 hover:bg-slate-50')}`}
              >
                View
              </button>
            </div>

            {r.image && (
              <img src={r.image} alt="Waste" className="w-full max-w-full h-auto max-h-28 sm:max-h-32 rounded-lg object-cover" />
            )}

            <div className="flex flex-wrap gap-2">
              {r.location?.lat != null && r.location?.lng != null && r.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => goToDestination(r)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    dk('border-orange-800/50 text-orange-400 hover:bg-orange-900/30', 'border-orange-200 text-orange-600 hover:bg-orange-50')
                  }`}
                >
                  <HiMap className="h-3.5 w-3.5" /> Navigate
                </button>
              )}
              {(r.status === 'Submitted' || r.status === 'Resubmitted' || r.status === 'Clarification Expired') && (
                <>
                  <button
                    type="button"
                    onClick={() => setVerifyTarget(r)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                  >
                    Verify Report
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(r, 'Assigned')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
                  >
                    Accept Task
                  </button>
                </>
              )}
              {r.status === 'Verified' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'Assigned')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
                >
                  Accept Task
                </button>
              )}
              {r.status === 'Assigned' && (
                <button
                  type="button"
                  onClick={() => updateStatus(r, 'In Progress')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition"
                >
                  Start Work
                </button>
              )}
              {r.status === 'In Progress' && (
                <>
                  <button
                    type="button"
                    onClick={() => setComplete(r)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition flex items-center gap-1"
                  >
                    <HiExclamation className="h-3.5 w-3.5" /> Report Delay
                  </button>
                </>
              )}
              {r.status === 'Resolved' && (
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
        ))
      )}
    </div>
  );
};

export default PublicWasteTasks;
