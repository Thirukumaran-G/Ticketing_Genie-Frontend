// src/features/tickets/components/customer/MyTicketsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../../components/ui';
import { StatusBadge, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useMyTickets } from '../../hooks/useMyTickets';
import { customerNav } from './customerNav';
import { CustomerTicketListItem } from '../../types';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const TicketRow: React.FC<{ ticket: CustomerTicketListItem }> = ({ ticket }) => (
  <Link to={`/tickets/${ticket.id}`} className="group block">
    <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
      <div className="flex-shrink-0 w-36">
        <span className="text-xs font-mono text-zinc-500">{ticket.ticket_number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-white font-medium truncate group-hover:text-zinc-300">{ticket.title ?? '(No title)'}</p>
          {ticket.sla_response_due && !ticket.resolved_at && <SLABreachPill />}
        </div>
        <p className="text-xs text-zinc-600 mt-0.5">{format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}</p>
      </div>
      <div className="flex-shrink-0 w-12 text-center">
        {ticket.priority ? <PriorityLabel priority={ticket.priority} /> : <span className="text-zinc-700 text-xs">—</span>}
      </div>
      <div className="flex-shrink-0"><StatusBadge status={ticket.status} /></div>
      <div className="flex-shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </Link>
);

export const MyTicketsPage: React.FC = () => {
  // All business logic in the hook
  const { myTickets, filtered, isLoading, filter, setFilter } = useMyTickets();

  return (
    <MainLayout navItems={customerNav} pageTitle="My Tickets">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">My Tickets</h2>
            <p className="text-zinc-500 text-sm mt-1">{myTickets.length} total tickets</p>
          </div>
          <Link to="/tickets/new">
            <Button size="md">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Ticket
            </Button>
          </Link>
        </div>
        <div className="flex gap-1 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 w-fit">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                filter === tab.key ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-shrink-0 w-36 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 w-12 text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-4" />
          </div>
          {isLoading ? <PageLoader /> : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-sm">No tickets found</p>
              <Link to="/tickets/new" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Raise your first ticket</Button>
              </Link>
            </div>
          ) : filtered.map((t) => <TicketRow key={t.id} ticket={t} />)}
        </div>
      </div>
    </MainLayout>
  );
};
