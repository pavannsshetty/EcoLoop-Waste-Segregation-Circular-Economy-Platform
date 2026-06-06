import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiLocationMarker, HiClock, HiOutlineLocationMarker, HiInformationCircle, HiCollection } from 'react-icons/hi';

const NearbyReports = () => {
    const { dark } = useTheme();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const dk = (d, l) => (dark ? d : l);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(apiUrl('/api/green-champion/reports/nearby'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setReports(data);
            } catch (err) {
                console.error('Error fetching nearby reports:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-green-500 text-green-500';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Assigned': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Nearby Waste Reports</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Monitoring reports from your community area.</p>
                </div>
                <div className={`px-4 py-2 rounded-lg border text-sm font-semibold ${dk('bg-white/5 border-gray-800 text-slate-400', 'bg-white border-slate-200 text-slate-600 shadow-sm')}`}>
                    {reports.length} Reports Found
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center">
                    <div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" />
                </div>
            ) : reports.length === 0 ? (
                <div className={`py-20 text-center rounded-lg border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
                    <HiCollection className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No active waste reports found in your village.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <div key={report._id} className={`rounded-lg border overflow-hidden transition hover:shadow-lg ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
                            <div className="aspect-video bg-slate-200 relative group overflow-hidden">
                                {report.image ? (
                                    <img src={report.image} alt="Report" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                        <HiLocationMarker className="h-10 w-10 opacity-30" />
                                    </div>
                                )}
                                <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${getStatusColor(report.status)}`}>
                                    {report.status}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={`font-bold truncate ${dk('text-slate-100', 'text-slate-900')}`}>{report.wasteType}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        report.severity === 'High' ? 'bg-red-500/10 text-red-500' : 
                                        report.severity === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                        {report.severity}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-start gap-2">
                                        <HiOutlineLocationMarker className={`h-4 w-4 shrink-0 mt-0.5 ${dk('text-slate-500', 'text-slate-400')}`} />
                                        <p className={`text-xs line-clamp-2 ${dk('text-slate-400', 'text-slate-600')}`}>{report.location.address}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <HiClock className={`h-4 w-4 shrink-0 ${dk('text-slate-500', 'text-slate-400')}`} />
                                        <p className={`text-xs ${dk('text-slate-400', 'text-slate-600')}`}>
                                            {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className={`pt-3 border-t flex justify-between items-center ${dk('border-gray-800', 'border-slate-50')}`}>
                                    <button className="text-xs font-bold text-green-500 flex items-center gap-1">
                                        <HiInformationCircle className="h-4 w-4" /> View Details
                                    </button>
                                    <p className={`text-[10px] font-medium ${dk('text-slate-500', 'text-slate-400')}`}>
                                        {report.upvotes?.length || 0} Citizens impacted
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NearbyReports;
