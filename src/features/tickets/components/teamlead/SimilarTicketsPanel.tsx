// src/features/tickets/components/teamlead/SimilarTicketsPanel.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { StatusBadge, PriorityLabel, SeverityDot } from '../shared/TicketBadges';
import { ticketsService } from '../../services/ticketsService';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GroupMember {
  ticket_id:        string;
  ticket_number:    string;
  title:            string | null;
  status:           string;
  priority:         string | null;
  severity:         string | null;
  similarity_score: number;
  added_at:         string;
}

interface TicketGroup {
  id:                string;
  name:              string | null;
  confirmed_by_lead: boolean;
  confirmed_at:      string | null;
  member_count:      number;
  members:           GroupMember[];
  created_at:        string;
}

// ── Similarity badge ──────────────────────────────────────────────────────────

const SimilarityBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct   = Math.round(score * 100);
  const color =
    pct >= 90 ? 'bg-red-50 text-red-700 border-red-200' :
    pct >= 80 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold flex-shrink-0',
      color,
    )}>
      {pct}%
    </span>
  );
};

// ── Confirm group modal ───────────────────────────────────────────────────────

const ConfirmInlineModal: React.FC<{
  groupId:   string;
  members:   GroupMember[];
  onConfirm: (name: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ groupId, members, onConfirm, onClose, loading }) => {
  const [name, setName] = useState('');

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
      <div className="w-full max-w-sm bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-[#172b4d] text-sm font-semibold">Confirm similar group</h3>
          <p className="text-[#6b778c] text-xs mt-0.5">
            {members.length} ticket{members.length !== 1 ? 's' : ''} share the same root cause
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-[#42526e] leading-relaxed">
            Confirming unlocks bulk assign and bulk resolve on the Ticket Groups page.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional group name e.g. Login outage — Jan 25"
            autoFocus
            className="w-full h-8 px-3 rounded border border-[#dfe1e6] text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-[#fafbfc] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
          />
        </div>
        <div className="px-5 py-3 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-7 px-3 rounded text-xs text-[#42526e] hover:bg-[#ebecf0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name)}
            disabled={loading}
            className="h-7 px-3 rounded bg-[#0052cc] text-white text-xs font-medium hover:bg-[#0065ff] disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {loading && (
              <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
            )}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  ticketId: string;
}

export const SimilarTicketsPanel: React.FC<Props> = ({ ticketId }) => {
  const [groups, setGroups]               = useState<TicketGroup[]>([]);
  const [loading, setLoading]             = useState(true);
  const [confirmGroup, setConfirmGroup]   = useState<TicketGroup | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [removingTicket, setRemovingTicket] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsService.getGroupsForTicket(ticketId);
      setGroups(data);
    } catch {
      // Non-critical — panel just stays empty
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const onConfirmGroup = async (name: string) => {
    if (!confirmGroup) return;
    try {
      setConfirmLoading(true);
      await ticketsService.confirmTicketGroup(confirmGroup.id, name || undefined);
      toast.success('Group confirmed — bulk actions now available');
      setConfirmGroup(null);
      await loadGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to confirm group');
    } finally {
      setConfirmLoading(false);
    }
  };

  const onRemoveFromGroup = async (groupId: string, removeTicketId: string, ticketNumber: string) => {
    try {
      setRemovingTicket(removeTicketId);
      await ticketsService.removeTicketFromGroup(groupId, removeTicketId);
      toast.success(`${ticketNumber} removed from group`);
      await loadGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to remove from group');
    } finally {
      setRemovingTicket(null);
    }
  };

  // Don't render panel at all if no groups and not loading
  if (!loading && groups.length === 0) return null;

  // Filter out current ticket from member list for display
  const otherMembers = (group: TicketGroup) =>
    group.members.filter((m) => m.ticket_id !== ticketId);

  return (
    <>
      {confirmGroup && (
        <ConfirmInlineModal
          groupId={confirmGroup.id}
          members={confirmGroup.members}
          onConfirm={onConfirmGroup}
          onClose={() => setConfirmGroup(null)}
          loading={confirmLoading}
        />
      )}

      <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest">
              Similar Tickets
            </p>
          </div>
          <Link
            to="/tickets/groups"
            className="text-xs text-[#0052cc] hover:underline flex items-center gap-1"
          >
            View all groups
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-[#8993a4]">
            <div className="w-3.5 h-3.5 border border-[#8993a4] border-t-transparent rounded-full animate-spin" />
            Scanning for similar tickets…
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const others       = otherMembers(group);
              const openCount    = others.filter(
                (m) => !['resolved', 'closed'].includes(m.status)
              ).length;

              return (
                <div key={group.id} className="space-y-2">

                  {/* Group meta row */}
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                      group.confirmed_by_lead
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : 'text-orange-600 bg-orange-50 border-orange-200',
                    )}>
                      {group.confirmed_by_lead ? '✓ Confirmed' : 'Unconfirmed'}
                    </span>
                    {group.name && (
                      <span className="text-xs text-[#172b4d] font-medium truncate">
                        {group.name}
                      </span>
                    )}
                    {openCount > 0 && (
                      <span className="text-[10px] text-orange-500 ml-auto flex-shrink-0">
                        {openCount} open
                      </span>
                    )}
                    {!group.confirmed_by_lead && (
                      <button
                        onClick={() => setConfirmGroup(group)}
                        className="ml-auto flex-shrink-0 h-6 px-2 rounded border border-[#dfe1e6] text-[10px] text-[#42526e] hover:bg-[#f4f5f7] hover:border-[#b3bac5] transition-colors font-medium"
                      >
                        Confirm group
                      </button>
                    )}
                    {group.confirmed_by_lead && (
                      <Link
                        to="/tickets/groups"
                        className="ml-auto flex-shrink-0 h-6 px-2 rounded border border-[#0052cc] text-[10px] text-[#0052cc] hover:bg-[#deebff] transition-colors font-medium flex items-center"
                      >
                        Bulk actions
                      </Link>
                    )}
                  </div>

                  {/* Similar ticket rows */}
                  {others.length === 0 ? (
                    <p className="text-xs text-[#8993a4] pl-2">
                      No other tickets in this group yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {others.map((m) => (
                        <div
                          key={m.ticket_id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded border border-[#ebecf0] bg-[#fafbfc] hover:border-[#dfe1e6] hover:bg-white transition-all group"
                        >
                          {/* Similarity bar */}
                          <div className="flex-shrink-0 w-1 h-8 rounded-full overflow-hidden bg-[#ebecf0]">
                            <div
                              className={clsx(
                                'w-full rounded-full transition-all',
                                m.similarity_score >= 0.9 ? 'bg-red-400' :
                                m.similarity_score >= 0.8 ? 'bg-orange-400' : 'bg-blue-400',
                              )}
                              style={{ height: `${Math.round(m.similarity_score * 100)}%` }}
                            />
                          </div>

                          {/* Ticket info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/tickets/teamlead/${m.ticket_id}`}
                                className="text-xs font-mono text-[#0052cc] hover:underline flex-shrink-0"
                              >
                                {m.ticket_number}
                              </Link>
                              <SimilarityBadge score={m.similarity_score} />
                              <StatusBadge status={m.status} />
                              {m.priority && <PriorityLabel priority={m.priority} />}
                            </div>
                            <p className="text-xs text-[#44546f] truncate mt-0.5">
                              {m.title ?? '(no title)'}
                            </p>
                            <p className="text-[10px] text-[#8993a4] mt-0.5">
                              Added {formatDistanceToNow(new Date(m.added_at), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Remove from group */}
                          <button
                            onClick={() => onRemoveFromGroup(group.id, m.ticket_id, m.ticket_number)}
                            disabled={removingTicket === m.ticket_id}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[#8993a4] hover:text-red-500 transition-all disabled:opacity-40"
                            title="Remove from group"
                          >
                            {removingTicket === m.ticket_id ? (
                              <div className="w-3 h-3 border border-[#8993a4] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Divider between multiple groups */}
                  {groups.indexOf(group) < groups.length - 1 && (
                    <div className="border-t border-[#ebecf0] pt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};