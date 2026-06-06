import { useNavigate } from 'react-router-dom';

const StatCardSkeleton = () => (
  <div className="h-[72px] rounded-lg animate-pulse bg-slate-200 dark:bg-slate-700" />
);

const StatCard = ({ label, value, icon: Icon, gradient, onClick }) => {
  const navigate = useNavigate();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick ? () => navigate(onClick) : undefined}
      className={`p-4 rounded-lg flex items-center gap-3 text-left ${
        onClick
          ? 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
          : ''
      }`}
      style={{ background: gradient }}
    >
      <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-medium tracking-wider text-white/70">{label}</p>
        <p className="text-lg font-semibold text-white truncate">{value}</p>
      </div>
    </Tag>
  );
};

export { StatCard, StatCardSkeleton };
export default StatCard;
