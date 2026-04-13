import { useTheme } from '../context/ThemeContext';

export const Skeleton = ({ className = '', circle = false }) => {
  const { dark } = useTheme();
  const baseCls = dark ? 'bg-slate-800' : 'bg-slate-200';
  
  return (
    <div className={`animate-pulse ${baseCls} ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`} />
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      
      {/* Activity Section Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Skeleton className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};
