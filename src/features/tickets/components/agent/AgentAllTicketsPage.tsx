// src/features/tickets/components/agent/AgentAllTicketsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchAgentAllTickets } from '../../slices/ticketsSlice';
import { agentNav } from './agentNav';
import { TicketQueueItem } from '../../../../types';

const STATUSES = ['all','assigned', 'in_progress', 'on_hold',
  'resolved', 'closed', 'reopened'];

const SORT_OPTIONS = [
  { value: 'default',  label: 'Default' },
  { value: 'sla_due',  label: 'SLA due soonest' },
  { value: 'created',  label: 'Newest first' },
];

const COL = {
  ticket:   'w-28',
  severity: 'w-24',
  priority: 'w-20',
  status:   'w-36',
  sla:      'w-48',
  arrow:    'w-4',
};

// ── SLA Cell — no colours, plain text only ────────────────────────────────────

const SLACell: React.FC<{
  responseDue?: string;
  resolveDue?:  string;
}> = ({ responseDue, resolveDue }) => {
  if (!responseDue && !resolveDue) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {responseDue && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide w-7 flex-shrink-0 text-slate-400">Res</span>
          <span className="text-xs text-slate-700">{format(new Date(responseDue), 'MMM d, h:mm a')}</span>
        </div>
      )}
      {resolveDue && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide w-7 flex-shrink-0 text-slate-400">Fix</span>
          <span className="text-xs text-slate-700">{format(new Date(resolveDue), 'MMM d, h:mm a')}</span>
        </div>
      )}
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const Row: React.FC<{ ticket: TicketQueueItem }> = ({ ticket }) => (
  <Link to={`/tickets/agent/${ticket.id}`} className="group block">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 hover:bg-blue-50/60 transition-colors">

      <div className={clsx('flex-shrink-0', COL.ticket)}>
        <span className="text-xs font-mono text-slate-600">{ticket.ticket_number}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium truncate group-hover:text-blue-700">
          {ticket.title ?? '(No title)'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}
        </p>
      </div>

      <div className={clsx('flex-shrink-0 flex items-center gap-1.5', COL.severity)}>
        {ticket.severity && <SeverityDot severity={ticket.severity} />}
        <span className="text-xs text-slate-600 capitalize">{ticket.severity ?? '—'}</span>
      </div>

      <div className={clsx('flex-shrink-0 text-center', COL.priority)}>
        {ticket.priority
          ? <PriorityLabel priority={ticket.priority} />
          : <span className="text-slate-400 text-xs">—</span>}
      </div>

      <div className={clsx('flex-shrink-0', COL.status)}>
        <StatusBadge status={ticket.status} />
      </div>

      <div className={clsx('flex-shrink-0', COL.sla)}>
        <SLACell
          responseDue={ticket.sla_response_due}
          resolveDue={ticket.sla_resolve_due}
        />
      </div>

      <div className={clsx('flex-shrink-0 text-slate-400 group-hover:text-blue-500', COL.arrow)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </Link>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const AgentAllTicketsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { agentTickets, isLoading } = useAppSelector((s) => s.tickets);

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('default');
  const [search,       setSearch]       = useState('');

  useEffect(() => { dispatch(fetchAgentAllTickets()); }, [dispatch]);

  const filtered = useMemo(() => {
    let list = [...agentTickets];

    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          (t.title ?? '').toLowerCase().includes(q),
      );
    }

    if (sortBy === 'sla_due') {
      list = [...list].sort((a, b) => {
        const aTime = a.sla_response_due ?? a.sla_resolve_due;
        const bTime = b.sla_response_due ?? b.sla_resolve_due;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
    } else if (sortBy === 'created') {
      list = [...list].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [agentTickets, statusFilter, sortBy, search]);

  const slaBreachedCount = agentTickets.filter(
    (t) => t.sla_breached_at || t.response_sla_breached_at,
  ).length;

  const hasActiveFilters = statusFilter !== 'all' || search.trim();

  return (
    <MainLayout navItems={agentNav} pageTitle="All My Tickets">
      <div className="p-6">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Assigned Tickets</h2>
            <p className="text-slate-500 text-sm mt-1">
              {agentTickets.length} total
              {slaBreachedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {slaBreachedCount} SLA breach{slaBreachedCount > 1 ? 'es' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket # or issue title…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex-shrink-0">Status</span>
            <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 flex-wrap">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                    statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900',
                  )}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="h-7 px-2 rounded border border-slate-200 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 transition-colors">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={() => { setStatusFilter('all'); setSearch(''); setSortBy('default'); }}
                  className="h-7 px-2.5 rounded border border-slate-200 text-xs text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-blue-50/50">
            <div className={clsx('flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest', COL.ticket)}>Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-blue-600 uppercase tracking-widest">Issue</div>
            <div className={clsx('flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest', COL.severity)}>Severity</div>
            <div className={clsx('flex-shrink-0 text-center text-xs font-semibold text-blue-600 uppercase tracking-widest', COL.priority)}>Priority</div>
            <div className={clsx('flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest', COL.status)}>Status</div>
            <div className={clsx('flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest', COL.sla)}>SLA Deadlines</div>
            <div className={COL.arrow} />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-500 text-sm">
                {hasActiveFilters ? 'No tickets match the current filters.' : 'No tickets found'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => { setStatusFilter('all'); setSearch(''); setSortBy('default'); }}
                  className="mt-2 text-xs text-blue-500 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((t) => <Row key={t.id} ticket={t} />)
          )}
        </div>

        {(hasActiveFilters || search) && !isLoading && (
          <p className="text-xs text-slate-500 mt-3 px-1">
            Showing {filtered.length} of {agentTickets.length} tickets
          </p>
        )}

      </div>
    </MainLayout>
  );
};