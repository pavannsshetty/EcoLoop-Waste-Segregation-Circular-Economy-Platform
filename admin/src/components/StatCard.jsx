import { useNavigate } from 'react-router-dom';

const StatCardSkeleton = () => (
  <div className="h-[80px] rounded-lg animate-pulse bg-slate-200 dark:bg-slate-700" />
);

const StatCard = ({ label, value, icon: Icon, gradient, onClick }) => {
  const navigate = useNavigate();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick ? () => navigate(onClick) : undefined}
      className={`w-full p-4 rounded-lg flex items-center gap-4 ${
        onClick
          ? 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
          : ''
      }`}
      style={{ background: gradient }}
    >
      <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/70">{label}</p>
        <p className="text-2xl font-bold text-white truncate">{value}</p>
      </div>
    </Tag>
  );
};

export { StatCard, StatCardSkeleton };
export default StatCard;
