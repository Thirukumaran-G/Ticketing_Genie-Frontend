// src/features/tickets/components/teamlead/TLTicketDetailPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader, Select } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTicket, manualAssignThunk, fetchTeamOverview } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { tlNav } from './teamleadNav';
import { TICKET_STATUSES } from '../../../../config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id: string;
  author_type: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface AttachmentItem {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

type ThreadEntry =
  | { kind: 'message'; data: ConversationItem }
  | { kind: 'attachment'; data: AttachmentItem };

// ── Helpers ───────────────────────────────────────────────────────────────────

const MetaItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">{label}</p>
    {children}
  </div>
);

const STATUS_OPTIONS = TICKET_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

function getInitials(str: string) {
  return str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function fileIcon(mime: string | null) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📋';
  if (mime.includes('zip') || mime.includes('tar')) return '🗜️';
  return '📄';
}

function formatBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ── Thread Bubble ─────────────────────────────────────────────────────────────

const ThreadBubble: React.FC<{ entry: ThreadEntry; ticketId: string }> = ({ entry, ticketId }) => {
  if (entry.kind === 'attachment') {
    const att = entry.data;
    return (
      <div className="flex gap-2.5">
        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 text-slate-600">
          {getInitials('Customer')}
        </div>
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-slate-200/80 border border-slate-300/60 text-slate-700">
            <span className="text-lg">{fileIcon(att.mime_type)}</span>
            <div className="min-w-0">
              <p className="text-sm truncate max-w-[160px]">{att.file_name}</p>
              {att.file_size && <p className="text-xs text-slate-600">{formatBytes(att.file_size)}</p>}
            </div>
          </div>
          <span className="text-xs text-slate-600 px-1">
            {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  }

  const item = entry.data;
  const isAgent = item.author_type === 'agent';
  const isTL = item.author_type === 'team_lead';
  const isInternal = item.is_internal;
  const isRight = isAgent || isTL;

  const avatarColor = isTL
    ? 'bg-purple-800 text-purple-200'
    : isAgent
    ? isInternal ? 'bg-amber-800 text-amber-200' : 'bg-indigo-600 text-slate-900'
    : 'bg-slate-300 text-slate-600';

  const avatarLabel = isTL ? 'TL' : isAgent ? 'Agt' : 'Cus';

  const bubbleColor = isTL
    ? 'bg-purple-950/50 border border-purple-900/50 text-purple-100 rounded-2xl rounded-tr-sm'
    : isAgent
    ? isInternal
      ? 'bg-amber-950/50 border border-amber-900/50 text-amber-100 rounded-2xl rounded-tr-sm'
      : 'bg-indigo-600 text-slate-900 rounded-2xl rounded-tr-sm'
    : 'bg-blue-600 border border-blue-600 text-white rounded-2xl rounded-tl-sm';

  const authorLabel = isTL ? 'Team Lead' : isAgent ? (isInternal ? 'Internal · Agent' : 'Agent') : 'Customer';

  return (
    <div className={clsx('flex gap-2.5', isRight ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5', avatarColor)}>
        {avatarLabel}
      </div>
      <div className={clsx('flex flex-col gap-1 max-w-[78%]', isRight ? 'items-end' : 'items-start')}>
        {isInternal && (
          <span className="text-xs text-amber-500 font-medium px-1 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Internal note
          </span>
        )}
        <div className={clsx('px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words', bubbleColor)}>
          {item.content}
        </div>
        <span className="text-xs text-slate-600 px-1">
          {authorLabel} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TLTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { tlTicketDetail, teamOverview, isLoading } = useAppSelector((s) => s.tickets);

  const [selectedStatus, setSelectedStatus]   = useState('');
  const [selectedAgent, setSelectedAgent]     = useState('');
  const [updatingStatus, setUpdatingStatus]   = useState(false);
  const [assigning, setAssigning]             = useState(false);

  // Thread state
  const [thread, setThread]               = useState<{ conversations: ConversationItem[]; attachments: AttachmentItem[] } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [noteText, setNoteText]           = useState('');
  const [sendingNote, setSendingNote]     = useState(false);
  const threadEndRef                      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTLTicket(ticketId));
      dispatch(fetchTeamOverview());
      loadThread();
    }
  }, [ticketId, dispatch]);

  useEffect(() => {
    if (tlTicketDetail) setSelectedStatus(tlTicketDetail.status);
  }, [tlTicketDetail]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      const data = await ticketsService.getTLTicketThread(ticketId);
      setThread(data as any);
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  };

  const onStatusUpdate = async () => {
    if (!ticketId || !tlTicketDetail || selectedStatus === tlTicketDetail.status) return;
    try {
      setUpdatingStatus(true);
      await ticketsService.updateTLStatus(ticketId, selectedStatus);
      toast.success('Status updated');
      dispatch(fetchTLTicket(ticketId));
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const onAssign = async () => {
    if (!ticketId || !selectedAgent) return;
    try {
      setAssigning(true);
      await dispatch(manualAssignThunk({ ticketId, agent_user_id: selectedAgent }));
      toast.success('Ticket assigned');
      dispatch(fetchTLTicket(ticketId));
    } catch { toast.error('Assignment failed'); }
    finally { setAssigning(false); }
  };

  const onPostNote = async () => {
    if (!ticketId || !noteText.trim()) return;
    try {
      setSendingNote(true);
      await ticketsService.postTLInternalNote(ticketId, noteText.trim());
      setNoteText('');
      toast.success('Internal note saved');
      loadThread();
    } catch { toast.error('Failed to post note'); }
    finally { setSendingNote(false); }
  };

  if (isLoading || !tlTicketDetail) {
    return (
      <MainLayout navItems={tlNav} pageTitle="Ticket Detail">
        <PageLoader />
      </MainLayout>
    );
  }

  const t = tlTicketDetail;
  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `Agent ${a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  const merged: ThreadEntry[] = thread
    ? [
        ...thread.conversations.map(c => ({ kind: 'message' as const, data: c })),
        ...thread.attachments.map(a => ({ kind: 'attachment' as const, data: a })),
      ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  return (
    <MainLayout navItems={tlNav} pageTitle={t.ticket_number}>
      <div className="flex flex-col h-[calc(100vh-56px)]">

        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <Link to="/tickets/team/all" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Queue
          </Link>
        </div>

        <div className="flex flex-1 gap-4 px-5 pb-5 min-h-0 overflow-hidden">

          {/* ── LEFT: Thread ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-slate-600">{t.ticket_number}</span>
                <StatusBadge status={t.status} />
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
                <h1 className="text-sm font-semibold text-slate-900 ml-1 truncate">{t.title ?? '(No title)'}</h1>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Agent reply
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Customer
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Internal
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Team Lead
                </div>
              </div>
            </div>

            {/* Thread messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {threadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-zinc-300 rounded-full animate-spin" />
                </div>
              ) : merged.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-700">No messages yet</p>
                </div>
              ) : (
                merged.map(entry =>
                  <ThreadBubble key={entry.kind === 'message' ? `m-${entry.data.id}` : `a-${entry.data.id}`} entry={entry} ticketId={t.id} />
                )
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Internal note composer */}
            <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Internal Note (Team Lead only)</span>
              </div>
              <div className="flex items-start gap-2 bg-purple-950/20 border border-purple-900/40 focus-within:border-purple-700/60 rounded-xl px-4 py-3 transition-colors">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onPostNote(); } }}
                  placeholder="Add an internal note visible only to team leads and agents…"
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none leading-relaxed w-full"
                  style={{ minHeight: '52px', maxHeight: '200px', overflowY: 'auto' }}
                />
                <button
                  onClick={onPostNote}
                  disabled={sendingNote || !noteText.trim()}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-0.5"
                >
                  {sendingNote
                    ? <div className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  }
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 px-1">Enter to save · never visible to customer</p>
            </div>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

            {/* Ticket header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono text-slate-600">{t.ticket_number}</span>
                <StatusBadge status={t.status} />
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
              </div>
              <h2 className="text-slate-900 font-semibold text-sm leading-snug mb-3">{t.title ?? '(No title)'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <MetaItem label="Severity">
                  {t.severity ? (
                    <span className="flex items-center gap-1.5">
                      <SeverityDot severity={t.severity} />
                      <span className="text-slate-900 text-sm capitalize">{t.severity}</span>
                    </span>
                  ) : <span className="text-slate-700 text-slate-600 text-sm">—</span>}
                </MetaItem>
                <MetaItem label="Priority">
                  {t.priority ? <PriorityLabel priority={t.priority} /> : <span className="text-slate-700 text-slate-600 text-sm">—</span>}
                </MetaItem>
                <MetaItem label="Assigned">
                  <span className="text-slate-900 text-sm">
                    {t.assigned_to ? `${t.assigned_to.slice(0, 8)}…` : (
                      <span className="text-orange-400">Unassigned</span>
                    )}
                  </span>
                </MetaItem>
                <MetaItem label="Raised">
                  <span className="text-slate-900 text-sm">{format(new Date(t.created_at), 'MMM d, yyyy')}</span>
                </MetaItem>
              </div>
            </div>

            {/* SLA */}
            {(t.sla_response_due || t.sla_resolve_due) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">SLA</p>
                {t.sla_response_due && (
                  <MetaItem label="Response Due">
                    <span className={clsx('text-sm font-medium', t.response_sla_breached_at ? 'text-red-400' : 'text-slate-900')}>
                      {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
                      {t.response_sla_breached_at && <span className="block text-xs text-red-500">Breached</span>}
                    </span>
                  </MetaItem>
                )}
                {t.sla_resolve_due && (
                  <MetaItem label="Resolution Due">
                    <span className={clsx('text-sm font-medium', t.sla_breached_at ? 'text-red-400' : 'text-slate-900')}>
                      {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
                      {t.sla_breached_at && <span className="block text-xs text-red-500">Breached</span>}
                    </span>
                  </MetaItem>
                )}
              </div>
            )}

            {/* Update Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">Update Status</h3>
              <Select options={STATUS_OPTIONS} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} />
              <Button size="sm" full className="mt-3" loading={updatingStatus} disabled={selectedStatus === t.status} onClick={onStatusUpdate}>
                Apply
              </Button>
            </div>

            {/* Reassign */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">Reassign Agent</h3>
              <Select options={agentOptions} placeholder="Select agent…" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} />
              <Button size="sm" full className="mt-3" variant="secondary" loading={assigning} disabled={!selectedAgent} onClick={onAssign}>
                Assign
              </Button>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Timeline</h3>
              {t.first_response_at && (
                <MetaItem label="First Response">
                  <span className="text-slate-900 text-sm">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span>
                </MetaItem>
              )}
              {t.resolved_at && (
                <MetaItem label="Resolved">
                  <span className="text-slate-900 text-sm">{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span>
                </MetaItem>
              )}
              <MetaItem label="Last Updated">
                <span className="text-slate-900 text-sm">{format(new Date(t.updated_at), 'MMM d, h:mm a')}</span>
              </MetaItem>
              <MetaItem label="Reopen Count">
                <span className="text-slate-900 text-sm">{t.reopen_count}</span>
              </MetaItem>
            </div>

            {/* Description */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{t.description ?? 'No description provided.'}</p>
            </div>

            {/* Priority override */}
            {t.priority_overridden && t.override_reason && (
              <div className="p-3 bg-yellow-950/30 border border-yellow-900 rounded-lg">
                <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-1">Priority override</p>
                <p className="text-sm text-yellow-300">{t.override_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};