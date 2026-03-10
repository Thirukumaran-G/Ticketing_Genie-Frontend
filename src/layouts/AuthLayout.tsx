// src/components/layout/AuthLayout.tsx
import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({
  children, title, subtitle,
}) => (
  <div className="min-h-screen bg-black flex">
    {/* Left panel */}
    <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 bg-zinc-950 border-r border-zinc-900">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-white font-bold text-xl">Ticketing Genie</span>
      </div>
      <div>
        <p className="text-zinc-400 text-lg leading-relaxed mb-8">
          "Resolve faster. Serve better. Every ticket counts."
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[['95%', 'Email→Ticket Rate'], ['99.2%', 'SLA Compliance'], ['< 2 min', 'Avg Response']].map(([v, l]) => (
            <div key={l} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="text-white font-bold text-xl">{v}</div>
              <div className="text-zinc-500 text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-zinc-700 text-xs">© 2026 Ticketing Genie · Powered by Genworx</p>
    </div>

    {/* Right form panel */}
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-white font-bold">Ticketing Genie</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        {subtitle && <p className="text-zinc-500 text-sm mb-8">{subtitle}</p>}
        {children}
      </div>
    </div>
  </div>
);
