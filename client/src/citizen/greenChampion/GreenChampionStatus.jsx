import { useState, useEffect } from 'react';
import { HiOutlineEye, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineUserGroup, HiOutlineClock, HiOutlineMail, HiLocationMarker, HiArrowLeft } from 'react-icons/hi';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../shared/components/Toast';
import { apiUrl } from '../../shared/utils/api';

const GreenChampionStatus = () => {
  const { requestId: paramId } = useParams();
  const [requestId, setRequestId] = useState(paramId || '');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkStatus = async (e) => {
    if (e) e.preventDefault();
    setTouched(true);
    if (!requestId.trim()) { setError('Please enter a Request ID'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/green-champion/status/${requestId.trim().toUpperCase()}`));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to fetch status'); setStatus(null); setRequestData(null); return;
      }
      const data = await res.json();
      setStatus(data.status);
      setRequestData(data);
      setError(null);
    } catch { setError('Something went wrong. Please try again.'); setStatus(null); setRequestData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (paramId) checkStatus(null);
  }, [paramId]);

  if (status === 'APPROVED' && requestData?.greenChampionId) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm font-medium text-green-500 hover:underline">
                <HiArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Application Status</h1>
            </div>
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center h-14 w-14 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto">
                <HiOutlineCheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-600 dark:text-green-300">Congratulations! Your application has been APPROVED</h2>
              <p className="text-slate-600 dark:text-slate-400">You are now officially a Green Champion! Use your email and password to log in and access the Green Champion dashboard.</p>
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-6 text-left">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-3">Your Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <HiOutlineUserGroup className="h-5 w-5 text-green-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Full Name</p><p className="text-slate-600 dark:text-slate-400">{requestData.fullName}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <HiOutlineMail className="h-5 w-5 text-green-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Email</p><p className="text-slate-600 dark:text-slate-400">{requestData.email}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <HiOutlineClock className="h-5 w-5 text-green-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Green Champion ID</p><p className="font-mono text-slate-600 dark:text-slate-400 bg-green-100 dark:bg-green-800 px-2 py-1 rounded inline-block">{requestData.greenChampionId}</p></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <button onClick={() => navigate('/')} className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition">Go to Dashboard</button>
                <button onClick={() => navigate('/green-champion/dashboard')} className="w-full rounded-lg px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Access Green Champion Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm font-medium text-green-500 hover:underline">
              <HiArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Check Application Status</h1>
          </div>

          {!status && !error && (
            <>
              <form noValidate onSubmit={checkStatus} className="space-y-6">
                <div className="space-y-4 text-center">
                  <HiOutlineEye className="h-8 w-8 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Enter Your Request ID</h2>
                  <p className="text-slate-600 dark:text-slate-400">Use the Request ID you received when submitting your application to check its current status.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="requestId" className="text-sm font-medium text-slate-700 dark:text-slate-300">Request ID</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <HiOutlineUserGroup className="h-4 w-4" />
                    </span>
                    <input
                      id="requestId"
                      type="text"
                      placeholder="Enter your Request ID (e.g., GCREQ2026001)"
                      value={requestId}
                      onChange={(e) => { setRequestId(e.target.value); setError(null); }}
                      onBlur={() => setTouched(true)}
                      className={`w-full rounded-lg border py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 pl-9 pr-3.5 text-slate-900 placeholder-slate-400 bg-white ${
                        touched && error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-slate-300 focus:border-green-500 focus:ring-green-500/30'
                      }`}
                    />
                  </div>
                  {touched && error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Checking...' : 'Check Status'}
                </button>
              </form>
              <div className="mt-6 text-center space-y-2">
                <button onClick={() => setRequestId('')} className="text-sm font-medium text-green-500 hover:underline">Check Another Request ID</button>
                <div><button onClick={() => navigate('/citizen/green-champion/apply')} className="text-sm font-medium text-green-500 hover:underline">Apply to be a Green Champion</button></div>
                <div><button onClick={() => navigate('/citizen/green-champion/forgot-id')} className="text-sm font-medium text-green-500 hover:underline">Forgot Request ID?</button></div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-6">
              <HiOutlineExclamationCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}

          {status && status === 'PENDING' && requestData && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center h-14 w-14 bg-amber-100 dark:bg-amber-900/20 rounded-lg mx-auto">
                <HiOutlineClock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-amber-600 dark:text-amber-300">Your application is PENDING review</h2>
              <p className="text-slate-600 dark:text-slate-400">Your application has been received and is currently under review. You will be notified via email once a decision has been made.</p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-400 p-6 text-left">
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-3">Application Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <HiOutlineUserGroup className="h-5 w-5 text-amber-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Full Name</p><p className="text-slate-600 dark:text-slate-400">{requestData.fullName}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <HiOutlineMail className="h-5 w-5 text-amber-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Email</p><p className="text-slate-600 dark:text-slate-400">{requestData.email}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <HiOutlineClock className="h-5 w-5 text-amber-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Submitted On</p><p className="text-slate-600 dark:text-slate-400">{new Date(requestData.submittedAt).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <HiLocationMarker className="h-5 w-5 text-amber-500 shrink-0" />
                    <div><p className="font-medium text-slate-900 dark:text-slate-100">Village</p><p className="text-slate-600 dark:text-slate-400">{requestData.village}</p></div>
                  </div>
                </div>
              </div>
              <button onClick={() => navigate('/')} className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition">Go to Dashboard</button>
            </div>
          )}

          {status === 'REJECTED' && requestData && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center h-14 w-14 bg-red-100 dark:bg-red-900/20 rounded-lg mx-auto">
                <HiOutlineExclamationCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-300">Application Status: REJECTED</h2>
              <p className="text-slate-600 dark:text-slate-400">Unfortunately, your application has not been approved at this time.</p>
              {requestData.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-6">
                  <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-3">Reason for Rejection</h3>
                  <p className="text-red-600 dark:text-red-400">{requestData.rejectionReason}</p>
                </div>
              )}
              <div className="space-y-4">
                <button onClick={() => navigate('/citizen/green-champion/apply')} className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition">Submit New Application</button>
                <button onClick={() => navigate('/')} className="w-full rounded-lg px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Go to Dashboard</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GreenChampionStatus;