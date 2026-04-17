import { 
  HiClipboardList, HiCalendar, HiTruck, HiRefresh,
  HiLocationMarker, HiClock, HiCheckCircle, HiStar,
  HiUsers, HiLibrary, HiPhotograph, HiMail,
  HiMap, HiExclamation, HiSparkles
} from 'react-icons/hi';
import { 
  MdWaterDrop, MdRecycling, MdDevices, MdWarning, 
  MdEmojiEvents, MdCamera, MdEmail, MdShare
} from 'react-icons/md';
import { FaTwitter, FaInstagram, FaLinkedin, FaGlobeAmericas } from 'react-icons/fa';
import { SiX } from 'react-icons/si';

const Section = ({ id, className = '', children }) => (
  <section id={id} className={`py-16 px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>
);

const SectionHeader = ({ tag, title, sub }) => (
  <div className="text-center mb-10">
    {tag && <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">{tag}</span>}
    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{title}</h2>
    {sub && <p className="mt-3 text-slate-500 max-w-xl mx-auto text-sm sm:text-base">{sub}</p>}
  </div>
);

const STEPS = [
  { Icon: HiClipboardList, step: '01', title: 'Segregate Waste',   desc: 'Sort your waste into wet, dry, e-waste, and hazardous categories at home.' },
  { Icon: HiCalendar,      step: '02', title: 'Schedule Pickup',    desc: 'Request a pickup through EcoLoop and choose a convenient time slot.' },
  { Icon: HiTruck,         step: '03', title: 'Collector Arrives',  desc: 'A verified collector arrives at your door and collects the segregated waste.' },
  { Icon: HiRefresh,       step: '04', title: 'Waste Recycled',     desc: 'Waste is sent to the right facility — recycled, composted, or safely disposed.' },
];

export const HowItWorks = () => (
  <Section id="how-it-works" className="bg-white">
    <div className="max-w-5xl mx-auto">
      <SectionHeader tag="Simple Process" title="How EcoLoop Works" sub="Four easy steps to responsible waste management." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map(({ Icon, step, title, desc }) => (
          <div key={step} className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-slate-100 bg-[#F7FDF8] hover:shadow-md transition">
            <span className="absolute -top-3 left-4 text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{step}</span>
            <Icon className="h-10 w-10 text-green-600 mb-4" />
            <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

const CATEGORIES = [
  { Icon: MdWaterDrop, color: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',  title: 'Wet Waste',       desc: 'Food scraps, vegetable peels, tea leaves. Compostable and biodegradable.' },
  { Icon: MdRecycling, color: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700',    title: 'Dry Waste',       desc: 'Paper, cardboard, plastic bottles, glass. Recyclable materials.' },
  { Icon: MdDevices,   color: 'bg-purple-50 border-purple-200',badge: 'bg-purple-100 text-purple-700',title: 'E-Waste',         desc: 'Old phones, laptops, chargers. Requires certified e-waste recycling.' },
  { Icon: MdWarning,   color: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700',      title: 'Hazardous Waste', desc: 'Batteries, medicines, paint. Must be disposed at designated facilities.' },
];

export const WasteCategories = () => (
  <Section id="categories" className="bg-[#F7FDF8]">
    <div className="max-w-5xl mx-auto">
      <SectionHeader tag="Know Your Waste" title="Waste Categories" sub="Understanding waste types is the first step to responsible disposal." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {CATEGORIES.map(({ Icon, color, badge, title, desc }) => (
          <div key={title} className={`rounded-2xl border p-5 flex flex-col gap-3 hover:shadow-md transition ${color}`}>
            <Icon className="h-8 w-8" />
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${badge}`}>{title}</span>
            <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

export const SchedulePickup = ({ onGetStarted }) => (
  <Section id="schedule" className="bg-white">
    <div className="max-w-3xl mx-auto text-center">
      <SectionHeader tag="Doorstep Service" title="Schedule a Waste Pickup" sub="Don't wait for garbage day. Request a pickup at your convenience and a verified collector will come to you." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
        {[
          { Icon: HiLocationMarker, t: 'Enter Location',   d: 'Share your address or use GPS to auto-detect.' },
          { Icon: HiClock,          t: 'Pick a Time Slot', d: 'Choose morning, afternoon, or evening pickup.' },
          { Icon: HiCheckCircle,    t: 'Confirm & Done',   d: 'A collector is assigned and notified instantly.' },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="flex gap-3 p-4 rounded-xl bg-[#F7FDF8] border border-slate-100">
            <Icon className="h-6 w-6 text-green-600 shrink-0" />
            <div><p className="text-sm font-semibold text-slate-900">{t}</p><p className="text-xs text-slate-500 mt-0.5">{d}</p></div>
          </div>
        ))}
      </div>
      <button onClick={onGetStarted}
        className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-green-700 transition shadow-md text-sm">
        <HiCalendar className="h-5 w-5" /> Schedule Pickup Now
      </button>
    </div>
  </Section>
);

const REWARDS = [
  { Icon: HiClipboardList, pts: '+10 pts', action: 'Segregate waste correctly' },
  { Icon: HiCalendar,      pts: '+15 pts', action: 'Schedule a pickup' },
  { Icon: HiPhotograph,    pts: '+20 pts', action: 'Report a garbage issue' },
  { Icon: HiRefresh,       pts: '+25 pts', action: 'Recycle 1 kg of dry waste' },
];

export const EcoPoints = ({ onGetStarted }) => (
  <Section id="rewards" className="bg-gradient-to-br from-green-600 to-green-700">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">Earn While You Care</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Earn EcoPoints for Every Action</h2>
        <p className="mt-3 text-green-100 max-w-xl mx-auto text-sm sm:text-base">Responsible waste disposal earns you points. Redeem them for rewards, discounts, and community recognition.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {REWARDS.map(({ Icon, pts, action }) => (
          <div key={action} className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center hover:bg-white/20 transition">
            <Icon className="h-8 w-8 mx-auto text-yellow-300 mb-2" />
            <span className="text-lg font-extrabold text-yellow-300">{pts}</span>
            <p className="text-xs text-green-100 mt-1 leading-snug">{action}</p>
          </div>
        ))}
      </div>
      <div className="text-center">
        <button onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition shadow-md text-sm">
          <HiStar className="h-5 w-5" /> Start Earning Points
        </button>
      </div>
    </div>
  </Section>
);

const STATS = [
  { value: '50,000+', label: 'Citizens Joined',    Icon: HiUsers },
  { value: '1,200+',  label: 'Active Collectors',  Icon: HiTruck },
  { value: '200+',    label: 'Municipalities',      Icon: HiLibrary },
  { value: '850 T',   label: 'Waste Recycled',      Icon: HiRefresh },
];

export const ImpactStats = () => (
  <Section id="impact" className="bg-[#F7FDF8]">
    <div className="max-w-5xl mx-auto">
      <SectionHeader tag="Our Impact" title="Making a Real Difference" sub="EcoLoop is transforming waste management across India, one city at a time." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS.map(({ value, label, Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm hover:shadow-md transition">
            <Icon className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl sm:text-3xl font-extrabold text-green-600">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

export const NearbyBins = ({ onGetStarted }) => (
  <Section id="nearby" className="bg-white">
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">Find Nearby</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">Locate Recycling Bins & Collection Centers</h2>
          <p className="text-slate-500 text-sm sm:text-base mb-6 leading-relaxed">Use EcoLoop's map to find the nearest recycling bins, e-waste drop points, and collection centers in your area.</p>
          <div className="space-y-3 mb-6">
            {['🔵 Blue Bins — Dry & Recyclable Waste', '🟢 Green Bins — Wet & Organic Waste', '🔴 Red Bins — Hazardous Waste', '🟣 E-Waste Drop Points'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition text-sm">
            <HiLocationMarker className="h-5 w-5" /> Find Bins Near Me
          </button>
        </div>
        <div className="rounded-2xl bg-[#F7FDF8] border border-slate-200 h-64 flex items-center justify-center text-slate-400">
          <div className="text-center space-y-2">
            <HiMap className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Interactive map coming soon</p>
            <p className="text-xs">Login to access live bin locations</p>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export const ReportGarbage = ({ onGetStarted }) => (
  <Section id="report" className="bg-[#F7FDF8]">
    <div className="max-w-3xl mx-auto text-center">
      <SectionHeader tag="Civic Action" title="Report Illegal Dumping or Garbage Issues" sub="Spotted overflowing bins or illegal dumping? Report it in seconds and help keep your city clean." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
        {[
          { Icon: HiPhotograph, t: 'Take a Photo',      d: 'Capture the garbage issue with your camera.' },
          { Icon: HiLocationMarker, t: 'Tag Location',       d: 'Pin the exact location on the map.' },
          { Icon: HiMail,       t: 'Submit to Council',  d: 'Report is sent directly to the municipality.' },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="flex gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
            <Icon className="h-6 w-6 text-orange-500 shrink-0" />
            <div><p className="text-sm font-semibold text-slate-900">{t}</p><p className="text-xs text-slate-500 mt-0.5">{d}</p></div>
          </div>
        ))}
      </div>
      <button onClick={onGetStarted}
        className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-orange-600 transition shadow-md text-sm">
        <HiExclamation className="h-5 w-5" /> Report a Garbage Issue
      </button>
    </div>
  </Section>
);

const TESTIMONIALS = [
  { name: 'Priya Sharma',   role: 'Citizen, Pune',       avatar: 'PS', text: 'EcoLoop made waste segregation so easy. I earn EcoPoints every week and my colony is visibly cleaner!' },
  { name: 'Rajan Mehta',    role: 'Citizen, Ahmedabad',  avatar: 'RM', text: 'Scheduling a pickup takes 30 seconds. The collector always arrives on time. Highly recommended.' },
  { name: 'Anita Desai',    role: 'Green Champion, Surat',avatar: 'AD',text: 'I run composting drives in my locality. EcoLoop helps me track participation and reward volunteers.' },
  { name: 'Suresh Kumar',   role: 'Citizen, Bangalore',  avatar: 'SK', text: 'Finally an app that tells me exactly which bin to use. The waste checker feature is brilliant.' },
];

export const Testimonials = () => (
  <Section id="testimonials" className="bg-white">
    <div className="max-w-5xl mx-auto">
      <SectionHeader tag="What People Say" title="Trusted by Citizens Across India" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TESTIMONIALS.map(({ name, role, avatar, text }) => (
          <div key={name} className="bg-[#F7FDF8] border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition">
            <p className="text-sm text-slate-600 leading-relaxed flex-1">"{text}"</p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <p className="text-xs text-slate-400">{role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

export const Footer = ({ onGetStarted }) => (
  <footer className="bg-slate-900 text-slate-400 pt-12 pb-6 px-4 sm:px-6 lg:px-8">
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <HiSparkles className="h-6 w-6 text-green-400" />
            <span className="text-white font-bold text-lg">EcoLoop</span>
          </div>
          <p className="text-xs leading-relaxed">Connecting citizens, collectors, and municipalities for smarter, cleaner waste management.</p>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-3">Platform</p>
          <ul className="space-y-2 text-xs">
            {['How It Works', 'Waste Checker', 'Schedule Pickup', 'Report Garbage'].map(l => (
              <li key={l}><button onClick={onGetStarted} className="hover:text-green-400 transition">{l}</button></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-3">Company</p>
          <ul className="space-y-2 text-xs">
            {['About Us', 'Contact', 'Privacy Policy', 'Terms of Service'].map(l => (
              <li key={l}><button className="hover:text-green-400 transition">{l}</button></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-3">Follow Us</p>
          <div className="flex gap-3">
            {[
              { label: 'Twitter',   Icon: SiX },
              { label: 'Instagram', Icon: FaInstagram },
              { label: 'LinkedIn',  Icon: FaLinkedin },
            ].map(({ label, Icon }) => (
              <button key={label} aria-label={label}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-green-600 flex items-center justify-center text-sm transition">
                <Icon className="h-4 w-4 text-white" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <p>© {new Date().getFullYear()} EcoLoop. All rights reserved.</p>
        <p className="text-green-500 font-medium flex items-center gap-2">
          <FaGlobeAmericas className="h-3.5 w-3.5" /> Building a cleaner, greener India
        </p>
      </div>
    </div>
  </footer>
);
