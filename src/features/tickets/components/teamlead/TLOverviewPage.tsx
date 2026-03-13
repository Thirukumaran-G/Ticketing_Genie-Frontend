// src/features/tickets/components/teamlead/TLOverviewPage.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../../components/ui/index';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTeamOverview } from '../../slices/ticketsSlice';
import { tlNav } from './teamleadNav';
import { AgentWorkloadItem } from '../../../../types';

// ── Workload bar ──────────────────────────────────────────────────────────────

const WorkloadBar: React.FC<{ open: number; max: number }> = ({ open, max }) => {
  const pct   = max > 0 ? Math.min((open / max) * 100, 100) : 0;
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-blue-100 rounded-full h-1.5">
        <div className={clsx('h-1.5 rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{open}</span>
    </div>
  );
};

// ── Status dot ────────────────────────────────────────────────────────────────

const StatusDot: React.FC<{ open: number; max: number }> = ({ open, max }) => {
  const pct = max > 0 ? (open / max) * 100 : 0;
  return (
    <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
      'bg-green-500':  pct < 40,
      'bg-yellow-500': pct >= 40 && pct < 60,
      'bg-orange-500': pct >= 60 && pct < 80,
      'bg-red-500':    pct >= 80,
    })} />
  );
};

// ── Agent card ────────────────────────────────────────────────────────────────

const AgentCard: React.FC<{ agent: AgentWorkloadItem; max: number }> = ({ agent, max }) => {
  const pct = max > 0 ? Math.min((agent.open_tickets / max) * 100, 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0 relative">
            <span className="text-sm font-bold text-blue-700">
              {agent.user_id.slice(0, 2).toUpperCase()}
            </span>
            <StatusDot open={agent.open_tickets} max={max} />
          </div>
          <div>
            <p className="text-slate-900 text-sm font-semibold">
              Agent {agent.user_id.slice(0, 8)}…
            </p>
            {agent.experience !== undefined && (
              <p className="text-slate-600 text-xs">
                {agent.experience} yr{agent.experience !== 1 ? 's' : ''} experience
              </p>
            )}
          </div>
        </div>
        <div className={clsx('text-lg font-bold',
          pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-orange-400' : 'text-slate-900',
        )}>
          {agent.open_tickets}
          <span className="text-xs text-slate-600 font-normal ml-1">open</span>
        </div>
      </div>

      <WorkloadBar open={agent.open_tickets} max={max} />

      {agent.skills && Object.keys(agent.skills).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.keys(agent.skills).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Quick link to tickets for this agent */}
      <Link
        to={`/tickets/team`}
        className="mt-3 flex items-center gap-1 text-xs text-slate-600 hover:text-slate-500 transition-colors"
      >
        View tickets
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLOverviewPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { teamOverview, isLoading } = useAppSelector((s) => s.tickets);

  useEffect(() => { dispatch(fetchTeamOverview()); }, [dispatch]);

  const agents      = teamOverview?.agents ?? [];
  const maxTickets  = Math.max(...agents.map((a) => a.open_tickets), 1);
  const totalOpen   = agents.reduce((sum, a) => sum + a.open_tickets, 0);
  const overloaded  = agents.filter(a => a.open_tickets > maxTickets * 0.8).length;

  return (
    <MainLayout navItems={tlNav} pageTitle="Team Overview">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Team Overview</h2>
            {teamOverview && (
              <p className="text-slate-600 text-sm mt-1">
                {teamOverview.team_name} · {agents.length} agents
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
                { label: 'Agents',      value: agents.length,                  color: 'text-slate-900' },
                { label: 'Unassigned',  value: teamOverview.unassigned_count,  color: teamOverview.unassigned_count > 0 ? 'text-orange-400' : 'text-slate-900' },
                { label: 'Total Open',  value: totalOpen,                       color: 'text-slate-900' },
                { label: 'Avg Load',    value: agents.length > 0 ? Math.round(totalOpen / agents.length) : 0, color: 'text-slate-900' },
                { label: 'Overloaded',  value: overloaded,                      color: overloaded > 0 ? 'text-red-400' : 'text-green-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold text-blue-600 mb-1">{label}</p>
                  <p className={clsx('text-3xl font-bold', color)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Unassigned alert banner */}
            {teamOverview.unassigned_count > 0 && (
              <div className="mb-5 flex items-center gap-3 bg-orange-950/30 border border-orange-900/50 rounded-xl px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                <p className="text-sm text-orange-300 flex-1">
                  <span className="font-semibold">{teamOverview.unassigned_count} unassigned ticket{teamOverview.unassigned_count !== 1 ? 's' : ''}</span>
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
                    <AgentCard key={agent.user_id} agent={agent} max={maxTickets} />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};