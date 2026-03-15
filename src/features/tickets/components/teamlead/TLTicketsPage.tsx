// src/features/tickets/components/teamlead/TLTicketsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTickets, fetchTeamOverview } from '../../slices/ticketsSlice';
import { tlNav } from './teamleadNav';
import { TLTicketDetail } from '../../../../types';

const STATUSES = ['all', 'new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed'];

// ── Breach helpers ────────────────────────────────────────────────────────────

function isResponseBreached(t: TLTicketDetail): boolean {
  if (t.response_sla_breached_at) return true;
  if (
    t.sla_response_due &&
    !t.first_response_at &&
    isPast(new Date(t.sla_response_due))
  ) return true;
  return false;
}

function isResolutionBreached(t: TLTicketDetail): boolean {
  if (t.sla_breached_at) return true;
  if (
    t.sla_resolve_due &&
    !['resolved', 'closed'].includes(t.status) &&
    isPast(new Date(t.sla_resolve_due))
  ) return true;
  return false;
}

function isAnyBreached(t: TLTicketDetail): boolean {
  return isResponseBreached(t) || isResolutionBreached(t);
}

// ── Badges ────────────────────────────────────────────────────────────────────

const UnassignedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-950/60 border border-orange-900/50 text-orange-400">
    <span className="w-1 h-1 rounded-full bg-orange-400" />
    Unassigned
  </span>
);

const ResponseBreachBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-950/60 border border-red-900/50 text-red-400">
    <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
    Response SLA Breached
  </span>
);

// ── Stats bar ─────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ tickets: TLTicketDetail[] }> = ({ tickets }) => {
  const unassigned = tickets.filter(t => !t.assigned_to).length;
  const breached   = tickets.filter(t => isAnyBreached(t)).length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved   = tickets.filter(t => t.status === 'resolved').length;

  const stats = [
    { label: 'Total',       value: tickets.length, color: 'text-slate-900' },
    { label: 'Unassigned',  value: unassigned,      color: unassigned > 0 ? 'text-orange-400' : 'text-slate-900' },
    { label: 'SLA Breach',  value: breached,        color: breached > 0   ? 'text-red-400'    : 'text-slate-900' },
    { label: 'In Progress', value: inProgress,      color: 'text-blue-400' },
    { label: 'Resolved',    value: resolved,        color: 'text-green-400' },
  ];

  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
          <span className={clsx('text-lg font-bold', color)}>{value}</span>
          <span className="text-xs text-slate-600">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const Row: React.FC<{
  ticket:    TLTicketDetail;
  agentName: string | null;
}> = ({ ticket, agentName }) => {
  const respBreached  = isResponseBreached(ticket);
  const resolBreached = isResolutionBreached(ticket);
  const anyBreached   = respBreached || resolBreached;
  const isUnassigned  = !ticket.assigned_to;

  return (
    <Link to={`/tickets/teamlead/${ticket.id}`} className="group block">
      <div className={clsx(
        'flex items-center gap-4 px-6 py-4 border-b border-slate-100 hover:bg-blue-50/60 transition-colors',
        isUnassigned && 'bg-orange-950/10 hover:bg-orange-950/20',
        anyBreached && !isUnassigned && 'bg-red-950/5 hover:bg-red-950/10',
      )}>
        {/* Priority bar */}
        <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', {
          'bg-red-500':    ticket.priority === 'P0',
          'bg-orange-500': ticket.priority === 'P1',
          'bg-yellow-500': ticket.priority === 'P2',
          'bg-blue-500':   ticket.priority === 'P3',
          'bg-slate-300':  !ticket.priority,
        })} />

        {/* Ticket number */}
        <div className="flex-shrink-0 w-32">
          <span className="text-xs font-mono text-slate-600">{ticket.ticket_number}</span>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-slate-800 font-medium truncate group-hover:text-blue-700">
              {ticket.title ?? '(No title)'}
            </p>
            {resolBreached && <SLABreachPill />}
            {respBreached  && <ResponseBreachBadge />}
            {isUnassigned  && <UnassignedBadge />}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {isUnassigned
              ? <span className="text-orange-400/70">No agent assigned</span>
              : <span>{agentName ?? `${ticket.assigned_to!.slice(0, 8)}…`}</span>
            }
            {' · '}{format(new Date(ticket.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Severity */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {ticket.severity && <SeverityDot severity={ticket.severity} />}
          <span className="text-xs text-slate-600 capitalize">{ticket.severity ?? '—'}</span>
        </div>

        {/* Priority */}
        <div className="flex-shrink-0 w-10 text-center">
          {ticket.priority
            ? <PriorityLabel priority={ticket.priority} />
            : <span className="text-slate-600 text-xs">—</span>
          }
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusBadge status={ticket.status} />
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors">
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
  const { tlTickets, teamOverview, isLoading } = useAppSelector((s) => s.tickets);
  const [filter, setFilter]                 = useState('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchTLTickets(filter === 'all' ? undefined : filter));
    dispatch(fetchTeamOverview());
  }, [dispatch, filter]);

  // user_id → full_name lookup from teamOverview agents
  const agentNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of teamOverview?.agents ?? []) {
      if (a.full_name) map[String(a.user_id)] = a.full_name;
    }
    return map;
  }, [teamOverview]);

  const displayed = showUnassignedOnly
    ? tlTickets.filter(t => !t.assigned_to)
    : tlTickets;

  const unassignedCount     = tlTickets.filter(t => !t.assigned_to).length;
  const responseBreachCount = tlTickets.filter(t => isResponseBreached(t)).length;

  return (
    <MainLayout navItems={tlNav} pageTitle="All Team Tickets">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Team Tickets</h2>
            <p className="text-slate-600 text-sm mt-1">
              {tlTickets.length} tickets
              {unassignedCount > 0 && (
                <span className="ml-2 text-orange-400 font-medium">
                  · {unassignedCount} unassigned
                </span>
              )}
              {responseBreachCount > 0 && (
                <span className="ml-2 text-red-400 font-medium">
                  · {responseBreachCount} response SLA breached
                </span>
              )}
            </p>
          </div>

          {unassignedCount > 0 && (
            <button
              onClick={() => setShowUnassignedOnly(v => !v)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                showUnassignedOnly
                  ? 'bg-orange-950/40 border-orange-700 text-orange-300'
                  : 'bg-slate-50 border-slate-300 text-slate-500 hover:text-slate-900 hover:border-blue-300',
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full', showUnassignedOnly ? 'bg-orange-400 animate-pulse' : 'bg-slate-400')} />
              {showUnassignedOnly ? 'Showing unassigned only' : `Show unassigned (${unassignedCount})`}
            </button>
          )}
        </div>

        {/* Stats bar */}
        {!isLoading && tlTickets.length > 0 && <StatsBar tickets={tlTickets} />}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setShowUnassignedOnly(false); }}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-blue-50/50">
            <div className="w-1 flex-shrink-0" />
            <div className="flex-shrink-0 w-32 text-xs font-semibold text-blue-600 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-blue-600 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-blue-600 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest">Status</div>
            <div className="w-4" />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm">
                {showUnassignedOnly ? 'No unassigned tickets' : 'No tickets found'}
              </p>
            </div>
          ) : (
            displayed.map((t) => (
              <Row
                key={t.id}
                ticket={t}
                agentName={t.assigned_to ? (agentNameMap[String(t.assigned_to)] ?? null) : null}
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};