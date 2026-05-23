import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiMap, HiHome, HiArrowRight } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';
import PublicWasteModal from '../../shared/components/PublicWasteModal';
import HomePickupModal from '../../shared/components/HomePickupModal';

const ReportWastePage = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);

  const dk = (d, l) => dark ? d : l;

  const cards = [
    {
      id: 'public',
      title: 'Report Public Waste',
      desc: 'roadside garbage, illegal dumping, drainage overflow, market waste etc.',
      icon: <HiMap className="h-8 w-8" />,
      accent: 'border-orange-500',
      bg: dk('bg-orange-500/10', 'bg-orange-50'),
      iconColor: 'text-orange-500',
      btn: 'bg-orange-600 hover:bg-orange-500',
      onClick: () => setShowPublicModal(true),
    },
    {
      id: 'home',
      title: 'Request Home Pickup',
      desc: 'household waste, recyclables, dry/wet waste, e-waste from your doorstep.',
      icon: <HiHome className="h-8 w-8" />,
      accent: 'border-[#0AAF29]',
      bg: dk('bg-[#0AAF29]/10', 'bg-green-50'),
      iconColor: 'text-[#0AAF29]',
      btn: 'bg-[#0AAF29] hover:bg-[#0AAF29]/90',
      onClick: () => setShowHomeModal(true),
    }
  ];

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-6 space-y-6">
      <div className="space-y-1">
        <h1 className={`text-lg font-bold tracking-tight ${dk('text-white', 'text-slate-900')}`}>Report Waste</h1>
        <p className={`text-sm font-medium ${dk('text-slate-400', 'text-slate-500')}`}>Choose the type of waste reporting service.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => (
          <div key={card.id}
            className={`group relative overflow-hidden rounded-sm border ${dk('border-slate-700', 'border-slate-200')} ${card.bg} p-4 sm:p-5 flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-lg`}>
            <div className="space-y-3">
              <div className={`${card.iconColor} bg-white/10 dark:bg-white/5 p-2 sm:p-2.5 rounded-sm w-fit`}>
                {card.icon}
              </div>
              <div className="space-y-1.5">
                <h2 className={`text-base font-bold ${dk('text-white', 'text-slate-900')}`}>{card.title}</h2>
                <p className={`text-xs leading-relaxed ${dk('text-slate-400', 'text-slate-500')}`}>{card.desc}</p>
              </div>
            </div>

            <button key={`btn-${card.id}`} onClick={card.onClick}
              className={`mt-6 flex items-center justify-center gap-3 w-fit rounded-sm px-4 py-3 text-xs font-bold text-white transition shadow-md ${card.btn}`}>
              <span>{card.title.toUpperCase()}</span>
              <HiArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      <PublicWasteModal
        isOpen={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        onSuccess={() => { setShowPublicModal(false); navigate('/citizen/my-reports'); }}
        dark={dark}
      />

      <HomePickupModal
        isOpen={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        onSuccess={() => { setShowHomeModal(false); navigate('/citizen/my-reports'); }}
        dark={dark}
      />
    </div>
  );
};

export default ReportWastePage;
