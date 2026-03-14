import { useState } from 'react';
import { HiArrowRight, HiMoon, HiSun } from 'react-icons/hi';
import AuthModal from '../components/AuthModal';
import { ToastContainer, useToast } from '../components/Toast';
import EcoLoopLogo from '../components/EcoLoopLogo';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { toasts, toast, remove } = useToast();

  return (
    <div className="min-h-screen w-full relative overflow-hidden">

      {/* Background — switches based on mode */}
      <div
        className="absolute inset-0 z-0 transition-all duration-500"
        style={{
          background: dark
            ? 'radial-gradient(125% 125% at 50% 90%, #000000 40%, #072607 100%)'
            : 'radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)',
        }}
      />

      {/* Navbar + Hero — blurs when modal opens */}
      <div
        className={`relative z-10 transition-all duration-300 ${
          isAuthModalOpen ? 'blur-sm brightness-75 pointer-events-none select-none' : ''
        }`}
      >
        {/* Navbar */}
        <nav className="w-full flex items-center justify-between px-6 sm:px-12 py-4">
          {/* Logo — shifted right with pl */}
          <div className="pl-4 sm:pl-8">
            <EcoLoopLogo height={44} dark={dark} />
          </div>

          {/* Dark/Light mode icon button */}
          <button
            onClick={() => setDark(d => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`rounded-lg p-2 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 ${
              dark
                ? 'text-green-300 hover:bg-white/10'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {dark
              ? <HiSun className="h-6 w-6" />
              : <HiMoon className="h-6 w-6" />
            }
          </button>
        </nav>

        {/* Hero */}
        <div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">

            {/* Badge */}
            <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium ${
              dark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
            }`}>
              <span>🌱</span>
              <span>Join the Circular Economy Revolution</span>
            </div>

            {/* Headline */}
            <h1 className="font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              <span className={`block mb-1 sm:mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
                Close the Loop.
              </span>
              <span className={dark ? 'block text-green-400' : 'block text-green-600'}>
                Save the Planet.
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`max-w-2xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed px-2 ${
              dark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              The unified platform connecting citizens, collectors, recyclers, and
              municipalities to transform waste management through technology and collaboration.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4 px-4 sm:px-0">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-md transition hover:bg-green-500 focus:outline-none focus:ring-4 focus:ring-green-300 active:scale-95"
              >
                Get Started Free
                <HiArrowRight className="h-5 w-5" />
              </button>

              <button className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold shadow-sm transition focus:outline-none focus:ring-4 active:scale-95 ${
                dark
                  ? 'border-green-500 text-green-400 hover:bg-green-900/30 focus:ring-green-800'
                  : 'border-green-600 bg-white text-green-600 hover:bg-green-50 focus:ring-green-200'
              }`}>
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 sm:pt-6">
              {[
                { value: '50K+', label: 'Citizens' },
                { value: '1.2K', label: 'Collectors' },
                { value: '200+', label: 'Municipalities' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl sm:text-2xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                  <p className={`text-xs sm:text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        toast={toast}
        dark={dark}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default LandingPage;
