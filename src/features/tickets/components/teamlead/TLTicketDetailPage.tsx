// src/features/tickets/components/teamlead/TLTicketDetailPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTicket, manualAssignThunk, fetchTeamOverview } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { tlNav } from './teamleadNav';
import { TICKET_STATUSES } from '../../../../config';
import { ticketClient } from '../../../../lib/axios';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id: string;
  author_type: 'customer' | 'agent' | 'team_lead';
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

interface CustomerInfo {
  full_name: string;
  email: string;
}

type ThreadEntry =
  | { kind: 'message'; data: ConversationItem }
  | { kind: 'attachment'; data: AttachmentItem };

interface ThreadData {
  conversations: ConversationItem[];
  attachments: AttachmentItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

function formatBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📋';
  if (mime.includes('zip') || mime.includes('tar')) return '🗜️';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  return '📄';
}

const INFO_STATUSES = TICKET_STATUSES.map(s => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── AuthImage ─────────────────────────────────────────────────────────────────

const AuthImage: React.FC<{ url: string; alt: string; className?: string }> = ({ url, alt, className }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let obj: string;
    ticketClient.get(url, { responseType: 'blob' })
      .then(r => { obj = URL.createObjectURL(r.data); setSrc(obj); })
      .catch(() => setErr(true));
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [url]);
  if (err) return <div className={clsx('flex items-center justify-center text-xs text-[#44546f] bg-[#f4f5f7] rounded', className)}>Failed</div>;
  if (!src) return <div className={clsx('flex items-center justify-center bg-[#f4f5f7] rounded', className)}><div className="w-4 h-4 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" /></div>;
  return <img src={src} alt={alt} className={clsx('object-cover', className)} />;
};

// ── KV ────────────────────────────────────────────────────────────────────────

const KV: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-3 min-h-[30px]">
    <span className="w-28 flex-shrink-0 text-xs text-[#8993a4]">{label}</span>
    <div className="flex-1 text-sm text-[#172b4d] min-w-0">{children}</div>
  </div>
);

// ── Thread bubbles ────────────────────────────────────────────────────────────

const TextBubble: React.FC<{ item: ConversationItem; customerName: string }> = ({ item, customerName }) => {
  const isAgent = item.author_type === 'agent';
  const isTL = item.author_type === 'team_lead';
  const isInternal = item.is_internal;
  
  let displayName = customerName;
  let bgColor = 'bg-[#dfe1e6] text-[#44546f]';
  
  if (isTL) {
    displayName = 'Team Lead';
    bgColor = 'bg-[#ff991f] text-white';
  } else if (isAgent) {
    displayName = 'Agent';
    bgColor = isInternal ? 'bg-[#ff991f] text-white' : 'bg-[#0052cc] text-white';
  }
  
  const initials = isTL ? 'TL' : isAgent ? 'A' : getInitials(customerName);

  return (
    <div className="flex gap-3 py-4">
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5',
        bgColor
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          {isInternal && (
            <span className="text-[10px] font-medium text-[#ff991f] bg-[#fff7e6] border border-[#ffe2a8] px-1.5 py-0.5 rounded">
              Internal note
            </span>
          )}
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        <div className={clsx(
          'text-sm leading-relaxed whitespace-pre-wrap text-[#172b4d]',
          isInternal && 'bg-[#fff7e6] border border-[#ffe2a8] rounded px-3 py-2'
        )}>
          {item.content}
        </div>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{ att: AttachmentItem; ticketId: string; customerName: string }> = ({ att, ticketId, customerName }) => {
  const url = ticketsService.getTlAttachmentUrl(ticketId, att.id);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');

  return (
    <div className="flex gap-3 py-4">
      <div className="w-8 h-8 rounded-full bg-[#dfe1e6] flex items-center justify-center text-xs font-bold text-[#44546f] flex-shrink-0 select-none mt-0.5">
        {getInitials(customerName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{customerName}</span>
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
        </div>
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-block border border-[#dfe1e6] rounded overflow-hidden hover:border-[#0052cc] transition-colors">
            <AuthImage url={url} alt={att.file_name} className="w-44 h-44" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-3 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded hover:bg-[#ebecf0] hover:border-[#b3bac5] transition-all group">
            <div className="w-8 h-8 bg-white border border-[#dfe1e6] rounded flex items-center justify-center text-base flex-shrink-0">{fileIcon(att.mime_type)}</div>
            <div className="min-w-0">
              <p className="text-sm text-[#172b4d] font-medium truncate max-w-[200px] group-hover:text-[#0052cc] transition-colors">{att.file_name}</p>
              {att.file_size && <p className="text-xs text-[#8993a4] mt-0.5">{formatBytes(att.file_size)}</p>}
            </div>
            <svg className="w-4 h-4 text-[#8993a4] flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const TLTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tlTicketDetail, teamOverview, isLoading } = useAppSelector((s) => s.tickets);

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(true); // Default to internal for TL
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const customerName = customerInfo?.full_name || 'Customer';
  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({
    value: a.user_id,
    label: `${a.full_name || a.user_id.slice(0, 8)} (${a.open_tickets} open)`,
  }));

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      setThread(await ticketsService.getTLTicketThread(ticketId));
    } catch {
      /* silent */
    } finally {
      setThreadLoading(false);
    }
  };

  const loadCustomerInfo = async () => {
    if (!ticketId) return;
    try {
      const info = await ticketsService.getTicketCustomerInfo(ticketId);
      setCustomerInfo(info);
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTLTicket(ticketId));
      dispatch(fetchTeamOverview());
      loadThread();
      loadCustomerInfo();
    }
  }, [ticketId, dispatch]);

  useEffect(() => {
    if (tlTicketDetail) setSelectedStatus(tlTicketDetail.status);
  }, [tlTicketDetail]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  useEffect(() => {
    setShowReasonInput(['resolved', 'closed', 'on_hold'].includes(selectedStatus));
  }, [selectedStatus]);

  const merged: ThreadEntry[] = thread
    ? [
        ...thread.conversations.map(c => ({ kind: 'message' as const, data: c })),
        ...thread.attachments.map(a => ({ kind: 'attachment' as const, data: a })),
      ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onComment = async () => {
    if (!ticketId) return;
    if (!commentText.trim()) {
      setCommentError('Cannot be empty');
      return;
    }
    try {
      setSending(true);
      setCommentError('');
      await ticketsService.postTLInternalNote(ticketId, commentText);
      setCommentText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success('Internal note saved');
      loadThread();
      dispatch(fetchTLTicket(ticketId));
    } catch {
      toast.error('Failed to post');
    } finally {
      setSending(false);
    }
  };

  const onStatusUpdate = async () => {
    if (!ticketId || !tlTicketDetail || selectedStatus === tlTicketDetail.status) return;
    try {
      setUpdatingStatus(true);
      await ticketsService.updateTLStatus(ticketId, selectedStatus, statusReason || undefined);
      toast.success('Status updated');
      setStatusReason('');
      dispatch(fetchTLTicket(ticketId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update status');
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
      setSelectedAgent('');
      dispatch(fetchTLTicket(ticketId));
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (isLoading || !tlTicketDetail) {
    return <MainLayout navItems={tlNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;
  }

  const t = tlTicketDetail;

  // Prepare columns for details section
  const col1: { label: string; node: React.ReactNode }[] = [
    { label: 'Status', node: <StatusBadge status={t.status} /> },
    ...(t.priority ? [{ label: 'Priority', node: <PriorityLabel priority={t.priority} /> }] : []),
    ...(t.severity ? [{
      label: 'Severity',
      node: <span className="flex items-center gap-1.5"><SeverityDot severity={t.severity} /><span className="capitalize">{t.severity}</span></span>
    }] : []),
    { label: 'Assigned', node: <span>{t.assigned_to ? t.assigned_to.slice(0, 8) : <span className="text-[#ff991f]">Unassigned</span>}</span> },
  ];

  const col2: { label: string; node: React.ReactNode }[] = [
    ...(t.environment ? [{ label: 'Environment', node: <span className="capitalize">{t.environment}</span> }] : []),
    ...(t.source ? [{ label: 'Source', node: <span className="capitalize">{t.source}</span> }] : []),
    ...(t.customer_priority ? [{ label: 'Cust. priority', node: <span className="capitalize">{t.customer_priority}</span> }] : []),
  ];

  const col3: { label: string; node: React.ReactNode }[] = [
    { label: 'Raised', node: <span>{format(new Date(t.created_at), 'MMM d, yyyy')}</span> },
    { label: 'Reopens', node: <span>{t.reopen_count}</span> },
    ...(t.sla_response_due ? [{
      label: 'Response due',
      node: <span className={clsx(t.response_sla_breached_at ? 'text-[#de350b]' : '')}>
        {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
        {t.response_sla_breached_at && <span className="ml-1 text-[10px] text-[#de350b]">Breached</span>}
      </span>,
    }] : []),
    ...(t.sla_resolve_due ? [{
      label: 'Resolve due',
      node: <span className={clsx(t.sla_breached_at ? 'text-[#de350b]' : '')}>
        {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
        {t.sla_breached_at && <span className="ml-1 text-[10px] text-[#de350b]">Breached</span>}
      </span>,
    }] : []),
    ...(t.first_response_at ? [{ label: 'First response', node: <span>{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span> }] : []),
    ...(t.resolved_at ? [{ label: 'Resolved', node: <span>{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span> }] : []),
  ];

  return (
    <MainLayout navItems={tlNav} pageTitle={t.ticket_number}>
      {/* Fixed height container - edge to edge */}
      <div className="h-[calc(100vh-56px)] bg-[#f4f5f7] overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="py-5 space-y-3">
            
            {/* Back link */}
            <div className="px-5">
              <Link to="/tickets/team/all" className="inline-flex items-center gap-2 text-[#44546f] hover:text-[#172b4d] text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Queue
              </Link>
            </div>

            {/* Title row */}
            <div className="px-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#44546f] text-xs font-mono mb-0.5">{t.ticket_number}</p>
                <h1 className="text-[#172b4d] text-xl font-semibold leading-snug">{t.title ?? '(No title)'}</h1>
                {customerInfo && (
                  <p className="text-[#6b778c] text-xs mt-1">
                    {customerInfo.full_name}
                    {customerInfo.email && <span className="ml-1.5 text-[#8993a4]">· {customerInfo.email}</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
                <StatusBadge status={t.status} />
              </div>
            </div>

            {/* Details - 3 columns (Jira style) */}
            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-3">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-2">Details</p>
                <div className="grid grid-cols-3 gap-0">
                  <div className="flex flex-col gap-0.5 pr-6">
                    {col1.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}
                  </div>
                  <div className="flex flex-col gap-0.5 px-6 border-x border-[#ebecf0]">
                    {col2.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}
                  </div>
                  <div className="flex flex-col gap-0.5 pl-6">
                    {col3.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-3">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-2">Description</p>
                {t.priority_overridden && t.override_reason && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-[#fff7e6] border border-[#ffe2a8] rounded mb-2">
                    <svg className="w-4 h-4 text-[#ff991f] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-[#172b4d]"><span className="font-semibold text-[#ff991f]">Priority override:</span> {t.override_reason}</p>
                  </div>
                )}
                <p className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">
                  {t.description ?? <span className="text-[#8993a4] italic">No description provided.</span>}
                </p>
              </div>
            </div>

            {/* Team Lead Actions - Status + Assignment */}
            <div className="px-5 grid grid-cols-2 gap-3">
              {/* Update Status */}
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Update Status</p>
                <div className="flex items-start gap-3">
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
                  >
                    {INFO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button
                    onClick={onStatusUpdate}
                    disabled={updatingStatus || selectedStatus === t.status}
                    className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {updatingStatus && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                    Apply
                  </button>
                </div>
                {showReasonInput && (
                  <textarea
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Add a note for the customer (optional)…"
                    rows={2}
                    className="mt-2 w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] transition-colors"
                  />
                )}
                <p className="text-xs text-[#8993a4] mt-1.5">Customer will receive an email on status change.</p>
              </div>

              {/* Reassign Agent */}
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Reassign Agent</p>
                <div className="flex items-start gap-3">
                  <select
                    value={selectedAgent}
                    onChange={e => setSelectedAgent(e.target.value)}
                    className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors flex-1"
                  >
                    <option value="">Select agent…</option>
                    {agentOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={onAssign}
                    disabled={assigning || !selectedAgent}
                    className="h-8 px-4 rounded border border-[#dfe1e6] text-sm text-[#42526e] hover:bg-[#f4f5f7] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {assigning && <div className="w-3.5 h-3.5 border border-[#6b778c] border-t-transparent rounded-full animate-spin" />}
                    Assign
                  </button>
                </div>
                <p className="text-xs text-[#8993a4] mt-1.5">Agent will be notified of assignment.</p>
              </div>
            </div>

            {/* Activity Section */}
            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded flex flex-col overflow-hidden">
                
                {/* Activity Header */}
                <div className="px-6 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                  <h3 className="text-[#172b4d] text-sm font-semibold">Activity</h3>
                  <div className="flex items-center gap-3 text-xs text-[#8993a4]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0052cc] inline-block" /> Agent</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff991f] inline-block" /> Team Lead</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#dfe1e6] inline-block" /> {customerName}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff991f] inline-block" /> Internal</span>
                  </div>
                </div>

                {/* Composer - Internal only for TL */}
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 text-[#ff991f]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-semibold text-[#ff991f] uppercase tracking-widest">Internal Note (Team Lead only)</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff991f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none mt-0.5">TL</div>
                    <div className="flex-1 min-w-0">
                      <div className={clsx(
                        'rounded border bg-white transition-all overflow-hidden',
                        commentFocused ? 'border-[#ff991f] shadow-[0_0_0_1px_#ff991f]' : 'border-[#dfe1e6] hover:border-[#b3bac5]'
                      )}>
                        <textarea
                          ref={textareaRef}
                          value={commentText}
                          onFocus={() => setCommentFocused(true)}
                          onChange={e => {
                            setCommentText(e.target.value);
                            setCommentError('');
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onComment(); } }}
                          placeholder="Add an internal note visible only to team leads and agents…"
                          rows={commentFocused ? 3 : 1}
                          className="w-full text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-transparent px-3 py-2.5 resize-none outline-none leading-relaxed"
                          style={{ maxHeight: '400px', overflowY: 'auto' }}
                        />
                      </div>
                      {commentError && <p className="text-xs text-[#de350b] mt-1">{commentError}</p>}
                      {commentFocused && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={onComment}
                            disabled={sending || !commentText.trim()}
                            className="px-3 py-1.5 rounded bg-[#ff991f] hover:bg-[#ff8b00] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                            Save note
                          </button>
                          <button
                            onClick={() => { setCommentText(''); setCommentError(''); setCommentFocused(false); }}
                            className="px-3 py-1.5 text-[#44546f] text-sm rounded hover:bg-[#ebecf0] transition-colors"
                          >
                            Cancel
                          </button>
                          <span className="ml-auto text-xs text-[#8993a4]">
                            <kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to save
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {merged.length > 0 && <div className="border-t border-[#ebecf0]" />}

                {/* Thread */}
                <div className="max-h-[400px] overflow-y-auto px-6">
                  {threadLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : merged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-[#8993a4] text-sm">No messages yet on this ticket.</p>
                      <p className="text-[#c1c7d0] text-xs mt-1">Post the first internal note above.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f0f1f3]">
                      {merged.map(entry =>
                        entry.kind === 'message'
                          ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} customerName={customerName} />
                          : <AttachmentBubble key={`a-${entry.data.id}`} att={entry.data} ticketId={t.id} customerName={customerName} />
                      )}
                    </div>
                  )}
                  <div ref={threadEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};