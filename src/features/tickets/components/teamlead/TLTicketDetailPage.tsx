// src/features/tickets/components/teamlead/TLTicketDetailPage.tsx
// GET /teamlead/tickets/{ticket_id}
// POST /teamlead/tickets/{ticket_id}/assign
// PATCH /teamlead/tickets/{ticket_id}/status
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader, Select } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTicket, manualAssignThunk, fetchTeamOverview } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { teamleadNav } from './teamleadNav';
import { TICKET_STATUSES } from '../../../../config';

const MetaItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
    {children}
  </div>
);

const STATUS_OPTIONS = TICKET_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export const TLTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { tlTicketDetail, teamOverview, isLoading } = useAppSelector((s) => s.tickets);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTLTicket(ticketId));
      dispatch(fetchTeamOverview());
    }
  }, [ticketId, dispatch]);

  useEffect(() => {
    if (tlTicketDetail) setSelectedStatus(tlTicketDetail.status);
  }, [tlTicketDetail]);

  const onStatusUpdate = async () => {
    if (!ticketId || !tlTicketDetail || selectedStatus === tlTicketDetail.status) return;
    try {
      setUpdatingStatus(true);
      await ticketsService.updateTLStatus(ticketId, selectedStatus);
      toast.success('Status updated');
      dispatch(fetchTLTicket(ticketId));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onAssign = async () => {
    if (!ticketId || !selectedAgent) return;
    try {
      setAssigning(true);
      await dispatch(manualAssignThunk({ ticketId, agent_user_id: selectedAgent }));
      toast.success('Ticket assigned');
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (isLoading || !tlTicketDetail) {
    return (
      <MainLayout navItems={teamleadNav} pageTitle="Ticket Detail">
        <PageLoader />
      </MainLayout>
    );
  }

  const t = tlTicketDetail;
  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `Agent ${a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  return (
    <MainLayout navItems={teamleadNav} pageTitle={t.ticket_number}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back */}
        <Link to="/tickets/team" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Queue
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header card */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-xs font-mono text-zinc-500">{t.ticket_number}</span>
                <StatusBadge status={t.status} />
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
              </div>
              <h1 className="text-xl font-bold text-white mb-4">{t.title ?? '(No title)'}</h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-900">
                <MetaItem label="Severity">
                  {t.severity ? (
                    <span className="flex items-center gap-1.5">
                      <SeverityDot severity={t.severity} />
                      <span className="text-white text-sm capitalize">{t.severity}</span>
                    </span>
                  ) : <span className="text-zinc-600 text-sm">—</span>}
                </MetaItem>
                <MetaItem label="Priority">
                  {t.priority ? <PriorityLabel priority={t.priority} /> : <span className="text-zinc-600 text-sm">—</span>}
                </MetaItem>
                <MetaItem label="Environment">
                  <span className="text-white text-sm capitalize">{t.environment ?? '—'}</span>
                </MetaItem>
                <MetaItem label="Tier">
                  <span className="text-white text-sm">{t.tier_snapshot ?? '—'}</span>
                </MetaItem>
                <MetaItem label="Assigned Agent">
                  <span className="text-white text-sm">
                    {t.assigned_to ? `${t.assigned_to.slice(0, 8)}…` : 'Unassigned'}
                  </span>
                </MetaItem>
                <MetaItem label="Raised">
                  <span className="text-white text-sm">{format(new Date(t.created_at), 'MMM d, yyyy')}</span>
                </MetaItem>
              </div>

              {/* SLA */}
              {(t.sla_response_due || t.sla_resolve_due) && (
                <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4">
                  {t.sla_response_due && (
                    <MetaItem label="Response Due">
                      <span className={clsx('text-sm font-medium', t.response_sla_breached_at ? 'text-red-400' : 'text-white')}>
                        {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
                        {t.response_sla_breached_at && ' · Breached'}
                      </span>
                    </MetaItem>
                  )}
                  {t.sla_resolve_due && (
                    <MetaItem label="Resolution Due">
                      <span className={clsx('text-sm font-medium', t.sla_breached_at ? 'text-red-400' : 'text-white')}>
                        {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
                        {t.sla_breached_at && ' · Breached'}
                      </span>
                    </MetaItem>
                  )}
                </div>
              )}

              {/* Override notice */}
              {t.priority_overridden && t.override_reason && (
                <div className="mt-4 p-3 bg-yellow-950/30 border border-yellow-900 rounded-lg">
                  <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-1">Priority override</p>
                  <p className="text-sm text-yellow-300">{t.override_reason}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Description</h3>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {t.description ?? 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status update */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Update Status</h3>
              <Select
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              />
              <Button
                size="sm" full className="mt-3"
                loading={updatingStatus}
                disabled={selectedStatus === t.status}
                onClick={onStatusUpdate}
              >
                Apply
              </Button>
            </div>

            {/* Manual assign */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Reassign Agent</h3>
              <Select
                options={agentOptions}
                placeholder="Select agent…"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              />
              <Button
                size="sm" full className="mt-3" variant="secondary"
                loading={assigning}
                disabled={!selectedAgent}
                onClick={onAssign}
              >
                Assign
              </Button>
            </div>

            {/* Ticket meta */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Timeline</h3>
              {t.first_response_at && (
                <MetaItem label="First Response">
                  <span className="text-white text-sm">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span>
                </MetaItem>
              )}
              {t.resolved_at && (
                <MetaItem label="Resolved">
                  <span className="text-white text-sm">{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span>
                </MetaItem>
              )}
              <MetaItem label="Last Updated">
                <span className="text-white text-sm">{format(new Date(t.updated_at), 'MMM d, h:mm a')}</span>
              </MetaItem>
              <MetaItem label="Reopen Count">
                <span className="text-white text-sm">{t.reopen_count}</span>
              </MetaItem>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
