import { useState } from 'react';
import { HiOutlineMail, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiArrowLeft } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../shared/components/Toast';
import { apiUrl } from '../../shared/utils/api';

const GreenChampionForgotId = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!identifier.trim()) { setError('Please enter your email or mobile number'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/green-champion/forgot-id'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to process request'); return; }
      setSent(true);
      setRequestId(data.requestId);
      toast.success('Request ID has been sent to your email or mobile number.');
    } catch { setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto">
              <HiOutlineCheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Request ID Recovery Successful</h1>
            <p className="text-slate-600 dark:text-slate-400">Your Green Champion Request ID has been sent to the email or mobile number associated with your application.</p>
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-6">
              <h2 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-4">
                Your Request ID: <span className="font-mono bg-green-100 dark:bg-green-800 px-2 py-1 rounded">{requestId}</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400">Please save this Request ID for future reference.</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => navigate(`/citizen/green-champion/status/${requestId}`)}
                className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition">
                Check Application Status
              </button>
              <button onClick={() => navigate('/')}
                className="w-full rounded-lg px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                Go to Dashboard
              </button>
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot Request ID</h1>
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <HiOutlineExclamationCircle className="h-8 w-8 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-center text-slate-900 dark:text-slate-100">Recover Your Request ID</h2>
              <p className="text-center text-slate-600 dark:text-slate-400">
                Enter the email or mobile number you used when submitting your Green Champion application.
                We'll send your Request ID to that contact information.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="identifier" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email or Mobile Number</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <HiOutlineMail className="h-4 w-4" />
                </span>
                <input
                  id="identifier"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
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
              {loading ? 'Sending...' : 'Send Request ID'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GreenChampionForgotId;