import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSearch, HiCheckCircle, HiXCircle, HiExclamation,
  HiCamera, HiStar, HiClipboardList, HiLogout, HiBell,
  HiChevronRight, HiLightBulb, HiHome, HiCollection,
  HiGift, HiUser, HiMenu, HiShieldCheck,
} from 'react-icons/hi';
import EcoLoopLogo from '../components/EcoLoopLogo';

const WASTE_DB = {
  'plastic bottle': { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Rinse before disposing. Remove cap separately.', recyclable: true,  compostable: false },
  'newspaper':      { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Keep dry. Bundle together for easy collection.', recyclable: true,  compostable: false },
  'cardboard':      { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Flatten boxes to save space in the bin.',        recyclable: true,  compostable: false },
  'glass bottle':   { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Do not break. Place whole in the bin.',          recyclable: true,  compostable: false },
  'aluminium can':  { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Crush to save space. Rinse before disposal.',    recyclable: true,  compostable: false },
  'paper':          { category: 'Dry Waste',  bin: 'Blue Bin',    tip: 'Keep dry and clean for recycling.',              recyclable: true,  compostable: false },
  'vegetable peel': { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Great for composting. Add to compost pit.',      recyclable: false, compostable: true  },
  'fruit peel':     { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Compost it or use as natural fertilizer.',       recyclable: false, compostable: true  },
  'food waste':     { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Drain excess liquid before disposing.',          recyclable: false, compostable: true  },
  'tea leaves':     { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Excellent compost material. Use in garden.',     recyclable: false, compostable: true  },
  'egg shell':      { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Crush and add to compost for calcium.',          recyclable: false, compostable: true  },
  'leaves':         { category: 'Wet Waste',  bin: 'Green Bin',   tip: 'Dry leaves make excellent compost.',             recyclable: false, compostable: true  },
  'battery':        { category: 'Hazardous',  bin: 'Red Bin',     tip: 'Never throw in regular bins. Use e-waste drop.', recyclable: false, compostable: false },
  'medicine':       { category: 'Hazardous',  bin: 'Red Bin',     tip: 'Return to pharmacy. Do not flush.',              recyclable: false, compostable: false },
  'paint':          { category: 'Hazardous',  bin: 'Red Bin',     tip: 'Take to hazardous waste facility.',              recyclable: false, compostable: false },
  'bulb':           { category: 'Hazardous',  bin: 'Red Bin',     tip: 'CFL bulbs contain mercury. Use e-waste drop.',   recyclable: false, compostable: false },
  'mobile phone':   { category: 'E-Waste',    bin: 'E-Waste Box', tip: 'Donate or drop at certified e-waste centre.',    recyclable: true,  compostable: false },
  'laptop':         { category: 'E-Waste',    bin: 'E-Waste Box', tip: 'Wipe data before donating or recycling.',        recyclable: true,  compostable: false },
  'charger':        { category: 'E-Waste',    bin: 'E-Waste Box', tip: 'Drop at e-waste collection point.',              recyclable: true,  compostable: false },
  'diaper':         { category: 'Sanitary',   bin: 'Black Bin',   tip: 'Wrap in newspaper before disposing.',            recyclable: false, compostable: false },
  'sanitary pad':   { category: 'Sanitary',   bin: 'Black Bin',   tip: 'Wrap securely. Never flush.',                    recyclable: false, compostable: false },
};

const BIN_COLORS = {
  'Blue Bin':    'bg-blue-100 text-blue-700 border-blue-300',
  'Green Bin':   'bg-green-100 text-green-700 border-green-300',
  'Red Bin':     'bg-red-100 text-red-700 border-red-300',
  'E-Waste Box': 'bg-purple-100 text-purple-700 border-purple-300',
  'Black Bin':   'bg-slate-100 text-slate-700 border-slate-300',
};
const CAT_COLORS = {
  'Dry Waste': 'bg-blue-500', 'Wet Waste': 'bg-green-500',
  'Hazardous': 'bg-red-500',  'E-Waste': 'bg-purple-500', 'Sanitary': 'bg-slate-500',
};
const TIPS = [
  'Rinse containers before recycling — food residue contaminates recyclables.',
  'Composting food scraps reduces landfill waste by up to 30%.',
  'One tonne of recycled paper saves 17 trees and 7,000 gallons of water.',
  'E-waste contains gold, silver, and copper — always recycle electronics.',
  'Segregating waste at source is the single most impactful eco habit.',
];
const RECENT = [
  { icon: HiSearch,      label: 'Searched "plastic bottle"',  time: '2 hrs ago',  color: 'text-blue-500',   bg: 'bg-blue-50' },
  { icon: HiCamera,      label: 'Reported garbage near park', time: 'Yesterday',  color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: HiStar,        label: 'Earned 20 Eco Points',       time: '2 days ago', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { icon: HiShieldCheck, label: 'Verified waste report',      time: '3 days ago', color: 'text-green-600',  bg: 'bg-green-50' },
];
const SUGGESTIONS = ['Plastic Bottle', 'Food Waste', 'Battery', 'Newspaper', 'Mobile Phone', 'Egg Shell', 'Cardboard', 'Bulb'];

// ─── Waste Checker ────────────────────────────────────────────────────────────
const WasteChecker = () => {
  const [query,  setQuery]  = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');

  const check = () => {
    const key = query.trim().toLowerCase();
    if (!key) return;
    const match = WASTE_DB[key];
    if (match) { setResult({ item: query.trim(), ...match }); setStatus('found'); }
    else        { setResult(null); setStatus('notfound'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#1F2937]">Waste Segregation Checker</h2>
        <p className="text-sm text-slate-500 mt-0.5">Enter any waste item to find the correct bin and disposal method.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text" value={query}
            onChange={e => { setQuery(e.target.value); setStatus('idle'); }}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="Enter waste item name (e.g. plastic bottle, battery)"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1F2937] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] bg-[#F7FDF8]"
          />
        </div>
        <button onClick={check}
          className="px-6 py-3 rounded-xl bg-[#22C55E] text-white text-sm font-semibold hover:bg-[#16A34A] active:scale-95 transition shadow-sm">
          Check Category
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-400 self-center">Try:</span>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => { setQuery(s); setStatus('idle'); setResult(null); }}
            className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200 hover:bg-green-100 transition">
            {s}
          </button>
        ))}
      </div>

      {/* Result card */}
      {status === 'found' && result && (
        <div className="rounded-xl border border-green-200 bg-[#F7FDF8] p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Item Name</p>
              <p className="text-xl font-bold text-[#1F2937] capitalize">{result.item}</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full text-white ${CAT_COLORS[result.category]}`}>
              {result.category}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Bin Type</p>
              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${BIN_COLORS[result.bin]}`}>
                🗑 {result.bin}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Disposal Tip</p>
              <p className="text-sm text-[#1F2937] leading-relaxed">{result.tip}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1 border-t border-green-100">
            <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${result.recyclable ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
              {result.recyclable ? <HiCheckCircle className="h-4 w-4" /> : <HiXCircle className="h-4 w-4" />}
              {result.recyclable ? 'Recyclable' : 'Not Recyclable'}
            </div>
            <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${result.compostable ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
              {result.compostable ? <HiCheckCircle className="h-4 w-4" /> : <HiXCircle className="h-4 w-4" />}
              {result.compostable ? 'Compostable' : 'Not Compostable'}
            </div>
          </div>
        </div>
      )}

      {status === 'notfound' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
          <HiExclamation className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700">Item not found in database</p>
            <p className="text-xs text-orange-600 mt-0.5">Try a simpler name like "plastic bottle", "food waste", or "battery".</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  { id: 'home',    icon: HiHome,        label: 'Dashboard' },
  { id: 'checker', icon: HiCollection,  label: 'Waste Checker' },
  { id: 'report',  icon: HiCamera,      label: 'Report Waste' },
  { id: 'rewards', icon: HiGift,        label: 'My Rewards' },
  { id: 'profile', icon: HiUser,        label: 'Profile' },
];

// ─── CitizenDashboard ─────────────────────────────────────────────────────────
const CitizenDashboard = () => {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const name      = user?.name || 'Citizen';
  const points    = user?.rewards?.points ?? 120;
  const tip       = TIPS[new Date().getDay() % TIPS.length];

  const [tab,      setTab]      = useState('home');
  const [sideOpen, setSideOpen] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7FDF8] flex flex-col">

      {/* ── Top navbar ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 h-16 flex items-center px-4 gap-4">
        <button onClick={() => setSideOpen(o => !o)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <HiMenu className="h-5 w-5" />
        </button>
        <EcoLoopLogo height={34} />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            <HiStar className="h-4 w-4 text-yellow-500" />
            {points} pts
          </div>
          <button className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <HiBell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#22C55E]" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-sm font-bold">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-[#1F2937]">{name}</span>
          </div>
          <button onClick={logout}
            className="ml-1 p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition" aria-label="Logout">
            <HiLogout className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className={`${sideOpen ? 'w-56' : 'w-0 overflow-hidden'} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col shrink-0`}>
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  tab === id
                    ? 'bg-green-50 text-[#16A34A] border border-green-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-[#1F2937]'
                }`}>
                <Icon className={`h-5 w-5 shrink-0 ${tab === id ? 'text-[#22C55E]' : ''}`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition">
              <HiLogout className="h-5 w-5 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Greeting + stats row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-gradient-to-r from-[#16A34A] to-[#22C55E] rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Welcome back 👋</p>
                <h1 className="text-2xl font-bold mt-1">{name}</h1>
                <p className="text-green-100 text-sm mt-1">Citizen · EcoLoop Member</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
                  <HiStar className="h-6 w-6 text-yellow-300 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{points}</p>
                  <p className="text-xs text-green-100">Eco Points</p>
                </div>
              </div>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <HiLightBulb className="h-5 w-5 text-[#38BDF8] shrink-0" />
                <span className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wide">Daily Eco Tip</span>
              </div>
              <p className="text-sm text-[#1E3A8A] leading-relaxed">{tip}</p>
            </div>
          </div>

          {/* Quick action cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: HiCollection,   label: 'Waste Checker',  desc: 'Find the right bin',      color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', tab: 'checker' },
              { icon: HiCamera,       label: 'Report Waste',   desc: 'Submit a garbage report', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tab: 'report' },
              { icon: HiGift,         label: 'My Rewards',     desc: 'View earned points',      color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', tab: 'rewards' },
              { icon: HiClipboardList,label: 'Activity Log',   desc: 'Recent actions',          color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   tab: 'home' },
            ].map(({ icon: Icon, label, desc, color, bg, border, tab: t }) => (
              <button key={label} onClick={() => setTab(t)}
                className={`flex flex-col gap-3 rounded-2xl border p-5 text-left shadow-sm hover:shadow-md active:scale-95 transition bg-white ${border}`}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#1F2937]">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Waste Checker — always visible on home, or when tab = checker */}
          {(tab === 'home' || tab === 'checker') && <WasteChecker />}

          {/* Report Waste placeholder */}
          {tab === 'report' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#1F2937]">Report Waste</h2>
              <p className="text-sm text-slate-500">Submit a garbage or illegal dumping report to your municipality.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-green-300 hover:text-green-500 cursor-pointer transition">
                  <HiCamera className="h-8 w-8" />
                  <span className="text-sm font-medium">Upload Photo</span>
                </div>
                <div className="space-y-3">
                  <input placeholder="Location / Area" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E]" />
                  <textarea rows={3} placeholder="Describe the issue..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] resize-none" />
                  <button className="w-full py-3 rounded-xl bg-[#22C55E] text-white text-sm font-semibold hover:bg-[#16A34A] transition">Submit Report</button>
                </div>
              </div>
            </div>
          )}

          {/* Rewards placeholder */}
          {tab === 'rewards' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#1F2937]">My Rewards</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl p-5 text-white text-center shadow">
                  <HiStar className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-3xl font-bold">{points}</p>
                  <p className="text-sm opacity-80 mt-1">Total Eco Points</p>
                </div>
                {['♻️ Recycler', '🌱 Green Starter', '📍 Reporter'].map(badge => (
                  <div key={badge} className="border border-slate-200 rounded-2xl p-5 text-center">
                    <p className="text-3xl mb-2">{badge.split(' ')[0]}</p>
                    <p className="text-sm font-semibold text-[#1F2937]">{badge.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-slate-400 mt-1">Badge earned</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity + Bin Guide — home tab */}
          {tab === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#1F2937]">Recent Activity</h2>
                  <button className="text-xs text-[#22C55E] font-medium flex items-center gap-0.5 hover:underline">
                    View all <HiChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {RECENT.map(({ icon: Icon, label, time, color, bg }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1F2937] truncate">{label}</p>
                        <p className="text-xs text-slate-400">{time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-[#1F2937] mb-4">Bin Color Guide</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { bin: 'Blue Bin',    desc: 'Dry / Recyclable', dot: 'bg-blue-500',   bg: 'bg-blue-50' },
                    { bin: 'Green Bin',   desc: 'Wet / Organic',    dot: 'bg-green-500',  bg: 'bg-green-50' },
                    { bin: 'Red Bin',     desc: 'Hazardous Waste',  dot: 'bg-red-500',    bg: 'bg-red-50' },
                    { bin: 'E-Waste Box', desc: 'Electronics',      dot: 'bg-purple-500', bg: 'bg-purple-50' },
                    { bin: 'Black Bin',   desc: 'Sanitary Waste',   dot: 'bg-slate-500',  bg: 'bg-slate-50' },
                  ].map(({ bin, desc, dot, bg }) => (
                    <div key={bin} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${bg}`}>
                      <span className={`h-3 w-3 rounded-full shrink-0 ${dot}`} />
                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]">{bin}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default CitizenDashboard;
