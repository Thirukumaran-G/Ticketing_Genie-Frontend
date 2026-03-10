// src/features/tickets/components/shared/TicketBadges.tsx
import React from 'react';
import { clsx } from 'clsx';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  new:          { label: 'New',          cls: 'bg-zinc-800 text-zinc-300' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-950 text-blue-400' },
  open:         { label: 'Open',         cls: 'bg-blue-950 text-blue-400' },
  in_progress:  { label: 'In Progress',  cls: 'bg-yellow-950 text-yellow-400' },
  on_hold:      { label: 'On Hold',      cls: 'bg-orange-950 text-orange-400' },
  resolved:     { label: 'Resolved',     cls: 'bg-green-950 text-green-400' },
  closed:       { label: 'Closed',       cls: 'bg-zinc-800 text-zinc-500' },
};

const SEV_DOT: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-blue-500',
};

const PRI_CLS: Record<string, string> = {
  P0: 'text-red-400', P1: 'text-orange-400', P2: 'text-yellow-400', P3: 'text-blue-400',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.new;
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>
      {cfg.label}
    </span>
  );
};

export const SeverityDot: React.FC<{ severity: string }> = ({ severity }) => (
  <span className={clsx('inline-block w-2 h-2 rounded-full flex-shrink-0', SEV_DOT[severity] ?? 'bg-zinc-500')} />
);

export const PriorityLabel: React.FC<{ priority: string }> = ({ priority }) => (
  <span className={clsx('font-bold text-xs', PRI_CLS[priority] ?? 'text-zinc-500')}>{priority}</span>
);

// SLA breach pill
export const SLABreachPill: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    SLA Breach
  </span>
);
