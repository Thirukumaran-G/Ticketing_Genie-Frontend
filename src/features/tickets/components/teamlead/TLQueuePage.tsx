// src/features/tickets/components/teamlead/TLQueuePage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader, Modal, Select } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLQueue, manualAssignThunk, fetchTeamOverview } from '../../slices/ticketsSlice';
import { tlNav } from './teamleadNav';
import { TicketQueueItem } from '../../../../types';
import { ENV } from '../../../../config';
import toast from 'react-hot-toast';

// ── Unassign reason badge ─────────────────────────────────────────────────────

const UnassignReasonBadge: React.FC<{ reason?: string; justification?: string }> = ({
  reason,
  justification,
}) => {
  if (reason !== 'agent_unassigned') return null;
  return (
    <div className="mt-1 flex items-start gap-1.5">
      <span className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
      <p className="text-xs text-orange-400 leading-snug">
        Agent unassigned
        {justification ? ` — "${justification.slice(0, 60)}${justification.length > 60 ? '…' : ''}"` : ''}
      </p>
    </div>
  );
};

// ── Queue Row ─────────────────────────────────────────────────────────────────

const QueueRow: React.FC<{
  ticket: TicketQueueItem & { _unassign_reason?: string; _justification?: string };
  onAssign: (ticket: TicketQueueItem) => void;
}> = ({ ticket, onAssign }) => (
  <div className="flex items-center gap-4 px-6 py-4 border-b border-blue-100 hover:bg-slate-50/30 transition-colors">
    <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', {
      'bg-red-500':    ticket.priority === 'P0',
      'bg-orange-500': ticket.priority === 'P1',
      'bg-yellow-500': ticket.priority === 'P2',
      'bg-blue-500':   ticket.priority === 'P3',
      'bg-slate-300':   !ticket.priority,
    })} />

    <div className="flex-shrink-0 w-32">
      <Link
        to={`/tickets/teamlead/${ticket.id}`}
        className="text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors"
      >
        {ticket.ticket_number}
      </Link>
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/tickets/teamlead/${ticket.id}`}
          className="text-sm text-slate-800 font-medium truncate hover:text-slate-600"
        >
          {ticket.title ?? '(No title)'}
        </Link>
        {ticket.sla_response_due && <SLABreachPill />}
      </div>
      <p className="text-xs text-slate-600 mt-0.5">
        {format(new Date(ticket.created_at), 'MMM d, yyyy · h:mm a')}
      </p>
      {/* Show unassign reason if ticket was returned by agent */}
      <UnassignReasonBadge
        reason={(ticket as any)._unassign_reason}
        justification={(ticket as any)._justification}
      />
    </div>

    <div className="flex-shrink-0 flex items-center gap-1.5">
      {ticket.severity && <SeverityDot severity={ticket.severity} />}
      <span className="text-xs text-slate-600 capitalize">{ticket.severity ?? '—'}</span>
    </div>

    <div className="flex-shrink-0 w-10 text-center">
      {ticket.priority
        ? <PriorityLabel priority={ticket.priority} />
        : <span className="text-slate-600 text-xs">—</span>
      }
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

// ── New ticket flash notification ─────────────────────────────────────────────

const NewTicketToast: React.FC<{ count: number; onView: () => void }> = ({ count, onView }) => (
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-900">
        {count === 1 ? 'New unassigned ticket' : `${count} new unassigned tickets`}
      </p>
      <p className="text-xs text-slate-600">returned to your queue</p>
    </div>
    <button
      onClick={onView}
      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex-shrink-0"
    >
      View
    </button>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLQueuePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tlQueue, teamOverview, isLoading } = useAppSelector((s) => s.tickets);
  const { accessToken } = useAppSelector((s) => s.auth);

  const [sseStatus, setSseStatus]   = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [newCount, setNewCount]     = useState(0);
  const sseRef                      = useRef<EventSource | null>(null);

  // Assign modal state
  const [assignModal, setAssignModal]     = useState(false);
  const [assignTicket, setAssignTicket]   = useState<TicketQueueItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning]         = useState(false);

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

    es.addEventListener('queue_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        // Refresh queue
        dispatch(fetchTLQueue());

        // Show specific toast if an agent unassigned
        if (data.reason === 'agent_unassigned') {
          setNewCount(prev => prev + 1);
          toast.custom(
            (t) => (
              <div className={clsx(
                'bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 shadow-2xl max-w-sm transition-all',
                t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              )}>
                <NewTicketToast
                  count={1}
                  onView={() => {
                    setNewCount(0);
                    toast.dismiss(t.id);
                  }}
                />
              </div>
            ),
            { duration: 6000 }
          );
        }
      } catch { /* ignore parse errors */ }
    });

    es.onopen  = () => setSseStatus('connected');
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
      setNewCount(prev => Math.max(0, prev - 1));
      dispatch(fetchTLQueue());
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `Agent ${a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  return (
    <MainLayout navItems={tlNav} pageTitle="Team Queue">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Unassigned Queue</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-sm">
                {tlQueue.length} waiting
                {newCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-orange-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    {newCount} new
                  </span>
                )}
              </p>
              <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', {
                'text-green-400':  sseStatus === 'connected',
                'text-yellow-400': sseStatus === 'connecting',
                'text-red-400':    sseStatus === 'error',
              })}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', {
                  'bg-green-400 animate-pulse': sseStatus === 'connected',
                  'bg-yellow-400':              sseStatus === 'connecting',
                  'bg-red-400':                 sseStatus === 'error',
                })} />
                {sseStatus === 'connected' ? 'Live' : sseStatus === 'connecting' ? 'Connecting…' : 'Offline'}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { dispatch(fetchTLQueue()); setNewCount(0); }}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Agent workload summary strip */}
        {(teamOverview?.agents ?? []).length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(teamOverview?.agents ?? [])
              .slice()
              .sort((a, b) => a.open_tickets - b.open_tickets)
              .map((agent) => (
                <div
                  key={agent.user_id}
                  className="flex-shrink-0 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
                    'bg-green-500':  agent.open_tickets <= 3,
                    'bg-yellow-500': agent.open_tickets > 3 && agent.open_tickets <= 7,
                    'bg-red-500':    agent.open_tickets > 7,
                  })} />
                  <span className="text-xs text-slate-600 font-mono">
                    {agent.user_id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-slate-600">
                    {agent.open_tickets} open
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Queue table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-blue-50/50">
            <div className="w-1 flex-shrink-0" />
            <div className="flex-shrink-0 w-32 text-xs font-semibold text-blue-600 uppercase tracking-widest">Ticket #</div>
            <div className="flex-1 text-xs font-semibold text-blue-600 uppercase tracking-widest">Issue</div>
            <div className="flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest">Severity</div>
            <div className="flex-shrink-0 w-10 text-center text-xs font-semibold text-blue-600 uppercase tracking-widest">Pri</div>
            <div className="flex-shrink-0 text-xs font-semibold text-blue-600 uppercase tracking-widest">Status</div>
            <div className="flex-shrink-0 w-16" />
          </div>

          {isLoading ? (
            <PageLoader />
          ) : tlQueue.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-10 h-10 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500 text-sm">No unassigned tickets</p>
              <p className="text-slate-600 text-xs mt-1">New tickets will appear here automatically</p>
            </div>
          ) : (
            tlQueue.map((t) => (
              <QueueRow key={t.id} ticket={t} onAssign={openAssign} />
            ))
          )}
        </div>
      </div>

      {/* Manual assign modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Ticket">
        {assignTicket && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-600 font-mono">{assignTicket.ticket_number}</p>
              <p className="text-slate-900 text-sm font-medium mt-1">{assignTicket.title ?? '(No title)'}</p>
              <div className="flex items-center gap-2 mt-2">
                {assignTicket.severity && (
                  <span className="text-xs text-slate-600 capitalize">{assignTicket.severity}</span>
                )}
                {assignTicket.priority && (
                  <PriorityLabel priority={assignTicket.priority} />
                )}
              </div>
            </div>
            <Select
              label="Select Agent"
              options={agentOptions}
              placeholder="Choose an agent…"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            />
            <p className="text-xs text-slate-600">
              Agents sorted by current workload — choose the one with fewest open tickets for best balance.
            </p>
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