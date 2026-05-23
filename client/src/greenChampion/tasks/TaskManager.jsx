import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { apiUrl } from '../../shared/utils/api';
import { HiClipboard, HiCheckCircle, HiClock, HiExclamation } from 'react-icons/hi';

const TaskManager = () => {
    const { dark } = useTheme();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const dk = (d, l) => (dark ? d : l);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/api/green-champion/tasks'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setTasks(data);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleUpdateTask = async (taskId, status) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl(`/api/green-champion/task/${taskId}`), {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-xl font-extrabold ${dk('text-slate-100', 'text-slate-900')}`}>Champion Tasks</h1>
                    <p className={`text-sm ${dk('text-slate-400', 'text-slate-500')}`}>Management of administrative tasks assigned to you.</p>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><div className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto" /></div>
            ) : tasks.length === 0 ? (
                <div className={`py-20 text-center rounded-2xl border-2 border-dashed ${dk('border-gray-800 text-slate-600', 'border-slate-200 text-slate-400')}`}>
                    <HiClipboard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No tasks assigned to you yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task._id} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center gap-4 ${dk('bg-white/5 border-gray-800', 'bg-white border-slate-100 shadow-sm')}`}>
                            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <HiClipboard className="h-6 w-6 text-indigo-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-bold ${dk('text-slate-100', 'text-slate-900')}`}>{task.title}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        task.status === 'Completed' ? 'bg-green-500 text-white' : 
                                        task.status === 'In Progress' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                                    }`}>{task.status}</span>
                                </div>
                                <p className={`text-xs mt-1 ${dk('text-slate-400', 'text-slate-600')}`}>{task.description}</p>
                                <div className="mt-3 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <HiClock className="h-3 w-3" /> Due {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Deadline'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                                        <HiExclamation className="h-3 w-3" /> Reward: {task.points} Eco Points
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 flex gap-2 sm:self-center self-end">
                                {task.status === 'Pending' && (
                                    <button onClick={() => handleUpdateTask(task._id, 'In Progress')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-500 transition">
                                        Start Task
                                    </button>
                                )}
                                {task.status === 'In Progress' && (
                                    <button onClick={() => handleUpdateTask(task._id, 'Completed')} className="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold shadow-sm hover:bg-green-500 transition flex items-center gap-2">
                                        <HiCheckCircle className="h-4 w-4" /> Mark Done
                                    </button>
                                )}
                                {task.status === 'Completed' && (
                                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                                        <HiCheckCircle className="h-5 w-5" /> Completed
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskManager;
