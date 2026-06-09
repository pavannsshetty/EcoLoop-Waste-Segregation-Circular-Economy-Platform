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
      className={`p-4 max-md:p-3 max-md:flex-col max-md:items-center max-md:justify-center max-md:gap-1 max-md:text-center rounded-lg max-md:rounded-[16px] flex items-center gap-3 text-left max-md:h-[116px] ${
        onClick
          ? 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
          : ''
      }`}
      style={{ background: gradient }}
    >
      <div className="h-10 w-10 max-md:h-9 max-md:w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 max-md:h-[18px] max-md:w-[18px] text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-medium tracking-wider text-white/70 max-md:text-[10px]">{label}</p>
        <p className="text-lg max-md:text-2xl font-semibold text-white truncate">{value}</p>
      </div>
    </Tag>
  );
};

export { StatCard, StatCardSkeleton };
export default StatCard;