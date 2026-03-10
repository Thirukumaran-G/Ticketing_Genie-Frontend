// src/features/tickets/components/agent/AgentQueuePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../../components/ui';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAgentQueue } from '../../hooks/useAgentQueue';
import { agentNav } from './agentNav';
import { TicketQueueItem } from '../../types';

const QueueRow: React.FC<{ ticket: TicketQueueItem }> = ({ ticket }) => (
  <Link to={`/tickets/agent/${ticket.id}`} className="group block">
    <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
      <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', {
        'bg-red-500': ticket.priority === 'P0', 'bg-orange-500': ticket.priority === 'P1',
        'bg-yellow-500': ticket.priority === 'P2', 'bg-blue-500': ticket.priority === 'P3',
        'bg-zinc-700': !ticket.priority,
      })} />
      <div className="flex-shrink-0 w-32"><span className="text-xs font-mono text-zinc-500">{ticket.ticket_number}</span></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white font-medium truncate group-hover:text-zinc-300">{ticket.title ?? '(No title)'}</p>
          {ticket.sla_response_due && <SLABreachPill />}
        </div>
        <p className="text-xs text-zinc-600 mt-0.5">{format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {ticket.severity && <SeverityDot severity={ticket.severity} />}
        <span className="text-xs text-zinc-400 capitalize">{ticket.severity ?? '—'}</span>
      </div>
      <div className="flex-shrink-0 w-10 text-center">
        {ticket.priority ? <PriorityLabel priority={ticket.priority} /> : <span className="text-zinc-700">—</span>}
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

export const AgentQueuePage: React.FC = () => {
  // All business logic (SSE, dispatch, state) lives in the hook
  const { agentQueue, isLoading, sseStatus, refresh } = useAgentQueue();

  return (
    <MainLayout navItems={agentNav} pageTitle="My Queue">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Assigned Queue</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-zinc-500 text-sm">{agentQueue.length} tickets</p>
              <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', {
                'text-green-400': sseStatus === 'connected',
                'text-yellow-400': sseStatus === 'connecting',
                'text-red-400': sseStatus === 'error',
              })}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', {
                  'bg-green-400 animate-pulse': sseStatus === 'connected',
                  'bg-yellow-400': sseStatus === 'connecting',
                  'bg-red-400': sseStatus === 'error',
                })} />
                {sseStatus === 'connected' ? 'Live' : sseStatus === 'connecting' ? 'Connecting…' : 'Offline'}
              </span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={refresh}>↻ Refresh</Button>
        </div>
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
          {isLoading ? <PageLoader /> : agentQueue.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-sm">Queue is empty</p>
              <p className="text-zinc-700 text-xs mt-1">New tickets will appear here automatically</p>
            </div>
          ) : agentQueue.map((t) => <QueueRow key={t.id} ticket={t} />)}
        </div>
      </div>
    </MainLayout>
  );
};
