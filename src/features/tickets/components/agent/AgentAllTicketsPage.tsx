// src/features/tickets/components/agent/AgentAllTicketsPage.tsx
// Lists all tickets assigned to the agent: GET /agent/tickets
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchAgentAllTickets } from '../../slices/ticketsSlice';
import { agentNav } from './agentNav';
import { TicketDetail } from '../../../../types';

const STATUSES = ['all', 'open', 'in_progress', 'on_hold', 'resolved', 'closed'];

const Row: React.FC<{ ticket: TicketDetail }> = ({ ticket }) => (
  <Link to={`/tickets/agent/${ticket.id}`} className="group block">
    <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
      <div className="flex-shrink-0 w-32">
        <span className="text-xs font-mono text-zinc-500">{ticket.ticket_number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate group-hover:text-zinc-300">
          {ticket.title ?? '(No title)'}
        </p>
        <p className="text-xs text-zinc-600 mt-0.5">
          {format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {ticket.severity && <SeverityDot severity={ticket.severity} />}
        <span className="text-xs text-zinc-400 capitalize">{ticket.severity ?? '—'}</span>
      </div>
      <div className="flex-shrink-0 w-10 text-center">
        {ticket.priority ? <PriorityLabel priority={ticket.priority} /> : <span className="text-zinc-700 text-xs">—</span>}
      </div>
      <div className="flex-shrink-0"><StatusBadge status={ticket.status} /></div>
      <div className="flex-shrink-0 text-zinc-700 group-hover:text-zinc-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </Link>
);

export const AgentAllTicketsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { agentTickets, isLoading } = useAppSelector((s) => s.tickets);
  const [filter, setFilter] = useState('all');

  useEffect(() => { dispatch(fetchAgentAllTickets()); }, [dispatch]);

  const filtered = filter === 'all'
    ? agentTickets
    : agentTickets.filter((t) => t.status === filter);

  return (
    <MainLayout navItems={agentNav} pageTitle="All My Tickets">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">All Assigned Tickets</h2>
          <p className="text-zinc-500 text-sm mt-1">{agentTickets.length} total</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 w-fit flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === s ? 'bg-white text-black' : 'text-zinc-400 hover:text-white',
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-shrink-0 w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-4" />
          </div>
          {isLoading ? <PageLoader /> : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500 text-sm">No tickets found</p>
            </div>
          ) : (
            filtered.map((t) => <Row key={t.id} ticket={t} />)
          )}
        </div>
      </div>
    </MainLayout>
  );
};
