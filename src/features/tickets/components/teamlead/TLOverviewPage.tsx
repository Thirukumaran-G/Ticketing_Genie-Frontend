// src/features/tickets/components/teamlead/TLOverviewPage.tsx
// GET /teamlead/overview — returns TeamOverviewResponse with agent workloads
import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../../components/ui/index';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTeamOverview } from '../../slices/ticketsSlice';
import { teamleadNav } from './teamleadNav';
import { AgentWorkloadItem } from '../../../../types';

const WorkloadBar: React.FC<{ open: number; max: number }> = ({ open, max }) => {
  const pct = max > 0 ? Math.min((open / max) * 100, 100) : 0;
  const color =
    pct >= 80 ? 'bg-red-500'
    : pct >= 60 ? 'bg-orange-500'
    : pct >= 40 ? 'bg-yellow-500'
    : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
        <div className={clsx('h-1.5 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-8 text-right">{open}</span>
    </div>
  );
};

const AgentCard: React.FC<{ agent: AgentWorkloadItem; max: number }> = ({ agent, max }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-zinc-300">{agent.user_id.slice(0, 2).toUpperCase()}</span>
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Agent {agent.user_id.slice(0, 8)}…</p>
          {agent.experience !== undefined && (
            <p className="text-zinc-600 text-xs">Exp: {agent.experience}</p>
          )}
        </div>
      </div>
      <div className={clsx('text-lg font-bold',
        agent.open_tickets >= max * 0.8 ? 'text-red-400'
        : agent.open_tickets >= max * 0.6 ? 'text-orange-400'
        : 'text-white',
      )}>
        {agent.open_tickets}
        <span className="text-xs text-zinc-500 font-normal ml-1">open</span>
      </div>
    </div>
    <WorkloadBar open={agent.open_tickets} max={max} />
    {agent.skills && Object.keys(agent.skills).length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.keys(agent.skills).map((skill) => (
          <span key={skill} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
            {skill}
          </span>
        ))}
      </div>
    )}
  </div>
);

export const TLOverviewPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { teamOverview, isLoading } = useAppSelector((s) => s.tickets);

  useEffect(() => { dispatch(fetchTeamOverview()); }, [dispatch]);

  const agents = teamOverview?.agents ?? [];
  const maxTickets = Math.max(...agents.map((a) => a.open_tickets), 1);
  const totalOpen = agents.reduce((sum, a) => sum + a.open_tickets, 0);

  return (
    <MainLayout navItems={teamleadNav} pageTitle="Team Overview">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Overview</h2>
            {teamOverview && (
              <p className="text-zinc-500 text-sm mt-1">
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
          <div className="text-center py-20"><p className="text-zinc-500">No team data available</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Agents', value: agents.length },
                { label: 'Unassigned', value: teamOverview.unassigned_count },
                { label: 'Total Open', value: totalOpen },
                { label: 'Avg Load', value: agents.length > 0 ? Math.round(totalOpen / agents.length) : 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-3xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
            {agents.length === 0 ? (
              <div className="text-center py-16 bg-zinc-950 border border-zinc-800 rounded-xl">
                <p className="text-zinc-500 text-sm">No agents in this team</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.slice().sort((a, b) => b.open_tickets - a.open_tickets).map((agent) => (
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
