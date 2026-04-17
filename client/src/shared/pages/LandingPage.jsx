import { useState } from 'react';
import { HiArrowRight, HiMoon, HiSun, HiSparkles } from 'react-icons/hi';
import AuthModal from '../components/AuthModal';
import { ToastContainer, useToast } from '../components/Toast';
import EcoLoopLogo from '../components/EcoLoopLogo';
import DarkBg from '../components/DarkBg';
import { useTheme } from '../context/ThemeContext';

import citizenImg    from '../../assets/entrypagelogo/citizen.png';
import collectorImg  from '../../assets/entrypagelogo/collector.png';
import scrapImg      from '../../assets/entrypagelogo/scrap.png';
import greenChampImg from '../../assets/entrypagelogo/green champions.png';

const ROLES = [
  { img: citizenImg,    title: 'Citizen'         },
  { img: collectorImg,  title: 'Collector'       },
  { img: scrapImg,      title: 'Scrap Collector' },
  { img: greenChampImg, title: 'Green Champion'  },
];

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { dark, toggleDark } = useTheme();
  const { toasts, toast, remove } = useToast();
  const dk = (d, l) => dark ? d : l;

  return (
    <div
      className="w-full min-h-screen overflow-y-auto relative flex flex-col"
      style={dark
        ? { background: '#000000' }
        : { background: 'linear-gradient(to bottom, #ffffff 0%, #ecfdf5 50%, #d1fae5 100%)' }
      }
    >
      {dark && <DarkBg />}

      <div className={`relative z-10 flex flex-col h-full transition-all duration-300 ${isAuthModalOpen ? 'blur-sm brightness-75 pointer-events-none select-none' : ''}`}>

        <nav className={`w-full flex items-center justify-between px-6 sm:px-12 py-3 shrink-0 border-b backdrop-blur-sm ${dk('bg-black/60 border-white/10', 'bg-white/70 border-slate-100')}`}>
          <div className="flex items-center gap-3 min-w-0">
            <EcoLoopLogo height={48} dark={dark} />
            <div className={`hidden sm:block w-px h-8 ${dk('bg-white/20', 'bg-slate-200')}`} />
            <p className="hidden sm:block text-sm font-bold leading-tight max-w-[240px]" style={{ color: '#0EB02D' }}>
              Smart Waste Segregation &amp; Circular Economy Platform
            </p>
          </div>
          <button onClick={toggleDark} aria-label="Toggle dark mode"
            className={`rounded-sm p-2 transition shrink-0 ${dk('text-green-300 hover:bg-white/10', 'text-slate-600 hover:bg-slate-100')}`}>
            {dark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>
        </nav>

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #16a34a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-6">

            <div className="flex-1 text-center lg:text-left space-y-5 max-w-xl mx-auto lg:mx-0">
              <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest ${dk('bg-green-900/50', 'bg-green-100')}`} style={{ color: '#0EB02D' }}>
                <HiSparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Join the Circular Economy Revolution</span>
              </div>

              <h1 className="tracking-tight leading-tight text-3xl sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                <span className={`block ${dk('text-white', 'text-slate-900')}`}>Sort Your Waste.</span>
                <span className={`block ${dk('text-white', 'text-slate-900')}`}>
                  Support <span style={{ color: '#16a34a' }}>Recycling.</span> Build a <span style={{ color: '#16a34a' }}>Cleaner India.</span>
                </span>
              </h1>

              <p className={`text-lg sm:text-xl leading-loose ${dk('text-slate-300', 'text-slate-600')}`} style={{ fontFamily: "'Tilt Neon', cursive", lineHeight: '1.9' }}>
                A platform that connects citizens, collectors, green champions, and municipalities to manage waste better, keep areas clean, and support recycling.
              </p>

              <button onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-sm px-7 py-3.5 text-sm font-bold text-white transition active:scale-95"
                style={{ backgroundColor: '#0EB02D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0a9626'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0EB02D'}>
                Get Started Free <HiArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 w-full max-w-[400px] lg:max-w-[460px] mx-auto lg:mx-0">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {ROLES.map(({ img, title }) => (
                  <img key={title} src={img} alt={title} loading="lazy"
                    className="w-full h-auto object-contain" />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} toast={toast} dark={dark} />
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default LandingPage;
