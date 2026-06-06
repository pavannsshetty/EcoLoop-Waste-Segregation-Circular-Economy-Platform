import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiHome, HiLocationMarker, HiCheckCircle, HiInformationCircle } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import { useUser } from '../../shared/context/UserContext';
import { API } from '../../shared/constants';
import { useToast } from '../../shared/components/Toast';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user, refreshUser, updateUser } = useUser();
  const { toast } = useToast();
  const dk = (d, l) => dark ? d : l;

  const [form, setForm] = useState({
    houseNo: '',
    streetArea: '',
    landmark: '',
    addressType: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.houseNo && user.streetArea) {
        // Address already complete
        navigate('/citizen/dashboard', { replace: true });
        return;
      }
      setForm({
        houseNo: user.houseNo || '',
        streetArea: user.streetArea || '',
        landmark: user.landmark || '',
        addressType: user.addressType || '',
      });
    }
  }, [user, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.houseNo.trim() && !form.streetArea.trim()) {
      setError('Please provide at least a House No or Street / Area.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/citizen/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        updateUser(data.user);
        toast.success('Address setup completed! Redirecting to dashboard...');
        setTimeout(() => navigate('/citizen/dashboard', { replace: true }), 500);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Error updating address');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      toast.error(err.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/citizen/dashboard', { replace: true });
  };

  const inp = `w-full rounded-lg border px-3.5 py-3 sm:py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${dk('bg-white/5 border-gray-700 text-slate-200 placeholder-slate-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')}`;
  const lbl = `text-xs mb-1.5 block font-semibold ${dk('text-slate-300', 'text-slate-700')}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${dk('bg-[#0A0A0A]', 'bg-[#F9FAFB]')}`}>
      <div className={`w-full max-w-md rounded-lg shadow-lg overflow-hidden border ${dk('bg-slate-900 border-white/10', 'bg-white border-slate-200')}`}>
        {/* Header Section */}
        <div className="bg-gradient-to-br from-[#0AAF29] to-emerald-600 p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4 border border-white/40">
              <HiHome className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Complete Your Address Setup</h1>
            <p className="text-green-100 text-sm leading-relaxed max-w-xs">
              Add your address details to enable Home Pickup and location-based services.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6 sm:p-8">
          {/* Info Banner */}
          <div className={`flex gap-3 p-3 rounded-lg mb-6 ${dk('bg-blue-900/30 border border-blue-800/50', 'bg-blue-50 border border-blue-200')}`}>
            <HiInformationCircle className={`h-5 w-5 shrink-0 mt-0.5 ${dk('text-blue-300', 'text-blue-600')}`} />
            <p className={`text-xs leading-relaxed ${dk('text-blue-200', 'text-blue-700')}`}>
              Your village <strong>{user?.village || 'N/A'}</strong> is pre-filled from registration. Update your street address to proceed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Village - Read Only */}
            <div>
              <label className={lbl}>Registered Village</label>
              <div className={`w-full rounded-lg border px-3.5 py-3 sm:py-2.5 text-sm ${dk('bg-white/5 border-gray-700 text-slate-400', 'bg-slate-50 border-slate-300 text-slate-500')}`}>
                {user?.village || 'N/A'}
              </div>
            </div>
            
            {/* House No / Door No */}
            <div>
              <label className={lbl}>House No / Door No</label>
              <input 
                type="text" 
                value={form.houseNo} 
                onChange={e => set('houseNo', e.target.value)}
                placeholder="e.g., 1-24/A, Plot 5, Flat 201" 
                className={inp} 
              />
            </div>
            
            {/* Street / Area / Ward */}
            <div>
              <label className={lbl}>Street / Area / Ward</label>
              <input 
                type="text" 
                value={form.streetArea} 
                onChange={e => set('streetArea', e.target.value)}
                placeholder="e.g., Main Street, Sector 5" 
                className={inp} 
              />
            </div>
            
            {/* Landmark - Optional */}
            <div>
              <label className={lbl}>
                Landmark <span className={`font-normal opacity-50 ${dk('text-slate-400', 'text-slate-500')}`}>(optional)</span>
              </label>
              <input 
                type="text" 
                value={form.landmark} 
                onChange={e => set('landmark', e.target.value)}
                placeholder="e.g., Near Community Center, Next to Temple" 
                className={inp} 
              />
            </div>
            
            {/* Address Type */}
            <div>
              <label className={lbl}>Address Type</label>
              <select 
                value={form.addressType} 
                onChange={e => set('addressType', e.target.value)}
                className={`${inp} appearance-none cursor-pointer`}>
                <option value="">Select Type</option>
                <option value="Home">Home</option>
                <option value="Apartment">Apartment</option>
                <option value="Shop">Shop</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`flex gap-2 p-3 rounded-lg text-xs font-medium ${dk('bg-red-900/30 border border-red-800/50 text-red-200', 'bg-red-50 border border-red-200 text-red-700')}`}>
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-3 mt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="h-11 w-full flex items-center justify-center gap-2 bg-[#0AAF29] text-white font-semibold rounded-lg shadow-sm hover:bg-[#0AAF29]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : <><HiCheckCircle className="h-5 w-5" /> Save Address</>}
              </button>
              
              <button 
                type="button" 
                onClick={handleSkip}
                className={`h-11 w-full font-semibold rounded-lg transition-all ${dk('text-slate-300 hover:bg-white/10', 'text-slate-600 hover:bg-slate-100')}`}
              >
                Continue to Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
