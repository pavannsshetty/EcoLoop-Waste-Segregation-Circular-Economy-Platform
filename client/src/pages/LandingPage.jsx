import { useState } from 'react';
import { HiArrowRight } from 'react-icons/hi';
import AuthModal from '../components/AuthModal';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {/* Emerald Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)`,
          backgroundSize: '100% 100%',
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 transition-all duration-300 ${
          isAuthModalOpen ? 'blur-sm brightness-75 pointer-events-none select-none' : ''
        }`}
      >
        <div className="w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center justify-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
            <span>🌱</span>
            <span>Join the Circular Economy Revolution</span>
          </div>

          {/* Headline */}
          <h1 className="font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-slate-900 mb-1 sm:mb-2">Close the Loop.</span>
            <span className="block text-green-600">Save the Planet.</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed px-2">
            The unified platform connecting citizens, collectors, recyclers, and
            municipalities to transform waste management through technology and collaboration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4 px-4 sm:px-0">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-md transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 active:scale-95"
            >
              Get Started Free
              <HiArrowRight className="h-5 w-5" />
            </button>

            <button
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 border-green-600 bg-white px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-green-600 shadow-sm transition hover:bg-green-50 focus:outline-none focus:ring-4 focus:ring-green-200 active:scale-95"
            >
              Learn More
            </button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 sm:pt-6">
            {[
              { value: '50K+', label: 'Citizens' },
              { value: '1.2K', label: 'Collectors' },
              { value: '200+', label: 'Municipalities' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{value}</p>
                <p className="text-xs sm:text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
