// src/features/tickets/components/teamlead/TLTicketGroupsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { StatusBadge, PriorityLabel } from '../shared/TicketBadges';
import { useAppSelector } from '../../../../app/store';
import { tlNav } from './teamleadNav';
import { ticketsService } from '../../services/ticketsService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupMember {
  ticket_id:        string;
  ticket_number:    string;
  title:            string | null;
  status:           string;
  priority:         string | null;
  severity:         string | null;
  similarity_score: number;
  added_at:         string;
  is_parent:        boolean;
}

interface TicketGroup {
  id:                string;
  name:              string | null;
  confirmed_by_lead: boolean;
  confirmed_at:      string | null;
  parent_ticket_id:  string | null;
  member_count:      number;
  members:           GroupMember[];
  created_at:        string;
  updated_at:        string;
}

type TabKey = 'unconfirmed' | 'confirmed';

// ── Similarity badge ──────────────────────────────────────────────────────────

const SimilarityBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct   = Math.round(score * 100);
  const color =
    pct >= 90 ? 'bg-red-50 text-red-700 border-red-200' :
    pct >= 80 ? 'bg-orange-50 text-orange-700 border-orange-200' :
    'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold',
      color,
    )}>
      {pct}% match
    </span>
  );
};

// ── Set Parent Modal ──────────────────────────────────────────────────────────

const SetParentModal: React.FC<{
  group:     TicketGroup;
  onConfirm: (parentId: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ group, onConfirm, onClose, loading }) => {
  // Default to highest priority member
  const sorted = [...group.members].sort((a, b) => {
    const pri = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (pri[a.priority as keyof typeof pri] ?? 9) -
           (pri[b.priority as keyof typeof pri] ?? 9);
  });
  const [selected, setSelected] = useState(sorted[0]?.ticket_id ?? '');

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
      <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-[#172b4d] text-sm font-semibold">Select parent ticket</h3>
          <p className="text-[#6b778c] text-xs mt-0.5">
            The agent will only see and work on this ticket. Resolving it closes all others.
          </p>
        </div>
        <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
          {sorted.map((m) => (
            <label
              key={m.ticket_id}
              className={clsx(
                'flex items-start gap-3 p-3 rounded border cursor-pointer transition-all',
                selected === m.ticket_id
                  ? 'border-[#0052cc] bg-[#deebff]'
                  : 'border-[#dfe1e6] hover:border-[#b3bac5] bg-[#fafbfc]',
              )}
            >
              <input
                type="radio"
                name="parent"
                value={m.ticket_id}
                checked={selected === m.ticket_id}
                onChange={() => setSelected(m.ticket_id)}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-[#0052cc]">{m.ticket_number}</span>
                  {m.priority && <PriorityLabel priority={m.priority} />}
                  <StatusBadge status={m.status} />
                  <SimilarityBadge score={m.similarity_score} />
                </div>
                <p className="text-xs text-[#44546f] truncate mt-0.5">{m.title ?? '(no title)'}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={loading || !selected}
            className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {loading && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
            Set as parent
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Assign Parent Modal ───────────────────────────────────────────────────────

const AssignParentModal: React.FC<{
  group:     TicketGroup;
  agents:    { value: string; label: string }[];
  onConfirm: (agentId: string, note: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ group, agents, onConfirm, onClose, loading }) => {
  const [agentId, setAgentId] = useState('');
  const [note, setNote]       = useState('');

  const parentMember = group.members.find((m) => m.ticket_id === group.parent_ticket_id);

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
      <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-[#172b4d] text-sm font-semibold">Assign parent ticket to agent</h3>
          <p className="text-[#6b778c] text-xs mt-0.5">
            Agent will handle {group.member_count} customer{group.member_count !== 1 ? 's' : ''} via one ticket
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {parentMember && (
            <div className="bg-[#f4f5f7] border border-[#dfe1e6] rounded px-3 py-2">
              <p className="text-[10px] text-[#6b778c] font-semibold uppercase tracking-wide mb-1">
                Parent ticket
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#0052cc]">{parentMember.ticket_number}</span>
                {parentMember.priority && <PriorityLabel priority={parentMember.priority} />}
                <span className="text-xs text-[#44546f] truncate">{parentMember.title}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
              Assign to agent <span className="text-[#de350b]">*</span>
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
            >
              <option value="">Select agent…</option>
              {agents.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
              Note to agent <span className="text-[#de350b]">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the root cause and what the agent should focus on…"
              rows={3}
              autoFocus
              className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
            />
            <p className="text-xs text-[#8993a4] mt-1">
              Posted as internal note on the parent ticket.
            </p>
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(agentId, note)}
            disabled={loading || !agentId || note.trim().length < 10}
            className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
            Assign parent ticket
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Broadcast Modal ───────────────────────────────────────────────────────────

const BroadcastModal: React.FC<{
  group:     TicketGroup;
  onConfirm: (message: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ group, onConfirm, onClose, loading }) => {
  const [message, setMessage] = useState('');

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
      <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-[#172b4d] text-sm font-semibold">Broadcast update to customers</h3>
          <p className="text-[#6b778c] text-xs mt-0.5">
            {group.member_count} customer{group.member_count !== 1 ? 's' : ''} will receive this message
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-[#42526e] leading-relaxed">
            Each customer receives this as an update on their own ticket number.
            They will not know other customers are affected.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. We are aware of the issue and our team is actively working on a fix. We expect to resolve this within 2 hours…"
            rows={4}
            autoFocus
            className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
          />
        </div>
        <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(message)}
            disabled={loading || message.trim().length < 10}
            className="h-8 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
            Send to {group.member_count} customer{group.member_count !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Resolve Group Modal ───────────────────────────────────────────────────────

const ResolveGroupModal: React.FC<{
  group:     TicketGroup;
  onConfirm: (message: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ group, onConfirm, onClose, loading }) => {
  const [message, setMessage] = useState('');
  const openCount = group.members.filter(
    (m) => !['resolved', 'closed'].includes(m.status)
  ).length;

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
      <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-[#172b4d] text-sm font-semibold">Resolve entire group</h3>
          <p className="text-[#6b778c] text-xs mt-0.5">
            {openCount} customer{openCount !== 1 ? 's' : ''} will be notified
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
              Resolution message <span className="text-[#de350b]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the resolution — what was the issue and how was it fixed…"
              rows={4}
              autoFocus
              className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
            />
            <p className="text-xs text-[#8993a4] mt-1">
              Sent to each customer on their own ticket.
            </p>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded">
            <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-orange-700">
              This resolves all open tickets in the group at once and cannot be undone in bulk.
            </p>
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(message)}
            disabled={loading || message.trim().length < 10 || openCount === 0}
            className="h-8 px-4 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
            Resolve {openCount} ticket{openCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Group Card ────────────────────────────────────────────────────────────────

const GroupCard: React.FC<{
  group:     TicketGroup;
  agents:    { value: string; label: string }[];
  onRefresh: () => void;
}> = ({ group, agents, onRefresh }) => {
  const [expanded, setExpanded]               = useState(false);
  const [setParentOpen, setSetParentOpen]     = useState(false);
  const [setParentLoading, setSetParentLoading] = useState(false);
  const [assignOpen, setAssignOpen]           = useState(false);
  const [assignLoading, setAssignLoading]     = useState(false);
  const [broadcastOpen, setBroadcastOpen]     = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [resolveOpen, setResolveOpen]         = useState(false);
  const [resolveLoading, setResolveLoading]   = useState(false);
  const [removingId, setRemovingId]           = useState<string | null>(null);

  const parentMember = group.members.find(
    (m) => m.ticket_id === group.parent_ticket_id
  );
  const openCount = group.members.filter(
    (m) => !['resolved', 'closed'].includes(m.status)
  ).length;
  const isAssigned = group.members.some(
    (m) => m.is_parent && m.status === 'assigned'
  );

  const onSetParent = async (parentTicketId: string) => {
    try {
      setSetParentLoading(true);
      await ticketsService.setGroupParent(group.id, parentTicketId);
      toast.success('Parent ticket set — children frozen to in progress');
      setSetParentOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to set parent');
    } finally {
      setSetParentLoading(false);
    }
  };

  const onAssignParent = async (agentId: string, note: string) => {
    try {
      setAssignLoading(true);
      await ticketsService.assignGroupParent(group.id, agentId, note);
      toast.success('Parent ticket assigned to agent');
      setAssignOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to assign');
    } finally {
      setAssignLoading(false);
    }
  };

  const onBroadcast = async (message: string) => {
    try {
      setBroadcastLoading(true);
      const result = await ticketsService.broadcastToGroup(group.id, message);
      toast.success(`Message sent to ${result.notified} customer${result.notified !== 1 ? 's' : ''}`);
      setBroadcastOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Broadcast failed');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const onResolveGroup = async (message: string) => {
    try {
      setResolveLoading(true);
      const result = await ticketsService.resolveGroup(group.id, message);
      toast.success(
        `${result.resolved} ticket${result.resolved !== 1 ? 's' : ''} resolved`
      );
      setResolveOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Resolve failed');
    } finally {
      setResolveLoading(false);
    }
  };

  const onRemoveMember = async (ticketId: string, ticketNumber: string) => {
    try {
      setRemovingId(ticketId);
      await ticketsService.removeGroupMember(group.id, ticketId);
      toast.success(`${ticketNumber} removed from group`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      {setParentOpen && (
        <SetParentModal
          group={group}
          onConfirm={onSetParent}
          onClose={() => setSetParentOpen(false)}
          loading={setParentLoading}
        />
      )}
      {assignOpen && (
        <AssignParentModal
          group={group}
          agents={agents}
          onConfirm={onAssignParent}
          onClose={() => setAssignOpen(false)}
          loading={assignLoading}
        />
      )}
      {broadcastOpen && (
        <BroadcastModal
          group={group}
          onConfirm={onBroadcast}
          onClose={() => setBroadcastOpen(false)}
          loading={broadcastLoading}
        />
      )}
      {resolveOpen && (
        <ResolveGroupModal
          group={group}
          onConfirm={onResolveGroup}
          onClose={() => setResolveOpen(false)}
          loading={resolveLoading}
        />
      )}

      <div className={clsx(
        'bg-white border rounded-xl overflow-hidden transition-all',
        group.confirmed_by_lead ? 'border-green-200' : 'border-[#dfe1e6]',
      )}>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">

            {/* Status indicator */}
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
              group.confirmed_by_lead ? 'bg-green-100' : 'bg-orange-100',
            )}>
              {group.confirmed_by_lead ? (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[#172b4d] text-sm font-semibold">
                  {group.name ?? `Group · ${group.id.slice(0, 8)}…`}
                </h3>
                <span className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                  group.confirmed_by_lead
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-orange-600 bg-orange-50 border-orange-200',
                )}>
                  {group.confirmed_by_lead ? 'Confirmed' : 'Unconfirmed'}
                </span>
                <span className="text-xs text-[#8993a4]">
                  {group.member_count} ticket{group.member_count !== 1 ? 's' : ''}
                  {openCount > 0 && (
                    <span className="ml-1 text-orange-500">· {openCount} open</span>
                  )}
                </span>
                {parentMember && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-amber-700 bg-amber-50 border-amber-200">
                    🔑 Parent: {parentMember.ticket_number}
                  </span>
                )}
              </div>
              <p className="text-[#6b778c] text-xs mt-0.5">
                Detected {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                {group.confirmed_at && (
                  <span className="ml-2 text-green-600">
                    · Confirmed {format(new Date(group.confirmed_at), 'MMM d, h:mm a')}
                  </span>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {/* Step 1: Confirm */}
              {!group.confirmed_by_lead && (
                <button
                  onClick={async () => {
                    try {
                      await ticketsService.confirmTicketGroup(group.id);
                      toast.success('Group confirmed');
                      onRefresh();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.detail ?? 'Failed to confirm');
                    }
                  }}
                  className="h-7 px-3 rounded border border-[#dfe1e6] text-xs text-[#42526e] hover:bg-[#f4f5f7] hover:border-[#b3bac5] transition-colors font-medium"
                >
                  Confirm
                </button>
              )}

              {/* Step 2: Set parent */}
              {group.confirmed_by_lead && !group.parent_ticket_id && (
                <button
                  onClick={() => setSetParentOpen(true)}
                  className="h-7 px-3 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
                >
                  Set parent
                </button>
              )}

              {/* Step 3: Assign parent */}
              {group.confirmed_by_lead && group.parent_ticket_id && !isAssigned && (
                <button
                  onClick={() => setAssignOpen(true)}
                  className="h-7 px-3 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-medium transition-colors"
                >
                  Assign parent
                </button>
              )}

              {/* Broadcast — available once confirmed */}
              {group.confirmed_by_lead && (
                <button
                  onClick={() => setBroadcastOpen(true)}
                  className="h-7 px-3 rounded border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-medium transition-colors"
                >
                  Broadcast
                </button>
              )}

              {/* Resolve group — available once parent set */}
              {group.confirmed_by_lead && group.parent_ticket_id && openCount > 0 && (
                <button
                  onClick={() => setResolveOpen(true)}
                  className="h-7 px-3 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                >
                  Resolve all
                </button>
              )}

              {/* Expand/collapse */}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="h-7 w-7 flex items-center justify-center rounded border border-[#dfe1e6] text-[#44546f] hover:bg-[#f4f5f7] transition-colors"
              >
                <svg
                  className={clsx('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compact preview */}
          {!expanded && group.members.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.members.slice(0, 4).map((m) => {
                // Show "New" badge if added in last 10 minutes
                const isNew = new Date().getTime() - new Date(m.added_at).getTime() < 10 * 60 * 1000;
                return (
                  <Link
                    key={m.ticket_id}
                    to={`/tickets/teamlead/${m.ticket_id}`}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded border transition-all text-xs',
                      m.is_parent
                        ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                        : isNew
                          ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                          : 'border-[#dfe1e6] bg-[#f4f5f7] hover:border-[#0052cc] hover:bg-[#deebff]',
                    )}
                  >
                    {m.is_parent && <span>🔑</span>}
                    {isNew && !m.is_parent && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                        NEW
                      </span>
                    )}
                    <span className="font-mono text-[#44546f]">{m.ticket_number}</span>
                    <SimilarityBadge score={m.similarity_score} />
                    <StatusBadge status={m.status} />
                  </Link>
                );
              })}
              {group.members.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 text-xs text-[#8993a4]">
                  +{group.members.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expanded table */}
        {expanded && (
          <div className="border-t border-[#ebecf0]">
            <div className="grid grid-cols-[auto_1fr_2fr_auto_auto_auto_auto] gap-3 px-5 py-2 bg-[#f4f5f7] border-b border-[#ebecf0] text-[10px] font-semibold text-[#44546f] uppercase tracking-widest">
              <span />
              <span>Ticket #</span>
              <span>Title</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Match</span>
              <span />
            </div>
            {group.members.map((m) => (
              <div
                key={m.ticket_id}
                className={clsx(
                  'grid grid-cols-[auto_1fr_2fr_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-[#f0f1f3] last:border-0 transition-colors',
                  m.is_parent ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-[#fafbfc]',
                )}
              >
                <span className="text-sm">{m.is_parent ? '🔑' : ''}</span>
                <Link
                  to={`/tickets/teamlead/${m.ticket_id}`}
                  className="text-xs font-mono text-[#0052cc] hover:underline"
                >
                  {m.ticket_number}
                </Link>
                <span className="text-xs text-[#172b4d] truncate">
                  {m.title ?? '(no title)'}
                </span>
                <StatusBadge status={m.status} />
                <span>
                  {m.priority
                    ? <PriorityLabel priority={m.priority} />
                    : <span className="text-xs text-[#8993a4]">—</span>
                  }
                </span>
                <SimilarityBadge score={m.similarity_score} />
                <button
                  onClick={() => onRemoveMember(m.ticket_id, m.ticket_number)}
                  disabled={removingId === m.ticket_id || m.is_parent}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[#8993a4] hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={m.is_parent ? 'Cannot remove parent ticket' : 'Remove from group'}
                >
                  {removingId === m.ticket_id ? (
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
      </div>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLTicketGroupsPage: React.FC = () => {
  const { teamOverview } = useAppSelector((s) => s.tickets);

  const [groups, setGroups]   = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>('unconfirmed');
  const [search, setSearch]   = useState('');

  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `${(a as any).full_name || a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsService.listTicketGroups();
      setGroups(data);
    } catch {
      toast.error('Failed to load ticket groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const filtered = groups
    .filter((g) =>
      tab === 'confirmed' ? g.confirmed_by_lead : !g.confirmed_by_lead
    )
    .filter((g) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (g.name ?? '').toLowerCase().includes(q) ||
        g.members.some(
          (m) =>
            m.ticket_number.toLowerCase().includes(q) ||
            (m.title ?? '').toLowerCase().includes(q)
        )
      );
    });

  const unconfirmedCount = groups.filter((g) => !g.confirmed_by_lead).length;
  const confirmedCount   = groups.filter((g) => g.confirmed_by_lead).length;

  return (
    <MainLayout navItems={tlNav} pageTitle="Ticket Groups">
      <div className="min-h-screen bg-[#f4f5f7]">
        <div className="max-w-5xl mx-auto px-6 py-6">

          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#172b4d]">Similar Ticket Groups</h2>
              <p className="text-[#44546f] text-sm mt-1">
                AI-detected groups of tickets sharing the same root cause.
              </p>
            </div>
            <button
              onClick={loadGroups}
              className="h-8 px-3 rounded border border-[#dfe1e6] bg-white text-xs text-[#42526e] hover:bg-[#f4f5f7] transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Workflow guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5">
            <p className="text-xs text-blue-800 font-semibold mb-1">Workflow</p>
            <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px] font-bold">1</span>
                Confirm group
              </span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px] font-bold">2</span>
                Set parent ticket
              </span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px] font-bold">3</span>
                Assign parent to agent
              </span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px] font-bold">4</span>
                Agent resolves → all close
              </span>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 p-0.5 bg-white border border-[#dfe1e6] rounded-lg">
              {([
                { key: 'unconfirmed', label: 'Needs review', count: unconfirmedCount },
                { key: 'confirmed',   label: 'Confirmed',    count: confirmedCount },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5',
                    tab === key
                      ? 'bg-[#0052cc] text-white shadow'
                      : 'text-[#44546f] hover:text-[#172b4d]',
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className={clsx(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                      tab === key
                        ? 'bg-white/20 text-white'
                        : key === 'unconfirmed'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-green-100 text-green-600',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8993a4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by group name or ticket number…"
                className="w-full h-8 pl-8 pr-3 rounded border border-[#dfe1e6] bg-white text-sm text-[#172b4d] placeholder:text-[#8993a4] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-16 text-center">
              <p className="text-[#44546f] text-sm">
                {search
                  ? 'No groups match your search.'
                  : tab === 'unconfirmed'
                    ? 'No groups need review.'
                    : 'No confirmed groups yet.'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-[#0052cc] hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  agents={agentOptions}
                  onRefresh={loadGroups}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};