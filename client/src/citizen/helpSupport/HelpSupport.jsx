import { useState } from 'react';
import { HiChevronDown, HiChevronUp, HiMail, HiExclamationCircle, HiChat } from 'react-icons/hi';
import { useTheme } from '../../shared/context/ThemeContext';

const FAQ_ITEMS = [
  { q: 'How do I submit a waste report?',         a: 'Go to "Report Waste" from the sidebar or dashboard. Fill in the waste type, description, location on the map, and preferred pickup time, then submit.' },
  { q: 'Can I edit a submitted report?',          a: 'Yes, you can edit a report as long as its status is "Submitted". Once it moves to "In Progress" or "Resolved", editing is disabled.' },
  { q: 'How are Eco Points calculated?',          a: 'You earn +5 pts for submitting a report, +10 pts when verified, +15 pts when resolved, and +2 pts for supporting another report.' },
  { q: 'What is the daily report limit?',         a: 'Citizens can submit up to 5 waste reports per day to maintain quality and prevent spam.' },
  { q: 'How does duplicate detection work?',      a: 'Before submitting, the system checks for existing reports within 50 meters created in the last 24 hours. If found, you\'ll be notified and can choose to support the existing report instead.' },
  { q: 'How do I earn badges?',                   a: 'Badges are awarded based on your total Eco Points: Eco Beginner (50 pts), Green Supporter (100 pts), Eco Warrior (200 pts), Green Champion (500 pts).' },
  { q: 'What does the Nearby Issues map show?',   a: 'It shows waste reports submitted by all citizens within your selected radius (1–5 km). Markers are color-coded by severity: red = High, yellow = Medium, green = Low.' },
];

const FAQItem = ({ q, a, dark }) => {
  const [open, setOpen] = useState(false);
  const border  = dark ? 'border-slate-700' : 'border-slate-100';
  const qColor  = dark ? 'text-slate-200' : 'text-slate-800';
  const aColor  = dark ? 'text-slate-400' : 'text-slate-500';
  const iconCls = dark ? 'text-slate-500' : 'text-slate-400';
  return (
    <div className={`border-b ${border} last:border-0`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <span className={`text-sm font-medium ${qColor}`}>{q}</span>
        {open ? <HiChevronUp className={`h-4 w-4 shrink-0 ${iconCls}`} /> : <HiChevronDown className={`h-4 w-4 shrink-0 ${iconCls}`} />}
      </button>
      {open && <p className={`px-5 pb-4 text-xs leading-relaxed ${aColor}`}>{a}</p>}
    </div>
  );
};

const HelpSupport = () => {
  const { dark } = useTheme();
  const [feedback, setFeedback] = useState('');
  const [sent,     setSent]     = useState(false);

  const card    = dark ? 'bg-white/5 border-gray-700' : 'bg-white border-slate-200';
  const title   = dark ? 'text-slate-200' : 'text-slate-800';
  const sub     = dark ? 'text-slate-400' : 'text-slate-500';
  const divider = dark ? 'border-slate-700' : 'border-slate-100';
  const inp     = `w-full rounded-sm border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200 ${dark ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className={`text-base font-medium ${title}`}>Help & Support</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>Find answers and get in touch</p>
      </div>

      <div className={`rounded-sm border overflow-hidden transition-colors duration-200 ${card}`}>
        <div className={`px-5 py-3 border-b ${divider}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Frequently Asked Questions</p>
        </div>
        {FAQ_ITEMS.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} dark={dark} />)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: HiMail,  label: 'Contact Support', desc: 'Email us at support@ecoloop.in', color: dark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600' },
          { icon: HiExclamationCircle, label: 'Report a Bug',    desc: 'Found an issue? Let us know',    color: dark ? 'bg-red-900/40 text-red-400'  : 'bg-red-50 text-red-600'   },
          { icon: HiChat,  label: 'Live Chat',       desc: 'Chat with our support team',     color: dark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <button key={label}
            className={`flex flex-col items-center gap-2 rounded-sm border p-5 text-center transition-colors duration-200 hover:shadow-sm ${card}`}>
            <div className={`h-11 w-11 rounded-sm flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-sm font-semibold ${title}`}>{label}</p>
            <p className={`text-xs ${sub}`}>{desc}</p>
          </button>
        ))}
      </div>

      <div className={`rounded-sm border p-5 space-y-4 transition-colors duration-200 ${card}`}>
        <div>
          <p className={`text-sm font-semibold ${title}`}>Send Feedback</p>
          <p className={`text-xs mt-0.5 ${sub}`}>Help us improve EcoLoop</p>
        </div>
        {sent ? (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${dark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-700'}`}>
            <HiCheckCircle className="h-5 w-5" /> Thank you for your feedback!
          </div>
        ) : (
          <>
            <textarea rows={4} value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report an issue..."
              className={`${inp} resize-none`} />
            <button onClick={() => { if (feedback.trim()) setSent(true); }}
              disabled={!feedback.trim()}
              className="w-full rounded-xl bg-green-600 text-white text-sm font-semibold py-2.5 hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
              Submit Feedback
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HelpSupport;
