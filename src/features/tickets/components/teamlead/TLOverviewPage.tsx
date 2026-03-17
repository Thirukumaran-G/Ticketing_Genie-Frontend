import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../../components/ui/index';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTeamOverview } from '../../slices/ticketsSlice';
import { tlNav } from './teamleadNav';
import { AgentWorkloadItem, TLTicketDetail } from '../../../../types';
import { ticketsService } from '../../services/ticketsService';
import { StatusBadge, PriorityLabel } from '../shared/TicketBadges';

// ── Workload bar ──────────────────────────────────────────────────────────────

const WorkloadBar: React.FC<{ open: number; max: number }> = ({ open, max }) => {
  const pct   = max > 0 ? Math.min((open / max) * 100, 100) : 0;
  const color =
    pct >= 80 ? 'bg-red-500' :
    pct >= 60 ? 'bg-orange-500' :
    pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-blue-100 rounded-full h-1.5">
        <div
          className={clsx('h-1.5 rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{open}</span>
    </div>
  );
};

// ── Agent card ────────────────────────────────────────────────────────────────

const AgentCard: React.FC<{
  agent:          AgentWorkloadItem;
  max:            number;
  onViewTickets:  () => void;
}> = ({ agent, max, onViewTickets }) => {
  const pct         = max > 0 ? Math.min((agent.open_tickets / max) * 100, 100) : 0;
  const displayName = agent.full_name || `Agent ${String(agent.user_id).slice(0, 8)}`;
  const initials    = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-700">{initials}</span>
          </div>
          <div>
            <p className="text-slate-900 text-sm font-semibold">{displayName}</p>
            {agent.experience !== undefined && agent.experience !== null && (
              <p className="text-slate-600 text-xs">
                {agent.experience} yr{agent.experience !== 1 ? 's' : ''} experience
              </p>
            )}
          </div>
        </div>
        <div className={clsx(
          'text-lg font-bold',
          pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-orange-400' : 'text-slate-900',
        )}>
          {agent.open_tickets}
          <span className="text-xs text-slate-600 font-normal ml-1">open</span>
        </div>
      </div>

      <WorkloadBar open={agent.open_tickets} max={max} />

      {agent.skills && (agent.skills as any).skill_text && (
          <div className="mt-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Skill
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {(agent.skills as any).skill_text}
            </p>
          </div>
        )}

      <button
        onClick={onViewTickets}
        className="mt-3 flex items-center gap-1 text-xs text-[#0052cc] hover:underline transition-colors"
      >
        View open tickets
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

// ── Agent tickets modal ───────────────────────────────────────────────────────

const AgentTicketsModal: React.FC<{
  agentName: string;
  tickets:   TLTicketDetail[];
  loading:   boolean;
  onClose:   () => void;
}> = ({ agentName, tickets, loading, onClose }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-slate-900 text-sm font-semibold">{agentName}</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {loading ? 'Loading…' : `${tickets.length} open ticket${tickets.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-500 text-sm">No open tickets assigned to this agent.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/teamlead/${t.id}`}
                  onClick={onClose}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-blue-50/50 transition-colors group"
                >
                  {/* Priority bar */}
                  <div className={clsx('w-1 h-8 rounded-full flex-shrink-0', {
                    'bg-red-500':    t.priority === 'P0',
                    'bg-orange-500': t.priority === 'P1',
                    'bg-yellow-500': t.priority === 'P2',
                    'bg-blue-500':   t.priority === 'P3',
                    'bg-slate-300':  !t.priority,
                  })} />

                  <div className="flex-shrink-0 w-28">
                    <span className="text-xs font-mono text-slate-500">{t.ticket_number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium truncate group-hover:text-blue-700">
                      {t.title ?? '(No title)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.priority && <PriorityLabel priority={t.priority} />}
                    <StatusBadge status={t.status} />
                  </div>

                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLOverviewPage: React.FC = () => {
  const dispatch    = useAppDispatch();
  const { teamOverview, isLoading } = useAppSelector((s) => s.tickets);

  const [selectedAgentId, setSelectedAgentId]         = useState<string | null>(null);
  const [agentTickets, setAgentTickets]               = useState<TLTicketDetail[]>([]);
  const [agentTicketsLoading, setAgentTicketsLoading] = useState(false);

  useEffect(() => { dispatch(fetchTeamOverview()); }, [dispatch]);

  const agents     = teamOverview?.agents ?? [];
  const maxTickets = Math.max(...agents.map((a) => a.open_tickets), 1);
  const totalOpen  = agents.reduce((sum, a) => sum + a.open_tickets, 0);
  const overloaded = agents.filter((a) => a.open_tickets > maxTickets * 0.8).length;

  const openAgentModal = async (agentUserId: string) => {
    setSelectedAgentId(agentUserId);
    setAgentTicketsLoading(true);
    try {
      const all = await ticketsService.getTLTickets();
      // Filter to tickets assigned to this agent, excluding resolved/closed
      setAgentTickets(
        all.filter(
          (t: TLTicketDetail) =>
            String(t.assigned_to) === agentUserId &&
            !['resolved', 'closed'].includes(t.status)
        )
      );
    } catch {
      toast.error('Failed to load agent tickets');
    } finally {
      setAgentTicketsLoading(false);
    }
  };

  const selectedAgentInfo = agents.find((a) => String(a.user_id) === selectedAgentId);
  const selectedAgentName = selectedAgentInfo?.full_name
    || (selectedAgentId ? `Agent ${selectedAgentId.slice(0, 8)}` : '');

  return (
    <MainLayout navItems={tlNav} pageTitle="Team Overview">

      {/* Agent tickets modal */}
      {selectedAgentId && (
        <AgentTicketsModal
          agentName={selectedAgentName}
          tickets={agentTickets}
          loading={agentTicketsLoading}
          onClose={() => { setSelectedAgentId(null); setAgentTickets([]); }}
        />
      )}

      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Team Overview</h2>
            {teamOverview && (
              <p className="text-slate-600 text-sm mt-1">
                {teamOverview.team_name} · {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => dispatch(fetchTeamOverview())}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {isLoading ? <PageLoader /> : !teamOverview ? (
          <div className="text-center py-20">
            <p className="text-slate-500">No team data available</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Agents',     value: agents.length,               color: 'text-slate-900' },
                { label: 'Unassigned', value: teamOverview.unassigned_count, color: teamOverview.unassigned_count > 0 ? 'text-orange-400' : 'text-slate-900' },
                { label: 'Total Open', value: totalOpen,                    color: 'text-slate-900' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-blue-600 uppercase tracking-widest font-semibold mb-1">{label}</p>
                  <p className={clsx('text-3xl font-bold', color)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Unassigned alert */}
            {teamOverview.unassigned_count > 0 && (
              <div className="mb-5 flex items-center gap-3 bg-orange-950/30 border border-orange-900/50 rounded-xl px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                <p className="text-sm text-orange-300 flex-1">
                  <span className="font-semibold">
                    {teamOverview.unassigned_count} unassigned ticket{teamOverview.unassigned_count !== 1 ? 's' : ''}
                  </span>
                  {' '}waiting in the queue — assign them to balance workload.
                </p>
                <Link
                  to="/tickets/queue"
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  Go to queue
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Agent cards */}
            {agents.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
                <p className="text-slate-500 text-sm">No agents in this team</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents
                  .slice()
                  .sort((a, b) => b.open_tickets - a.open_tickets)
                  .map((agent) => (
                    <AgentCard
                      key={String(agent.user_id)}
                      agent={agent}
                      max={maxTickets}
                      onViewTickets={() => openAgentModal(String(agent.user_id))}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};