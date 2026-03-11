// src/features/tickets/components/teamlead/TLTicketsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTickets } from '../../slices/ticketsSlice';
import { tlNav } from './teamleadNav';
import { TLTicketDetail } from '../../../../types';

const STATUSES = ['all', 'new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed'];

// ── Unassigned highlight badge ────────────────────────────────────────────────

const UnassignedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-950/60 border border-orange-900/50 text-orange-400">
    <span className="w-1 h-1 rounded-full bg-orange-400" />
    Unassigned
  </span>
);

// ── Stats bar ─────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ tickets: TLTicketDetail[] }> = ({ tickets }) => {
  const unassigned  = tickets.filter(t => !t.assigned_to).length;
  const breached    = tickets.filter(t => t.sla_breached_at || t.response_sla_breached_at).length;
  const inProgress  = tickets.filter(t => t.status === 'in_progress').length;
  const resolved    = tickets.filter(t => t.status === 'resolved').length;

  const stats = [
    { label: 'Total',       value: tickets.length,  color: 'text-white' },
    { label: 'Unassigned',  value: unassigned,       color: unassigned > 0 ? 'text-orange-400' : 'text-white' },
    { label: 'SLA Breach',  value: breached,         color: breached > 0  ? 'text-red-400'    : 'text-white' },
    { label: 'In Progress', value: inProgress,       color: 'text-blue-400' },
    { label: 'Resolved',    value: resolved,         color: 'text-green-400' },
  ];

  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
          <span className={clsx('text-lg font-bold', color)}>{value}</span>
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const Row: React.FC<{ ticket: TLTicketDetail }> = ({ ticket }) => {
  const breached    = !!(ticket.sla_breached_at || ticket.response_sla_breached_at);
  const isUnassigned = !ticket.assigned_to;

  return (
    <Link to={`/tickets/teamlead/${ticket.id}`} className="group block">
      <div className={clsx(
        'flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors',
        isUnassigned && 'bg-orange-950/10 hover:bg-orange-950/20',
      )}>
        {/* Priority bar */}
        <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', {
          'bg-red-500':    ticket.priority === 'P0',
          'bg-orange-500': ticket.priority === 'P1',
          'bg-yellow-500': ticket.priority === 'P2',
          'bg-blue-500':   ticket.priority === 'P3',
          'bg-zinc-700':   !ticket.priority,
        })} />

        {/* Ticket number */}
        <div className="flex-shrink-0 w-32">
          <span className="text-xs font-mono text-zinc-500">{ticket.ticket_number}</span>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-white font-medium truncate group-hover:text-zinc-300">
              {ticket.title ?? '(No title)'}
            </p>
            {breached && <SLABreachPill />}
            {isUnassigned && <UnassignedBadge />}
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">
            {isUnassigned
              ? <span className="text-orange-400/70">No agent assigned</span>
              : `Agent: ${ticket.assigned_to!.slice(0, 8)}…`
            }
            {' · '}{format(new Date(ticket.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Severity */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {ticket.severity && <SeverityDot severity={ticket.severity} />}
          <span className="text-xs text-zinc-400 capitalize">{ticket.severity ?? '—'}</span>
        </div>

        {/* Priority */}
        <div className="flex-shrink-0 w-10 text-center">
          {ticket.priority
            ? <PriorityLabel priority={ticket.priority} />
            : <span className="text-zinc-700 text-xs">—</span>
          }
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusBadge status={ticket.status} />
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLTicketsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tlTickets, isLoading } = useAppSelector((s) => s.tickets);
  const [filter, setFilter]      = useState('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchTLTickets(filter === 'all' ? undefined : filter));
  }, [dispatch, filter]);

  const displayed = showUnassignedOnly
    ? tlTickets.filter(t => !t.assigned_to)
    : tlTickets;

  const unassignedCount = tlTickets.filter(t => !t.assigned_to).length;

  return (
    <MainLayout navItems={tlNav} pageTitle="All Team Tickets">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Tickets</h2>
            <p className="text-zinc-500 text-sm mt-1">
              {tlTickets.length} tickets
              {unassignedCount > 0 && (
                <span className="ml-2 text-orange-400 font-medium">
                  · {unassignedCount} unassigned
                </span>
              )}
            </p>
          </div>

          {/* Unassigned toggle */}
          {unassignedCount > 0 && (
            <button
              onClick={() => setShowUnassignedOnly(v => !v)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                showUnassignedOnly
                  ? 'bg-orange-950/40 border-orange-700 text-orange-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500',
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full', showUnassignedOnly ? 'bg-orange-400 animate-pulse' : 'bg-zinc-600')} />
              {showUnassignedOnly ? 'Showing unassigned only' : `Show unassigned (${unassignedCount})`}
            </button>
          )}
        </div>

        {/* Stats bar */}
        {!isLoading && tlTickets.length > 0 && <StatsBar tickets={tlTickets} />}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 w-fit flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setShowUnassignedOnly(false); }}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === s ? 'bg-white text-black' : 'text-zinc-400 hover:text-white',
              )}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="w-1 flex-shrink-0" />
            <div className="flex-shrink-0 w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-4" />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500 text-sm">
                {showUnassignedOnly ? 'No unassigned tickets' : 'No tickets found'}
              </p>
            </div>
          ) : (
            displayed.map((t) => <Row key={t.id} ticket={t} />)
          )}
        </div>
      </div>
    </MainLayout>
  );
};