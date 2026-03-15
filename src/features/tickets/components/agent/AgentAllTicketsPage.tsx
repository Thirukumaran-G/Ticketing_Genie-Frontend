// src/features/tickets/components/agent/AgentAllTicketsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchAgentAllTickets } from '../../slices/ticketsSlice';
import { agentNav } from './agentNav';
import { TicketDetail } from '../../../../types';

const STATUSES = ['all', 'new', 'open', 'acknowledged', 'in_progress', 'on_hold', 'resolved', 'closed'];

// ── SLA Cell ──────────────────────────────────────────────────────────────────

const SLACell: React.FC<{
  responseDue?: string;
  resolveDue?: string;
  responseBreached?: string;
  resolveBreached?: string;
}> = ({ responseDue, resolveDue, responseBreached, resolveBreached }) => {
  if (!responseDue && !resolveDue) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const responseBreachedFlag = !!responseBreached;
  const resolveBreachedFlag  = !!resolveBreached;
  const anyBreached = responseBreachedFlag || resolveBreachedFlag;

  const responseWarning = responseDue && !responseBreachedFlag && isPast(new Date(responseDue));
  const resolveWarning  = resolveDue  && !resolveBreachedFlag  && isPast(new Date(resolveDue));

  return (
    <div className="flex flex-col gap-0.5 min-w-[120px]">
      {responseDue && (
        <div className="flex items-center gap-1">
          <span className={clsx(
            'text-[10px] font-semibold uppercase tracking-wide w-8 flex-shrink-0',
            responseBreachedFlag ? 'text-red-400' : responseWarning ? 'text-orange-400' : 'text-slate-500'
          )}>Res</span>
          <span className={clsx(
            'text-xs',
            responseBreachedFlag ? 'text-red-400 font-semibold' : responseWarning ? 'text-orange-400' : 'text-slate-700'
          )}>
            {responseBreachedFlag
              ? 'Breached'
              : format(new Date(responseDue), 'MMM d, h:mm a')}
          </span>
        </div>
      )}
      {resolveDue && (
        <div className="flex items-center gap-1">
          <span className={clsx(
            'text-[10px] font-semibold uppercase tracking-wide w-8 flex-shrink-0',
            resolveBreachedFlag ? 'text-red-400' : resolveWarning ? 'text-orange-400' : 'text-slate-500'
          )}>Fix</span>
          <span className={clsx(
            'text-xs',
            resolveBreachedFlag ? 'text-red-400 font-semibold' : resolveWarning ? 'text-orange-400' : 'text-slate-700'
          )}>
            {resolveBreachedFlag
              ? 'Breached'
              : format(new Date(resolveDue), 'MMM d, h:mm a')}
          </span>
        </div>
      )}
      {anyBreached && (
        <span className="inline-flex items-center gap-1 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">SLA Breached</span>
        </span>
      )}
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const Row: React.FC<{ ticket: TicketDetail }> = ({ ticket }) => (
  <Link to={`/tickets/agent/${ticket.id}`} className="group block">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 hover:bg-blue-50/60 transition-colors">
      {/* Ticket # */}
      <div className="flex-shrink-0 w-28">
        <span className="text-xs font-mono text-slate-600">{ticket.ticket_number}</span>
      </div>

      {/* Issue */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium truncate group-hover:text-blue-700">
          {ticket.title ?? '(No title)'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}
        </p>
      </div>

      {/* Severity */}
      <div className="flex-shrink-0 flex items-center gap-1.5 w-20">
        {ticket.severity && <SeverityDot severity={ticket.severity} />}
        <span className="text-xs text-slate-600 capitalize">{ticket.severity ?? '—'}</span>
      </div>

      {/* Priority */}
      <div className="flex-shrink-0 w-10 text-center">
        {ticket.priority
          ? <PriorityLabel priority={ticket.priority} />
          : <span className="text-slate-400 text-xs">—</span>}
      </div>

      {/* Status */}
      <div className="flex-shrink-0 w-24"><StatusBadge status={ticket.status} /></div>

      {/* SLA */}
      <div className="flex-shrink-0 w-40">
        <SLACell
          responseDue={ticket.sla_response_due}
          resolveDue={ticket.sla_resolve_due}
          responseBreached={ticket.response_sla_breached_at}
          resolveBreached={ticket.sla_breached_at}
        />
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500">
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
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => { dispatch(fetchAgentAllTickets()); }, [dispatch]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? agentTickets : agentTickets.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          (t.title ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [agentTickets, filter, search]);

  const slaBreachedCount = agentTickets.filter(
    (t) => t.sla_breached_at || t.response_sla_breached_at
  ).length;

  return (
    <MainLayout navItems={agentNav} pageTitle="All My Tickets">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Assigned Tickets</h2>
            <p className="text-slate-500 text-sm mt-1">{agentTickets.length} total
              {slaBreachedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-400 font-semibold">
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
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket # or issue title…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header row */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-blue-50/50">
            <div className="flex-shrink-0 w-28 text-xs font-semibold text-blue-600 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-blue-600 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 w-20 text-xs font-semibold text-blue-600 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-blue-600 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 w-24 text-xs font-semibold text-blue-600 uppercase tracking-widest">Status</div>
            <div className="flex-shrink-0 w-40 text-xs font-semibold text-blue-600 uppercase tracking-widest">SLA Deadlines</div>
            <div className="w-4" />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-500 text-sm">
                {search ? `No tickets matching "${search}"` : 'No tickets found'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-500 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((t) => <Row key={t.id} ticket={t} />)
          )}
        </div>

        {/* Result count when searching */}
        {search && !isLoading && (
          <p className="text-xs text-slate-500 mt-3 px-1">
            Showing {filtered.length} of {agentTickets.length} tickets
          </p>
        )}
      </div>
    </MainLayout>
  );
};