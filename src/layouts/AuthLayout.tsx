import React from 'react';

const quotes = [
  "Great support turns users into advocates.",
  "Clarity in every response. Care in every word.",
  "The right answer, right on time.",
  "Behind every ticket is someone who needs help.",
  "Good support is invisible. Great support is unforgettable.",
];

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({ children, title, subtitle }) => {
  const [q, setQ] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setQ(i => (i + 1) % quotes.length), 10000); return () => clearInterval(t); }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 bg-blue-950 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-wide">Ticketing Genie</span>
        </div>

        <div className="relative z-10">
          <p className="text-blue-300 text-xs uppercase tracking-widest mb-3 font-semibold">Today's Insight</p>
          <p className="text-white text-2xl font-semibold leading-snug mb-5">"{quotes[q]}"</p>
          <div className="flex gap-1.5">
            {quotes.map((_,i) => (
              <span key={i} onClick={() => setQ(i)} className="h-1 rounded-full cursor-pointer transition-all duration-300" style={{ width: i===q ? 20 : 6, background: i===q ? '#3b82f6' : 'rgba(148,163,184,0.2)' }}/>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs relative z-10">© 2026 Ticketing Genie · Powered by Genworx</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white lg:bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-slate-800 font-bold text-lg">Ticketing Genie</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mb-8">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
};
