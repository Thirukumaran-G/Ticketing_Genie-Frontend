// src/features/tickets/components/teamlead/TLQueuePage.tsx
// GET /teamlead/queue  — unassigned tickets for TL's team
// SSE  GET /teamlead/queue/stream — real-time push
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader, Modal, Select } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLQueue, manualAssignThunk, fetchTeamOverview } from '../../slices/ticketsSlice';
import { teamleadNav } from './teamleadNav';
import { TicketQueueItem } from '../../../../types';
import { ENV } from '../../../../config';
import toast from 'react-hot-toast';

const QueueRow: React.FC<{
  ticket: TicketQueueItem;
  onAssign: (ticket: TicketQueueItem) => void;
}> = ({ ticket, onAssign }) => (
  <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
    <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', {
      'bg-red-500':    ticket.priority === 'P0',
      'bg-orange-500': ticket.priority === 'P1',
      'bg-yellow-500': ticket.priority === 'P2',
      'bg-blue-500':   ticket.priority === 'P3',
      'bg-zinc-700':   !ticket.priority,
    })} />

    <div className="flex-shrink-0 w-32">
      <Link
        to={`/tickets/teamlead/${ticket.id}`}
        className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
      >
        {ticket.ticket_number}
      </Link>
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/tickets/teamlead/${ticket.id}`}
          className="text-sm text-white font-medium truncate hover:text-zinc-300"
        >
          {ticket.title ?? '(No title)'}
        </Link>
        {ticket.sla_response_due && <SLABreachPill />}
      </div>
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

    <div className="flex-shrink-0">
      <StatusBadge status={ticket.status} />
    </div>

    <div className="flex-shrink-0">
      <Button size="sm" variant="secondary" onClick={() => onAssign(ticket)}>
        Assign
      </Button>
    </div>
  </div>
);

export const TLQueuePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tlQueue, teamOverview, isLoading } = useAppSelector((s) => s.tickets);
  const { accessToken } = useAppSelector((s) => s.auth);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const sseRef = useRef<EventSource | null>(null);

  // Assign modal state
  const [assignModal, setAssignModal] = useState(false);
  const [assignTicket, setAssignTicket] = useState<TicketQueueItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    dispatch(fetchTLQueue());
    dispatch(fetchTeamOverview());
  }, [dispatch]);

  // SSE: /teamlead/queue/stream
  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(
      `${ENV.TICKET_BASE}/teamlead/queue/stream?token=${accessToken}`,
      { withCredentials: true },
    );
    sseRef.current = es;
    es.addEventListener('queue_update', () => { dispatch(fetchTLQueue()); });
    es.onopen = () => setSseStatus('connected');
    es.onerror = () => setSseStatus('error');
    return () => { es.close(); };
  }, [accessToken, dispatch]);

  const openAssign = (ticket: TicketQueueItem) => {
    setAssignTicket(ticket);
    setSelectedAgent('');
    setAssignModal(true);
  };

  const doAssign = async () => {
    if (!assignTicket || !selectedAgent) return;
    try {
      setAssigning(true);
      await dispatch(manualAssignThunk({ ticketId: assignTicket.id, agent_user_id: selectedAgent }));
      toast.success('Ticket assigned');
      setAssignModal(false);
      dispatch(fetchTLQueue());
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // Build agent options from teamOverview
  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `Agent ${a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  return (
    <MainLayout navItems={teamleadNav} pageTitle="Team Queue">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Unassigned Queue</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-zinc-500 text-sm">{tlQueue.length} waiting</p>
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
          <Button size="sm" variant="secondary" onClick={() => dispatch(fetchTLQueue())}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="w-1 flex-shrink-0" />
            <div className="flex-shrink-0 w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="flex-shrink-0 w-16" />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : tlQueue.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-10 h-10 text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-zinc-500 text-sm">No unassigned tickets</p>
            </div>
          ) : (
            tlQueue.map((t) => <QueueRow key={t.id} ticket={t} onAssign={openAssign} />)
          )}
        </div>
      </div>

      {/* Manual assign modal */}
      <Modal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        title="Assign Ticket"
      >
        {assignTicket && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 font-mono">{assignTicket.ticket_number}</p>
              <p className="text-white text-sm font-medium mt-1">{assignTicket.title ?? '(No title)'}</p>
            </div>
            <Select
              label="Select Agent"
              options={agentOptions}
              placeholder="Choose an agent…"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setAssignModal(false)} size="md">
                Cancel
              </Button>
              <Button
                onClick={doAssign}
                loading={assigning}
                disabled={!selectedAgent}
                full
                size="md"
              >
                Assign Ticket
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};
