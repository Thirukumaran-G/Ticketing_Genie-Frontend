// src/features/tickets/components/agent/AgentGroupedTicketsListPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { StatusBadge, PriorityLabel } from '../shared/TicketBadges';
import { ticketsService } from '../../services/ticketsService';
import { agentNav } from './agentNav';

interface GroupedTicket {
  ticket_id:       string;
  ticket_number:   string;
  title:           string | null;
  status:          string;
  priority:        string | null;
  severity:        string | null;
  child_count:     number;
  created_at:      string;
  sla_resolve_due: string | null;
}

export const AgentGroupedTicketsListPage: React.FC = () => {
  const [tickets, setTickets] = useState<GroupedTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsService.getAgentGroupedTickets()
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout navItems={agentNav} pageTitle="Grouped Tickets">
      <div className="min-h-screen bg-[#f4f5f7]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#172b4d]">Grouped Tickets</h2>
            <p className="text-[#44546f] text-sm mt-1">
              Tickets where multiple customers reported the same issue.
              Resolve the parent to close all related tickets.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-16 text-center">
              <p className="text-[#44546f] text-sm">No grouped tickets assigned to you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <Link
                  key={t.ticket_id}
                  to={`/tickets/agent/grouped/${t.ticket_id}`}
                  className="block bg-white border border-amber-200 rounded-xl px-5 py-4 hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base">🔑</span>
                        <span className="text-xs font-mono text-[#44546f]">{t.ticket_number}</span>
                        {t.priority && <PriorityLabel priority={t.priority} />}
                        <StatusBadge status={t.status} />
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold text-amber-700 bg-amber-50 border-amber-200">
                          {t.child_count + 1} customers
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#172b4d] truncate">
                        {t.title ?? '(No title)'}
                      </p>
                      <p className="text-xs text-[#8993a4] mt-0.5">
                        Opened {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[#44546f] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};