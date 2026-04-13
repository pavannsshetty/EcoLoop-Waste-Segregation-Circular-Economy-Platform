import { useState, useEffect } from 'react';
import { HiCheckCircle, HiExclamation, HiClock } from 'react-icons/hi';

const pad = n => String(n).padStart(2, '0');

const getTimeInfo = (report) => {
  if (!report) return null;
  if (report.status === 'Resolved') return { type: 'resolved' };

  const deadline = report.deadline ? new Date(report.deadline) : null;
  if (!deadline) {
    if (report.expectedCleanupHours) {
      return { type: 'expected', hours: report.expectedCleanupHours };
    }
    return null;
  }

  const now  = Date.now();
  const diff = deadline.getTime() - now;

  if (diff <= 0) return { type: 'delayed', overdue: Math.abs(diff) };

  const totalMins = Math.floor(diff / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { type: 'countdown', h, m, hours: report.expectedCleanupHours };
};

const CleanupTimeBadge = ({ report, showCountdown = true }) => {
  const [info, setInfo] = useState(() => getTimeInfo(report));

  useEffect(() => {
    if (!showCountdown) return;
    setInfo(getTimeInfo(report));
    const id = setInterval(() => setInfo(getTimeInfo(report)), 60000);
    return () => clearInterval(id);
  }, [report, showCountdown]);

  if (!info) return null;

  if (info.type === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <HiCheckCircle className="h-3 w-3" /> Completed
      </span>
    );
  }

  if (info.type === 'delayed') {
    const overdueMins = Math.floor(info.overdue / 60000);
    const oh = Math.floor(overdueMins / 60);
    const om = overdueMins % 60;
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
        <HiExclamation className="h-3 w-3" /> Delayed {oh > 0 ? `${oh}h ` : ''}{om}m overdue
      </span>
    );
  }

  if (info.type === 'countdown') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
        <HiClock className="h-3 w-3" /> {info.h}h {pad(info.m)}m left
      </span>
    );
  }

  if (info.type === 'expected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
        <HiClock className="h-3 w-3" /> Expected: {info.hours}h
      </span>
    );
  }

  return null;
};

export default CleanupTimeBadge;
