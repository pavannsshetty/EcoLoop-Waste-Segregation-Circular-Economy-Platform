import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiCheckCircle, HiXCircle, HiUpload, HiClipboardCheck, HiChatAlt } from 'react-icons/hi';

const CleanupVerification = () => {
    const { dark } = useTheme();
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(null);
    const [comment, setComment] = useState('');
    const [proof, setProof] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const dk = (d, l) => (dark ? d : l);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/api/green-champion/reports/nearby'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only Resolved reports that need GC verification
                setPending(data.filter(r => r.status === 'Resolved' && r.gcVerification?.status === 'Pending'));
            }
        } catch (err) {
            console.error('Error fetching pending verifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleVerify = async (reportId, status) => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('status', status);
            formData.append('comment', comment);
            if (proof) formData.append('proofImage', proof);

            const res = await fetch(apiUrl(`/api/green-champion/report/${reportId}/verify`), {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                setVerifying(null);
                setComment('');
                setProof(null);
                fetchPending();
            }
        } catch (err) {
            console.error('Verification failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Cleanup Verifications</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Audit and confirm cleanup resolutions from collectors.</p>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : pending.length === 0 ? (
                <div className={`py-20 text-center rounded-lg border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
                    <HiClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Great job! No pending cleanup verifications.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pending.map(report => (
                        <div key={report._id} className={`p-4 rounded-lg border flex flex-col sm:flex-row gap-4 group ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
                            <div className="h-24 w-24 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                                <img src={report.completionPhoto || report.image} alt="Resolved" className="w-full h-full object-cover transition group-hover:scale-110" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h4 className={`font-bold ${dk('text-slate-200', 'text-slate-900')}`}>{report.wasteType}</h4>
                                <p className={`text-xs ${dk('text-slate-400', 'text-slate-500')}`}>{report.location.address}</p>
                                <div className="pt-2 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Resolved by {report.assignedCollector?.name || 'Collector'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                        <HiChatAlt className="h-3 w-3" /> Note: {report.completionNotes || 'No notes'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <button onClick={() => setVerifying(report)} className="px-4 py-2 rounded-lg bg-green-500 text-white text-xs font-bold shadow-sm hover:bg-green-500 transition active:scale-95">
                                    Verify Audit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {verifying && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-lg border p-6 space-y-5 animate-in zoom-in duration-200 ${dk('bg-slate-900 border-gray-800 text-slate-100', 'bg-white border-slate-200 text-slate-900')}`}>
                        <div>
                            <h3 className="text-lg font-bold">Audit Verification</h3>
                            <p className="text-sm text-slate-500 mt-1">Provide feedback on the cleanup status of this report.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Auditor's Comments</label>
                                <textarea 
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Add any observations or confirmation details..."
                                    className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${dk('bg-white/5 border-gray-700', 'bg-slate-50 border-slate-200')}`}
                                    rows={3}
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Proof Image (Optional)</label>
                                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed cursor-pointer transition hover:border-green-500 ${dk('border-gray-700 bg-white/5', 'bg-slate-50 border-slate-200')}`}>
                                    <HiUpload className="h-6 w-6 text-slate-400 mb-2" />
                                    <span className="text-[10px] text-slate-500">{proof ? proof.name : 'Upload cleanup proof'}</span>
                                    <input type="file" onChange={e => setProof(e.target.files[0])} className="hidden" accept="image/*" />
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                            <button 
                                onClick={() => handleVerify(verifying._id, 'Verified')}
                                disabled={submitting}
                                className="w-full sm:flex-1 py-3 rounded-lg bg-green-500 text-white text-sm font-bold shadow-sm hover:bg-green-500 transition active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? 'Confirming...' : 'Approve & Close'}
                            </button>
                            <button 
                                onClick={() => handleVerify(verifying._id, 'Rejected')}
                                disabled={submitting}
                                className="w-full sm:flex-1 py-3 rounded-lg bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
                            >
                                Reject & Reopen
                            </button>
                        </div>
                        <button onClick={() => setVerifying(null)} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CleanupVerification;
