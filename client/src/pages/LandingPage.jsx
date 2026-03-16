import { useState } from 'react';
import { HiArrowRight, HiMoon, HiSun, HiCollection, HiCalendar, HiTruck, HiRefresh } from 'react-icons/hi';
import { MdWaterDrop, MdRecycling, MdDevices, MdWarning } from 'react-icons/md';
import AuthModal from '../components/AuthModal';
import { ToastContainer, useToast } from '../components/Toast';
import EcoLoopLogo from '../components/EcoLoopLogo';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { toasts, toast, remove } = useToast();

  return (
    <div
      className="w-full min-h-screen relative"
      style={{
        background: dark
          ? 'radial-gradient(125% 125% at 50% 90%, #000000 40%, #072607 100%)'
          : 'radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)',
        backgroundAttachment: 'fixed',
        backgroundSize: '100% 100%',
      }}
    >

      {/* ── Hero ── */}
      <div className="min-h-screen w-full relative overflow-hidden">
        <div className="absolute inset-0 z-0" />

        <div className={`relative z-10 transition-all duration-300 ${isAuthModalOpen ? 'blur-sm brightness-75 pointer-events-none select-none' : ''}`}>
          {/* Navbar */}
          <nav className="w-full flex items-center justify-between px-6 sm:px-12 py-4">
            <div className="pl-4 sm:pl-8">
              <EcoLoopLogo height={44} dark={dark} />
            </div>
            <button
              onClick={() => setDark(d => !d)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`rounded-lg p-2 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 ${dark ? 'text-green-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {dark ? <HiSun className="h-6 w-6" /> : <HiMoon className="h-6 w-6" />}
            </button>
          </nav>

          {/* Hero content */}
          <div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium ${dark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>
                <span>🌱</span><span>Join the Circular Economy Revolution</span>
              </div>
              <h1 className="font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                <span className={`block mb-1 sm:mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>Close the Loop.</span>
                <span className={dark ? 'block text-green-400' : 'block text-green-600'}>Save the Planet.</span>
              </h1>
              <p className={`max-w-2xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed px-2 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                The unified platform connecting citizens, collectors, recyclers, and municipalities to transform waste management through technology and collaboration.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                <button onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-md transition hover:bg-green-500 focus:outline-none focus:ring-4 focus:ring-green-300 active:scale-95">
                  Get Started Free <HiArrowRight className="h-5 w-5" />
                </button>
                <button className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold shadow-sm transition focus:outline-none focus:ring-4 active:scale-95 ${dark ? 'border-green-500 text-green-400 hover:bg-green-900/30 focus:ring-green-800' : 'border-green-600 bg-white text-green-600 hover:bg-green-50 focus:ring-green-200'}`}>
                  Learn More
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 sm:pt-6">
                {[{ value: '50K+', label: 'Citizens' }, { value: '1.2K', label: 'Collectors' }, { value: '200+', label: 'Municipalities' }].map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className={`text-xl sm:text-2xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                    <p className={`text-xs sm:text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── How EcoLoop Works ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${dark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>Simple Process</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>How EcoLoop Works</h2>
            <p className={`mt-3 max-w-xl mx-auto text-base sm:text-lg ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Four easy steps to responsible waste management.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { Icon: HiCollection, step: '01', title: 'Segregate Waste',    desc: 'Sort your waste into wet, dry, e-waste, and hazardous at home.',              color: dark ? 'bg-green-900/50 text-green-400'  : 'bg-green-100 text-green-600'  },
              { Icon: HiCalendar,   step: '02', title: 'Schedule Pickup',    desc: 'Request a pickup through EcoLoop and choose a convenient time slot.',         color: dark ? 'bg-blue-900/50 text-blue-400'    : 'bg-blue-100 text-blue-600'    },
              { Icon: HiTruck,      step: '03', title: 'Collector Arrives',  desc: 'A verified collector arrives at your door and picks up your segregated waste.',color: dark ? 'bg-orange-900/50 text-orange-400': 'bg-orange-100 text-orange-600' },
              { Icon: HiRefresh,    step: '04', title: 'Waste Gets Recycled',desc: 'Waste is sent to the right facility — recycled, composted, or disposed.',    color: dark ? 'bg-purple-900/50 text-purple-400': 'bg-purple-100 text-purple-600' },
            ].map(({ Icon, step, title, desc, color }) => (
              <div key={step} className={`relative flex flex-col items-center text-center p-3 sm:p-6 rounded-2xl border transition hover:shadow-md ${dark ? 'bg-gray-800/70 border-gray-700' : 'bg-white/70 border-slate-100'}`}>
                <span className={`absolute -top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full border ${dark ? 'text-green-400 bg-green-900/60 border-green-700' : 'text-green-700 bg-green-100 border-green-200'}`}>{step}</span>
                <span className={`flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-2xl mb-3 sm:mb-4 ${color}`}>
                  <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                </span>
                <h3 className={`text-sm sm:text-base font-bold mb-1 sm:mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed hidden sm:block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waste Categories ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${dark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>Know Your Waste</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Waste Categories</h2>
            <p className={`mt-3 max-w-xl mx-auto text-base sm:text-lg ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Understanding waste types is the first step to responsible disposal.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { Icon: MdWaterDrop, title: 'Wet Waste',       bin: 'Green Bin', desc: 'Food scraps, vegetable peels, tea leaves. Compostable and biodegradable.',    iconCls: dark ? 'bg-green-900/50 text-green-400'  : 'bg-green-100 text-green-600',  badge: dark ? 'bg-green-900/50 text-green-400'  : 'bg-green-100 text-green-700',  border: dark ? 'border-green-800' : 'border-green-200' },
              { Icon: MdRecycling, title: 'Dry Waste',       bin: 'Blue Bin',  desc: 'Paper, cardboard, plastic bottles, glass. Recyclable materials.',             iconCls: dark ? 'bg-blue-900/50 text-blue-400'    : 'bg-blue-100 text-blue-600',    badge: dark ? 'bg-blue-900/50 text-blue-400'    : 'bg-blue-100 text-blue-700',    border: dark ? 'border-blue-800'  : 'border-blue-200'  },
              { Icon: MdDevices,   title: 'E-Waste',         bin: 'Purple Bin',desc: 'Old phones, laptops, chargers. Requires certified e-waste recycling.',        iconCls: dark ? 'bg-purple-900/50 text-purple-400': 'bg-purple-100 text-purple-600', badge: dark ? 'bg-purple-900/50 text-purple-400': 'bg-purple-100 text-purple-700', border: dark ? 'border-purple-800': 'border-purple-200' },
              { Icon: MdWarning,   title: 'Hazardous Waste', bin: 'Red Bin',   desc: 'Batteries, medicines, paint. Must be disposed at designated facilities.',     iconCls: dark ? 'bg-red-900/50 text-red-400'      : 'bg-red-100 text-red-600',      badge: dark ? 'bg-red-900/50 text-red-400'      : 'bg-red-100 text-red-700',      border: dark ? 'border-red-800'   : 'border-red-200'   },
            ].map(({ Icon, title, bin, desc, iconCls, badge, border }) => (
              <div key={title} className={`rounded-2xl border p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 transition hover:shadow-md ${dark ? 'bg-gray-800/70' : 'bg-white/70'} ${border}`}>
                <span className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${badge}`}>{bin}</span>
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed hidden sm:block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} toast={toast} dark={dark} />
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default LandingPage;
