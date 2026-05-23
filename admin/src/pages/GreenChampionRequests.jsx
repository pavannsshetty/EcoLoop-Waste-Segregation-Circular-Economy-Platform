import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiSearch, HiFilter, HiCheck, HiX, HiInformationCircle, 
  HiCalendar, HiIdentification, HiMail, HiPhone, HiLocationMarker,
  HiChevronRight, HiEye, HiCheckCircle, HiArrowLeft, HiTrash, HiPause
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { useToast, ToastContainer } from '../components/Toast';
import Dropdown from '../components/Dropdown';

const STATUS_COLORS = {
  PENDING:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:  'bg-green-500 text-green-500 dark:bg-green-500/30 dark:text-green-500',
  REJECTED:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUSPENDED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const GreenChampionRequests = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { toasts, toast, remove } = useToast();
  const dk = (d, l) => (dark ? d : l);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  
  // Reviewing State
  const [checklist, setChecklist] = useState({});
  const [reviewAction, setReviewAction] = useState(null); // 'APPROVE', 'REJECT', 'SUSPEND'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      let url = '/api/green-champion/admin/requests';
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { navigate('/admin/login'); return; }
      if (!res.ok) throw new Error('Failed to fetch requests');
      setRequests(await res.json());
    } catch (err) {
      console.error('[GreenChampionRequests] fetch error:', err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const toggleCheck = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const handleReview = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin-token');
      const body = { checklist };
      if (reviewAction === 'APPROVE') body.status = 'APPROVED';
      else if (reviewAction === 'REJECT') { body.status = 'REJECTED'; body.reason = reason; }
      else if (reviewAction === 'SUSPEND') { body.status = 'SUSPENDED'; body.reason = reason; }

      const res = await fetch(`/api/green-champion/admin/request/${selectedReq._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Update failed');

      toast.success(data.message);
      setSelectedReq(null);
      setReviewAction(null);
      setReason('');
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (req) => {
    setSelectedReq(req);
    setChecklist(req.verificationChecklist || {});
    setReviewAction(null);
    setReason('');
  };

  const filteredRequests = requests.filter(r => 
    r.requestId.toLowerCase().includes(search.toLowerCase()) ||
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile.includes(search)
  );

  return (
    <div className="page-container space-y-8 animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-header">Pending Applications</h1>
          <p className="page-subheading">Review and manage Green Champion onboarding requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 ${dk('bg-white/5 border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
        <div className={`flex items-center gap-2.5 px-4 rounded-xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500/20 group flex-1 ${
          dark ? 'bg-black/40 border-gray-700 focus-within:border-green-500 shadow-inner' : 'bg-slate-50 border-slate-200 focus-within:border-green-500 shadow-sm'
        }`}>
          <HiSearch className={`h-5 w-5 shrink-0 transition-colors ${dark ? 'text-slate-600 group-focus-within:text-green-500' : 'text-slate-400 group-focus-within:text-green-500'}`} />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Request ID, Name, or Mobile..." 
            className="w-full py-2.5 bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 p-0"
          />
        </div>
        <Dropdown 
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className={`px-4 py-2.5 rounded-xl text-sm outline-none border transition ${dk('bg-black/40 border-gray-700 text-slate-200 focus:border-green-500', 'bg-slate-50 border-slate-200 focus:border-green-500')}`}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </Dropdown>
      </div>

      {/* List */}
      <div className={`overflow-hidden rounded-2xl border ${dk('bg-white/5 border-gray-800', 'bg-white border-gray-100 shadow-sm')}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`text-[11px] uppercase tracking-wider font-bold ${dk('text-slate-500 bg-black/40', 'text-slate-400 bg-slate-50/50')}`}>
              <tr>
                <th className="px-6 py-4">Request Details</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Village</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                       <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 italic">No Green Champion requests found matching filters.</td>
                </tr>
              ) : filteredRequests.map(req => (
                <tr key={req._id} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-800 overflow-hidden shrink-0">
                          <img src={req.profilePhoto} alt="" className="h-full w-full object-cover" />
                       </div>
                       <div>
                          <p className={`text-sm font-bold ${dk('text-slate-200', 'text-slate-800')}`}>{req.fullName}</p>
                          <p className="text-[10px] font-mono text-green-500">{req.requestId}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`text-sm ${dk('text-slate-300', 'text-slate-700')}`}>{req.email}</p>
                    <p className={`text-xs ${dk('text-slate-500', 'text-slate-500')}`}>{req.mobile}</p>
                  </td>
                  <td className={`px-6 py-4 text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>{req.village}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${STATUS_COLORS[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openDetails(req)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dk('bg-white/10 text-slate-300 hover:bg-green-500/30 hover:text-green-500', 'bg-slate-100 text-slate-600 hover:bg-green-500 hover:text-green-500')}`}
                    >
                      Review <HiChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedReq(null)} />
          <div className={`relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border flex flex-col ${dk('bg-black border-gray-800', 'bg-white border-gray-100 shadow-2xl')}`}>
             
             {/* Header */}
             <div className="px-6 py-4 border-b dark:border-gray-800 flex items-center justify-between">
                <div>
                   <h2 className={`text-lg font-bold ${dk('text-white', 'text-slate-900')}`}>Review Application</h2>
                   <p className="text-xs text-green-500 font-mono">{selectedReq.requestId}</p>
                </div>
                <button onClick={() => setSelectedReq(null)} className={`p-2 rounded-xl transition ${dk('text-slate-500 hover:bg-white/10 text-white', 'text-slate-400 hover:bg-slate-100')}`}>
                   <HiX className="h-6 w-6" />
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Profile & Info */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border dark:border-gray-800">
                         <div className="h-24 w-24 rounded-2xl border dark:border-gray-700 overflow-hidden shrink-0 shadow-xl">
                            <img src={selectedReq.profilePhoto} alt="" className="h-full w-full object-cover" />
                         </div>
                         <div className="space-y-1">
                            <h3 className={`text-xl font-bold ${dk('text-white', 'text-slate-800')}`}>{selectedReq.fullName}</h3>
                            <p className="text-sm text-green-500 font-medium">Applicant for {selectedReq.village}</p>
                            <p className={`text-xs ${dk('text-slate-500', 'text-slate-400')}`}>Applied on {new Date(selectedReq.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                         {[
                           { icon: HiMail, label: 'Email Address', val: selectedReq.email },
                           { icon: HiPhone, label: 'Mobile Number', val: selectedReq.mobile },
                           { icon: HiLocationMarker, label: 'Village Area', val: selectedReq.village },
                           { icon: HiIdentification, label: 'ID Proof Type', val: selectedReq.idProofType === 'Other' ? selectedReq.otherIdProofType : selectedReq.idProofType },
                           { icon: HiInformationCircle, label: 'Motivation', val: selectedReq.reason + (selectedReq.otherReason ? `: ${selectedReq.otherReason}` : '') },
                         ].map(item => (
                           <div key={item.label} className="flex items-start gap-3">
                              <item.icon className="h-5 w-5 text-green-500 mt-0.5" />
                              <div>
                                 <p className={`text-[10px] font-bold uppercase tracking-wider ${dk('text-slate-600', 'text-slate-400')}`}>{item.label}</p>
                                 <p className={`text-sm font-medium ${dk('text-slate-200', 'text-slate-700')}`}>{item.val}</p>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="pt-4 space-y-3">
                         <p className={`text-xs font-bold uppercase tracking-widest ${dk('text-slate-500', 'text-slate-400')}`}>Documents</p>
                         <div className="grid grid-cols-2 gap-4">
                            <a href={selectedReq.idProof} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition ${dk('bg-white/5 border-gray-700 hover:bg-green-500/10', 'bg-slate-50 border-slate-200 hover:bg-green-500')}`}>
                               <HiIdentification className="h-8 w-8 text-green-500" />
                               <span className="text-[10px] font-bold uppercase">View ID Proof</span>
                            </a>
                            <div className="flex flex-col items-center gap-2 p-3 rounded-xl border dark:border-gray-800 bg-white/5">
                               <HiCheckCircle className="h-8 w-8 text-blue-500" />
                               <span className="text-[10px] font-bold uppercase opacity-50">Profile Verify</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Verification Checklist */}
                   <div className={`p-6 rounded-3xl border-2 border-dashed ${dk('bg-white/5 border-gray-800', 'bg-slate-50 border-slate-200')}`}>
                      <h4 className={`text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${dk('text-green-500', 'text-green-500')}`}>
                         <HiCheckCircle className="h-5 w-5" /> Verification Checklist
                      </h4>
                      <div className="space-y-1">
                         {[
                           { key: 'mobileValid', label: 'Mobile number valid' },
                           { key: 'emailVerified', label: 'Email verified' },
                           { key: 'villageValid', label: 'Village valid' },
                           { key: 'villageNotAssigned', label: 'Village not already assigned' },
                           { key: 'photoGenuine', label: 'Profile photo looks genuine' },
                           { key: 'idProofValid', label: 'ID proof valid' },
                           { key: 'identityMatching', label: 'Photo and ID proof match' },
                           { key: 'noDuplicate', label: 'No duplicate request exists' },
                         ].map(item => (
                           <label key={item.key} className={`flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer hover:bg-white/5 ${checklist[item.key] ? 'opacity-100' : 'opacity-60'}`}>
                              <input 
                                type="checkbox" checked={checklist[item.key] || false} onChange={() => toggleCheck(item.key)}
                                className="h-4 w-4 rounded border-gray-600 bg-white/10 text-green-500 focus:ring-green-500"
                              />
                              <span className={`text-sm font-medium ${dk('text-slate-300', 'text-slate-700')}`}>{item.label}</span>
                           </label>
                         ))}
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-800/20 text-xs text-slate-500">
                         Admin must confirm all details before approval.
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="px-6 py-4 border-t dark:border-gray-800 flex items-center justify-between bg-slate-50/30 dark:bg-black/50">
                {selectedReq.status === 'PENDING' ? (
                  <>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => { setReviewAction('REJECT'); setReason(''); }}
                         className="px-4 py-2 text-xs font-bold uppercase rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition"
                       >Reject</button>
                       <button 
                         onClick={() => { setReviewAction('SUSPEND'); setReason(''); }}
                         className="px-4 py-2 text-xs font-bold uppercase rounded-xl border border-gray-500/30 text-gray-500 hover:bg-gray-500 hover:text-white transition"
                       >Suspend</button>
                    </div>
                    <button 
                       disabled={!Object.values(checklist).every(v => v === true)}
                       onClick={() => { setReviewAction('APPROVE'); }}
                       className="px-6 py-2.5 text-sm font-bold uppercase rounded-xl bg-green-500 text-white shadow-xl shadow-green-500/20 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
                    >Approve Applicant</button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center p-2">
                    <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase ${STATUS_COLORS[selectedReq.status]}`}>
                      {selectedReq.status === 'APPROVED' && <HiCheckCircle className="h-5 w-5" />}
                      {selectedReq.status === 'REJECTED' && <HiX className="h-5 w-5" />}
                      Current Status: {selectedReq.status}
                    </span>
                  </div>
                )}
             </div>
          </div>

          {/* Confirm Sub-Modal */}
          {reviewAction && (
             <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setReviewAction(null)} />
                <div className={`relative z-10 w-full max-w-sm p-6 rounded-2xl border ${dk('bg-black border-gray-800', 'bg-white border-gray-100 shadow-2xl')}`}>
                   <p className={`text-lg font-bold mb-2 ${dk('text-white', 'text-slate-800')}`}>{reviewAction === 'APPROVE' ? 'Confirm Approval' : reviewAction === 'REJECT' ? 'Confirm Rejection' : 'Confirm Suspension'}</p>
                   <p className="text-sm text-slate-500 mb-4">Are you sure you want to {reviewAction.toLowerCase()} this applicant?</p>
                   
                   {(reviewAction === 'REJECT' || reviewAction === 'SUSPEND') && (
                     <div className="space-y-2 mb-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                          Reason for {reviewAction === 'REJECT' ? 'Rejection' : 'Suspension'} <span className="text-red-500">*</span>
                        </label>
                        <Dropdown value={reason} onChange={e => setReason(e.target.value)} className={`w-full p-3 rounded-xl border-none text-sm outline-none shadow-inner ${dk('bg-white/5 text-white', 'bg-slate-50 text-slate-800')}`}>
                           <option value="">Select Reason</option>
                           {reviewAction === 'REJECT' ? (
                             <>
                               <option value="Invalid ID proof">Invalid ID proof</option>
                               <option value="Duplicate request">Duplicate request</option>
                               <option value="Village already assigned">Village already assigned</option>
                               <option value="Fake details">Fake details</option>
                               <option value="Incomplete information">Incomplete information</option>
                               <option value="Other">Other</option>
                             </>
                           ) : (
                             <>
                               <option value="Misuse of platform">Misuse of platform</option>
                               <option value="Fake activity">Fake activity</option>
                               <option value="Policy violation">Policy violation</option>
                               <option value="Duplicate identity">Duplicate identity</option>
                               <option value="Other">Other</option>
                             </>
                           )}
                        </Dropdown>
                     </div>
                   )}

                   <div className="flex gap-2">
                      <button onClick={() => setReviewAction(null)} className="flex-1 py-3 text-xs font-bold uppercase rounded-xl border border-gray-800 text-slate-500 hover:bg-white/5 transition">Cancel</button>
                      <button 
                        disabled={submitting || ((reviewAction !== 'APPROVE') && !reason)}
                        onClick={handleReview} 
                        className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition ${
                          reviewAction === 'APPROVE' ? 'bg-green-500 text-white' : reviewAction === 'REJECT' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'
                        } disabled:opacity-50`}
                      >
                         {submitting ? 'Processing...' : 'Confirm'}
                      </button>
                   </div>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GreenChampionRequests;
