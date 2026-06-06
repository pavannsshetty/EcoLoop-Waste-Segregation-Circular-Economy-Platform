import { useState, useEffect } from 'react';
import { HiOutlineLockClosed, HiOutlineMail, HiOutlinePhone, HiOutlineUserGroup, HiOutlineLocationMarker, HiOutlineCheckCircle, HiX, HiOutlineUser, HiOutlineSparkles } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../shared/components/Toast';
import { apiUrl } from '../../shared/utils/api';
import { fetchVillages } from '../../shared/services/villageService';
import VillageDropdown from '../../shared/components/VillageDropdown';

const fullName = v => (!v ? 'Full name is required' : '');
const email = v => {
  if (!v) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  if (!v.endsWith('@gmail.com')) return 'Only gmail.com addresses are allowed';
  return '';
};
const mobile = v => {
  if (!v) return 'Mobile number is required';
  if (!/^\d+$/.test(v)) return 'Only numbers allowed';
  if (v.length !== 10) return 'Mobile number must be 10 digits';
  if (!/^[6-9]\d{9}$/.test(v)) return 'Invalid mobile number. Must be 10 digits and start with 6-9.';
  return '';
};

const GreenChampionApply = () => {
  const [fields, setFields] = useState({
    fullName: '', email: '', mobile: '', village: '',
    reason: '', otherReason: '', idProofType: '', otherIdProofType: '',
    profilePhoto: null, idProof: null,
    profilePhotoPreview: '', idProofPreview: ''
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [villages, setVillages] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVillages()
      .then(data => setVillages(data))
      .catch(err => console.error('Error fetching villages:', err));
  }, []);

  const validate = () => ({
    fullName: fullName(fields.fullName),
    email: email(fields.email),
    mobile: mobile(fields.mobile),
    village: !fields.village ? 'Village is required' : '',
    reason: fields.reason ? '' : 'Please select a reason',
    idProofType: fields.idProofType ? '' : 'Please select ID proof type',
    profilePhoto: !fields.profilePhoto ? 'Profile photo is required' : '',
    idProof: !fields.idProof ? 'ID proof is required' : '',
  });

  const handleChange = (field) => (e) => {
    if (field === 'mobile') {
      const v = e.target.value.replace(/\D/g,'').slice(0,10);
      setFields(prev => ({ ...prev, [field]: v }));
    } else if (field === 'profilePhoto' || field === 'idProof') {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const previewKey = field === 'profilePhoto' ? 'profilePhotoPreview' : 'idProofPreview';
        const reader = new FileReader();
        reader.onloadend = () => {
          setFields(prev => ({ ...prev, [field]: file, [previewKey]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFields(prev => ({ ...prev, [field]: e.target.value }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(errs).map(k => [k, true])));
    if (Object.values(errs).some(Boolean)) {
      toast.error('Please fill all required fields correctly.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fields.fullName);
      formData.append('email', fields.email.toLowerCase().trim());
      formData.append('mobile', fields.mobile.trim());
      formData.append('village', fields.village);
      formData.append('reason', fields.reason);
      if (fields.reason === 'Other') formData.append('otherReason', fields.otherReason);
      formData.append('idProofType', fields.idProofType);
      if (fields.idProofType === 'Other') formData.append('otherIdProofType', fields.otherIdProofType);
      formData.append('profilePhoto', fields.profilePhoto);
      formData.append('idProof', fields.idProof);
      const res = await fetch(apiUrl('/api/green-champion/apply'), { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Application failed.'); return; }
      setSubmitted(true);
      setRequestId(data.requestId);
      toast.success('Application submitted successfully! Save your Request ID.');
    } catch { toast.error('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const input = (id, label, opts = {}) => {
    const t = touched[id];
    const e = errors[id];
    const hasErr = t && e;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="relative">
          {opts.icon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {opts.icon}
            </span>
          )}
          <input
            id={id}
            type={opts.type || 'text'}
            placeholder={opts.placeholder || ''}
            value={fields[id] || ''}
            onChange={handleChange(id)}
            onBlur={handleBlur(id)}
            maxLength={opts.maxLength}
            className={`w-full rounded-lg border py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 text-slate-900 placeholder-slate-400 bg-white ${opts.icon ? 'pl-9' : 'px-3.5'} pr-3.5 ${
              hasErr ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-slate-300 focus:border-green-500 focus:ring-green-500/30'
            }`}
          />
        </div>
        {hasErr && <p className="text-xs text-red-400 mt-0.5">{e}</p>}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto">
              <HiOutlineCheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Application Submitted Successfully!</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl">Thank you for applying to become a Green Champion. Your application has been received and is under review.</p>
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-6">
              <h2 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-4">
                Your Request ID: <span className="font-mono bg-green-100 dark:bg-green-800 px-2 py-1 rounded">{requestId}</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400">Please save this Request ID to check your application status.</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => navigate(`/citizen/green-champion/status/${requestId}`)}
                className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition">
                Track Application Status
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
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <HiOutlineSparkles className="h-8 w-8 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100">Become a Green Champion</h1>
            <p className="text-center text-slate-600 dark:text-slate-400 max-w-xl">
              Join our community of volunteers dedicated to promoting sustainable waste management practices in Kundapura Taluk.
            </p>
          </div>

          <div className="space-y-4">
            {input('fullName', 'Full Name', { placeholder: 'Enter your full name', icon: <HiOutlineUserGroup className="h-4 w-4" /> })}
            {input('email', 'Email', { type: 'email', placeholder: 'Enter your gmail address', icon: <HiOutlineMail className="h-4 w-4" /> })}
            {input('mobile', 'Mobile Number', { type: 'tel', placeholder: 'Enter your phone number', icon: <HiOutlinePhone className="h-4 w-4" />, maxLength: 10 })}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Village</label>
              <VillageDropdown
                value={fields.village}
                villages={villages}
                onChange={v => { setFields(f => ({ ...f, village: v })); setTouched(t => ({ ...t, village: true })); if (errors.village) setErrors(e => ({ ...e, village: '' })); }}
                error={errors.village}
                touched={touched.village}
                dark={false}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Motivation</h2>
            <div className="space-y-3">
              {['Environmental Concern', 'Community Service', 'Learn About Recycling', 'Other'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="radio" value={opt}
                    checked={fields.reason === opt}
                    onChange={(e) => { setFields(f => ({ ...f, reason: e.target.value, otherReason: '' })); setTouched(t => ({ ...t, reason: true })); }}
                    className="h-4 w-4 text-green-600 focus:ring-green-500" />
                  <span>{opt}</span>
                </label>
              ))}
              {fields.reason === 'Other' && input('otherReason', 'Please specify your reason', { placeholder: 'Enter your specific reason', icon: <HiOutlineLocationMarker className="h-4 w-4" /> })}
            </div>
            {touched.reason && errors.reason && <p className="text-xs text-red-400">{errors.reason}</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Document Upload</h2>
            <div className="space-y-4">
              {['Aadhaar Card', 'Voter ID', 'Driving License', 'Passport', 'Other'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="radio" value={opt}
                    checked={fields.idProofType === opt}
                    onChange={(e) => { setFields(f => ({ ...f, idProofType: e.target.value, otherIdProofType: '' })); setTouched(t => ({ ...t, idProofType: true })); }}
                    className="h-4 w-4 text-green-600 focus:ring-green-500" />
                  <span>{opt}</span>
                </label>
              ))}
              {fields.idProofType === 'Other' && input('otherIdProofType', 'Please specify ID proof type', { placeholder: 'Enter your ID proof type', icon: <HiOutlineLocationMarker className="h-4 w-4" /> })}
            </div>
            {touched.idProofType && errors.idProofType && <p className="text-xs text-red-400">{errors.idProofType}</p>}

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Photo</label>
                <div className="flex items-center gap-3">
                  {fields.profilePhotoPreview ? (
                    <img src={fields.profilePhotoPreview} alt="Profile preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <HiOutlineUser className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <input type="file" accept="image/*" id="profilePhoto" className="hidden" onChange={handleChange('profilePhoto')} />
                  <label htmlFor="profilePhoto" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50">Upload Profile Photo</label>
                </div>
                {touched.profilePhoto && errors.profilePhoto && <p className="text-xs mt-1 text-red-600 dark:text-red-400">{errors.profilePhoto}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ID Proof</label>
                <div className="flex items-center gap-3">
                  {fields.idProofPreview ? (
                    <img src={fields.idProofPreview} alt="ID proof preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <HiOutlineLockClosed className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <input type="file" accept="image/*" id="idProof" className="hidden" onChange={handleChange('idProof')} />
                  <label htmlFor="idProof" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50">Upload ID Proof</label>
                </div>
                {touched.idProof && errors.idProof && <p className="text-xs mt-1 text-red-600 dark:text-red-400">{errors.idProof}</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg px-4 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GreenChampionApply;