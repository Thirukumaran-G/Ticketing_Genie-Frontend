// src/features/tickets/components/agent/AgentTicketDetailPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { AgentSLAPanel } from '../shared/SLAPanel';
import { BreachJustificationPanel } from './BreachJustificationPanel';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchAgentTicket, fetchProducts, clearAgentTicketDetail } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { agentNav } from './agentNav';
import { ticketClient } from '../../../../lib/axios';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id:          string;
  author_id:   string;
  author_type: 'customer' | 'agent' | 'team_lead';
  content:     string;
  is_internal: boolean;
  created_at:  string;
}

interface AttachmentItem {
  id:         string;
  file_name:  string;
  file_size:  number | null;
  mime_type:  string | null;
  created_at: string;
}

interface CustomerInfo {
  full_name: string;
  email:     string;
}

type ThreadEntry =
  | { kind: 'message';    data: ConversationItem }
  | { kind: 'attachment'; data: AttachmentItem };

interface ThreadData {
  conversations: ConversationItem[];
  attachments:   AttachmentItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);

function formatBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return '📄';
  if (mime.startsWith('image/'))                                                  return '🖼️';
  if (mime === 'application/pdf')                                                return '📋';
  if (mime.includes('zip') || mime.includes('tar'))                              return '🗜️';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word') || mime.includes('document'))                        return '📝';
  return '📄';
}

// Agent can only manually set these 3 statuses.
// Celery owns: new → acknowledged → assigned
// Customer owns: closed (from resolved), reopened (from closed)
const AGENT_STATUSES = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold',     label: 'On Hold'     },
  { value: 'resolved',    label: 'Resolved'    },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── AuthImage ─────────────────────────────────────────────────────────────────

const AuthImage: React.FC<{ url: string; alt: string; className?: string }> = ({ url, alt, className }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let obj: string;
    ticketClient.get(url, { responseType: 'blob' })
      .then((r) => { obj = URL.createObjectURL(r.data); setSrc(obj); })
      .catch(() => setErr(true));
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [url]);
  if (err)  return <div className={clsx('flex items-center justify-center text-xs text-[#44546f] bg-[#f4f5f7] rounded', className)}>Failed</div>;
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

// ── AiDraftPanel ──────────────────────────────────────────────────────────────

const AiDraftPanel: React.FC<{ draft: string; onUse: (text: string) => void }> = ({ draft, onUse }) => {
  const [isEditing, setIsEditing]     = useState(false);
  const [editedDraft, setEditedDraft] = useState(draft);
  const handleCancel = () => { setIsEditing(false); setEditedDraft(draft); };
  return (
    <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest">AI Draft</p>
        <div className="flex items-center gap-1.5">
          <button onClick={isEditing ? handleCancel : () => setIsEditing(true)} className="px-3 py-1 rounded border border-[#dfe1e6] text-xs text-[#42526e] hover:bg-[#f4f5f7] transition-colors">
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={() => onUse(editedDraft)} className="px-3 py-1 rounded bg-[#0052cc] text-xs text-white hover:bg-[#0065ff] transition-colors">Use draft</button>
        </div>
      </div>
      {isEditing
        ? <textarea value={editedDraft} onChange={(e) => setEditedDraft(e.target.value)} className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors" style={{ minHeight: '220px' }} autoFocus />
        : <p className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-[#dfe1e6] pl-3">{editedDraft}</p>
      }
    </div>
  );
};

// ── UnassignModal ─────────────────────────────────────────────────────────────

const UnassignModal: React.FC<{
  ticketNumber: string;
  onConfirm:    (justification: string) => void;
  onCancel:     () => void;
  loading:      boolean;
}> = ({ ticketNumber, onConfirm, onCancel, loading }) => {
  const [justification, setJustification] = useState('');
  const MIN_CHARS = 20;
  const remaining = MIN_CHARS - justification.trim().length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded border border-[#dfe1e6] shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dfe1e6]">
          <h3 className="text-sm font-semibold text-[#172b4d]">Unassign from ticket</h3>
          <p className="text-xs text-[#6b778c] mt-0.5 font-mono">{ticketNumber}</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[#42526e] mb-4 leading-relaxed">This ticket will return to the unassigned queue and your team lead will be notified immediately.</p>
          <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">Justification <span className="text-[#de350b]">*</span></label>
          <textarea value={justification} onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g. This issue requires database-level access I don't have…"
            rows={4} autoFocus
            className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors" />
          {remaining > 0 && <p className="text-xs text-[#8993a4] mt-1">Minimum {MIN_CHARS} characters — {remaining} more needed</p>}
        </div>
        <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors">Cancel</button>
          <button onClick={() => onConfirm(justification)} disabled={loading || remaining > 0}
            className="h-8 px-4 rounded bg-[#ff991f] hover:bg-[#ff8b00] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            {loading && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
            Unassign ticket
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Thread bubbles ────────────────────────────────────────────────────────────

const TextBubble: React.FC<{
  item:          ConversationItem;
  authorNames:   Record<string, string>;
  customerName:  string;
  currentUserId: string;
}> = ({ item, authorNames, customerName, currentUserId }) => {
  const isAgent    = item.author_type === 'agent';
  const isTL       = item.author_type === 'team_lead';
  const isInternal = item.is_internal;
  const resolvedName = authorNames[item.author_id];

  const displayName = isTL
    ? (resolvedName ? `${resolvedName} (team lead)` : 'Team Lead')
    : isAgent
      ? (resolvedName ? `${resolvedName} (agent)` : 'Agent')
      : customerName;

  const initials = isTL
    ? (resolvedName ? getInitials(resolvedName) : 'TL')
    : isAgent
      ? (resolvedName ? getInitials(resolvedName) : 'A')
      : getInitials(customerName);

  const bgColor = isTL || (isAgent && isInternal)
    ? 'bg-[#ff991f] text-white'
    : isAgent
      ? 'bg-[#0052cc] text-white'
      : 'bg-[#dfe1e6] text-[#44546f]';

  return (
    <div className="flex gap-3 py-4">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5', bgColor)}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          {isInternal && (
            <span className="text-[10px] font-medium text-[#ff991f] bg-[#fff7e6] border border-[#ffe2a8] px-1.5 py-0.5 rounded">Internal note</span>
          )}
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        <div className={clsx('text-sm leading-relaxed whitespace-pre-wrap text-[#172b4d]', isInternal && 'bg-[#fff7e6] border border-[#ffe2a8] rounded px-3 py-2')}>
          {item.content}
        </div>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{
  att:          AttachmentItem;
  ticketId:     string;
  customerName: string;
}> = ({ att, ticketId, customerName }) => {
  const url   = ticketsService.getAgentAttachmentUrl(ticketId, att.id);
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

export const AgentTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate     = useNavigate();
  const dispatch     = useAppDispatch();
  const { agentTicketDetail, isLoading, error, products } = useAppSelector((s) => s.tickets);

  const { user: currentUser } = useAppSelector((s) => s.auth);
  const currentUserId         = currentUser?.id ?? '';
  const currentUserInitials   = currentUser?.name ? getInitials(currentUser.name) : 'A';
  const currentUserLabel      = currentUser?.name ? `${currentUser.name} (agent)` : 'Agent';

  const [thread, setThread]                       = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading]         = useState(false);
  const [authorNames, setAuthorNames]             = useState<Record<string, string>>({});
  const [customerInfo, setCustomerInfo]           = useState<CustomerInfo | null>(null);
  const [commentText, setCommentText]             = useState('');
  const [commentError, setCommentError]           = useState('');
  const [sending, setSending]                     = useState(false);
  const [isInternal, setIsInternal]               = useState(false);
  const [selectedStatus, setSelectedStatus]       = useState('');
  const [updatingStatus, setUpdatingStatus]       = useState(false);
  const [statusReason, setStatusReason]           = useState('');
  const [showReasonInput, setShowReasonInput]     = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassigning, setUnassigning]             = useState(false);
  const [enhancing, setEnhancing]                 = useState(false);
  const [commentFocused, setCommentFocused]       = useState(false);

  const threadEndRef       = useRef<HTMLDivElement>(null);
  const textareaRef        = useRef<HTMLTextAreaElement>(null);
  const inProgressFiredRef = useRef(false);

  const customerName = customerInfo?.full_name || 'Customer';
  const productName  = agentTicketDetail?.product_id
    ? products.find((p) => p.id === String(agentTicketDetail.product_id))?.name ?? null
    : null;

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      const data = await ticketsService.getAgentThread(ticketId);
      setThread(data);
      const ids   = data.conversations.map((c) => c.author_id);
      const names = await ticketsService.resolveUserNames(ids);
      setAuthorNames(names);
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  };

  const loadCustomerInfo = async () => {
    if (!ticketId) return;
    try { setCustomerInfo(await ticketsService.getTicketCustomerInfo(ticketId)); }
    catch { /* non-critical */ }
  };

  // ── Initial load — fresh data on every page visit ─────────────────────────
  useEffect(() => {
    if (ticketId) {
      dispatch(clearAgentTicketDetail());
      dispatch(fetchAgentTicket(ticketId));
      loadThread();
      loadCustomerInfo();
    }
    if (!products.length) dispatch(fetchProducts());
  }, [ticketId]);

  // ── Sync selectedStatus with Redux ticket state ────────────────────────────
  useEffect(() => {
    if (agentTicketDetail) setSelectedStatus(agentTicketDetail.status);
  }, [agentTicketDetail]);

  // ── Scroll to bottom of thread ─────────────────────────────────────────────
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // ── Show reason input for certain statuses ─────────────────────────────────
  useEffect(() => {
    setShowReasonInput(['resolved', 'on_hold'].includes(selectedStatus));
  }, [selectedStatus]);

  // ── No polling — status is fetched fresh on every page load/navigation ─────

  const merged: ThreadEntry[] = thread
    ? [
        ...thread.conversations.map((c) => ({ kind: 'message'    as const, data: c })),
        ...thread.attachments.map((a)   => ({ kind: 'attachment' as const, data: a })),
      ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onComment = async () => {
    if (!ticketId) return;
    if (!commentText.trim()) { setCommentError('Cannot be empty'); return; }
    try {
      setSending(true); setCommentError('');
      await ticketsService.postAgentComment(ticketId, commentText, isInternal);
      setCommentText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success(isInternal ? 'Note saved' : 'Reply sent');
      loadThread();
      dispatch(fetchAgentTicket(ticketId));
    } catch { toast.error('Failed to post'); }
    finally { setSending(false); }
  };

  const onStatusUpdate = async () => {
    if (!ticketId || selectedStatus === agentTicketDetail?.status) return;
    try {
      setUpdatingStatus(true);
      await ticketsService.updateAgentStatus(ticketId, selectedStatus, statusReason || undefined);
      toast.success('Status updated');
      setStatusReason('');
      dispatch(fetchAgentTicket(ticketId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUseDraft = (text: string) => {
    setCommentText(text); setIsInternal(false);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.setSelectionRange(text.length, text.length);
    }, 50);
    toast.success('Draft pasted — edit and send');
  };

  const handleUnassignConfirm = async (justification: string) => {
    if (!ticketId) return;
    try {
      setUnassigning(true);
      await ticketsService.unassignTicket(ticketId, justification);
      toast.success('Ticket unassigned — team lead notified');
      setShowUnassignModal(false);
      navigate('/tickets/agent/all');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to unassign ticket');
    } finally {
      setUnassigning(false);
    }
  };

  const handleEnhance = async () => {
    if (!commentText.trim()) { toast.error('Write something first before enhancing'); return; }
    try {
      setEnhancing(true);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a support agent writing assistant. Take the following draft reply and improve it:\n- Fix grammar, spelling, and punctuation\n- Make the tone warm, empathetic, and professional\n- Keep the original meaning intact\n- Output ONLY the improved reply text, nothing else\n\nDraft reply:\n${commentText}`,
          }],
        }),
      });
      const data     = await response.json();
      const improved = data?.content?.[0]?.text ?? '';
      if (!improved) { toast.error('Enhancement failed — try again'); return; }
      setCommentText(improved);
      setTimeout(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }, 30);
      toast.success('Reply enhanced ✨');
    } catch {
      toast.error('Enhancement failed — try again');
    } finally {
      setEnhancing(false);
    }
  };

  if (isLoading) return <MainLayout navItems={agentNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;

  if (!agentTicketDetail || error) {
    return (
      <MainLayout navItems={agentNav} pageTitle="Ticket Detail">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[#44546f] font-medium">{error ?? 'Ticket not found.'}</p>
          {ticketId && (
            <button
              onClick={() => { dispatch(clearAgentTicketDetail()); dispatch(fetchAgentTicket(ticketId)); }}
              className="text-xs text-[#0052cc] hover:underline"
            >
              Retry
            </button>
          )}
          <button onClick={() => navigate('/tickets/agent/all')} className="text-xs text-[#44546f] hover:underline">
            ← Back to tickets
          </button>
        </div>
      </MainLayout>
    );
  }

  const t = agentTicketDetail;

  const hasBreach      = !!(t.sla_breached_at || t.response_sla_breached_at);
  const bothBreached   = !!(t.sla_breached_at && t.response_sla_breached_at);
  const slaBreachLabel = bothBreached
    ? 'Response & Resolution SLA Breached'
    : t.sla_breached_at
    ? 'Resolution SLA Breached'
    : 'Response SLA Breached';

  const col1 = [
    { label: 'Status',   node: <StatusBadge status={t.status} /> },
    ...(t.priority      ? [{ label: 'Priority', node: <PriorityLabel priority={t.priority} /> }] : []),
    ...(t.severity      ? [{ label: 'Severity', node: <span className="flex items-center gap-1.5"><SeverityDot severity={t.severity} /><span className="capitalize">{t.severity}</span></span> }] : []),
    ...(t.tier_snapshot ? [{ label: 'Tier',     node: <span>{t.tier_snapshot}</span> }] : []),
  ];

  const col2 = [
    ...(productName         ? [{ label: 'Product',        node: <span>{productName}</span> }] : []),
    ...(t.environment       ? [{ label: 'Environment',    node: <span className="capitalize">{t.environment}</span> }] : []),
    ...(t.source            ? [{ label: 'Source',         node: <span className="capitalize">{t.source}</span> }] : []),
    ...(t.customer_priority ? [{ label: 'Cust. priority', node: <span className="capitalize">{t.customer_priority}</span> }] : []),
  ];

  // ── SLA colour logic ──────────────────────────────────────────────────────
  // Response due:
  //   red + Breached  → response_sla_breached_at is set
  //   green + Met     → first_response_at is set (and not breached)
  //   red + Overdue   → past due, no response yet, not breached (clock drift)
  //   default         → within SLA, waiting
  //
  // Resolve due:
  //   red + Breached  → sla_breached_at is set
  //   green + Met     → resolved_at is set (and not breached)
  //   red + Overdue   → past due, not resolved, not yet stamped breached
  //   default         → within SLA, in progress

  const col3 = [
    { label: 'Raised',  node: <span>{format(new Date(t.created_at), 'MMM d, yyyy')}</span> },
    { label: 'Reopens', node: <span>{t.reopen_count}</span> },

    ...(t.sla_response_due ? [{
      label: 'Response due',
      node: (() => {
        const isBreached = !!t.response_sla_breached_at;
        const isMet      = !!t.first_response_at && !isBreached;
        const isOverdue  = !t.first_response_at && !isBreached
          && new Date() > new Date(t.sla_response_due);
        return (
          <span className={clsx(
            'flex items-center gap-1.5 text-sm',
            isBreached ? 'text-[#de350b] font-medium' :
            isMet      ? 'text-green-600 font-medium'  :
            isOverdue  ? 'text-[#de350b]'              : 'text-[#172b4d]',
          )}>
            {isMet
              ? `Responded ${format(new Date(t.first_response_at!), 'MMM d, h:mm a')}`
              : format(new Date(t.sla_response_due), 'MMM d, h:mm a')
            }
            {isBreached && (
              <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-1 py-0.5 rounded font-semibold">
                Breached
              </span>
            )}
            {isMet && (
              <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1 py-0.5 rounded font-semibold">
                Met
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1 py-0.5 rounded font-semibold">
                Overdue
              </span>
            )}
          </span>
        );
      })(),
    }] : []),

    ...(t.sla_resolve_due ? [{
      label: 'Resolve due',
      node: (() => {
        const isBreached = !!t.sla_breached_at;
        const isMet      = !!t.resolved_at && !isBreached;
        const isOverdue  = !t.resolved_at && !isBreached
          && !['resolved', 'closed'].includes(t.status)
          && new Date() > new Date(t.sla_resolve_due);
        return (
          <span className={clsx(
            'flex items-center gap-1.5 text-sm',
            isBreached ? 'text-[#de350b] font-medium' :
            isMet      ? 'text-green-600 font-medium'  :
            isOverdue  ? 'text-[#de350b]'              : 'text-[#172b4d]',
          )}>
            {isMet
              ? `Resolved ${format(new Date(t.resolved_at!), 'MMM d, h:mm a')}`
              : format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')
            }
            {isBreached && (
              <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-1 py-0.5 rounded font-semibold">
                Breached
              </span>
            )}
            {isMet && (
              <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1 py-0.5 rounded font-semibold">
                Met
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1 py-0.5 rounded font-semibold">
                Overdue
              </span>
            )}
          </span>
        );
      })(),
    }] : []),

    ...(t.first_response_at ? [{
      label: 'First response',
      node: <span className="text-green-600">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span>,
    }] : []),

    ...(t.resolved_at ? [{
      label: 'Resolved',
      node: <span>{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span>,
    }] : []),
  ];

  return (
    <MainLayout navItems={agentNav} pageTitle={t.ticket_number}>
      {showUnassignModal && (
        <UnassignModal
          ticketNumber={t.ticket_number}
          onConfirm={handleUnassignConfirm}
          onCancel={() => setShowUnassignModal(false)}
          loading={unassigning}
        />
      )}

      <div className="h-[calc(100vh-56px)] bg-[#f4f5f7] overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="py-5 px-5 space-y-3">

            {/* ── Title row ── */}
            <div className="flex items-start justify-between gap-4">
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

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {hasBreach ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {slaBreachLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    SLA On Track
                  </span>
                )}
                <button
                  onClick={() => setShowUnassignModal(true)}
                  className="h-7 px-3 rounded border border-[#dfe1e6] text-xs text-[#42526e] hover:bg-[#f4f5f7] hover:border-[#b3bac5] transition-colors"
                >
                  Unassign
                </button>
              </div>
            </div>

            {/* ── Update Status bar ── */}
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <span className="text-xs text-[#8993a4]">Update status:</span>
              <div className="w-px h-4 bg-[#dfe1e6] flex-shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
              >
                {/* Show current status as disabled read-only if Celery/customer-managed */}
                {['new', 'acknowledged', 'assigned', 'reopened'].includes(t.status) && (
                  <option value={t.status} disabled>
                    {t.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (current)
                  </option>
                )}
                {AGENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {showReasonInput && (
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Add a note for the customer (optional)…"
                  className="h-8 w-64 bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 text-sm text-[#172b4d] placeholder:text-[#8993a4] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
                />
              )}
              <button
                onClick={onStatusUpdate}
                disabled={
                  updatingStatus ||
                  selectedStatus === t.status ||
                  ['new', 'acknowledged', 'assigned', 'reopened'].includes(selectedStatus)
                }
                className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                {updatingStatus && <div className="w-3 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                Apply
              </button>
            </div>

            {/* ── Details ── */}
            <div className="bg-white border border-[#dfe1e6] rounded px-5 py-3">
              <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-2">Details</p>
              <div className="grid grid-cols-3 gap-0">
                <div className="flex flex-col gap-0.5 pr-6">{col1.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
                <div className="flex flex-col gap-0.5 px-6 border-x border-[#ebecf0]">{col2.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
                <div className="flex flex-col gap-0.5 pl-6">{col3.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
              </div>
            </div>

            {/* ── Description ── */}
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

            {/* ── SLA Panel ── */}
            <AgentSLAPanel
              createdAt={t.created_at}
              slaResponseDue={t.sla_response_due}
              slaResolveDue={t.sla_resolve_due}
              firstResponseAt={t.first_response_at}
              resolvedAt={t.resolved_at}
              responseBreachedAt={t.response_sla_breached_at}
              slaBreachedAt={t.sla_breached_at}
              onHoldStartedAt={(t as any).on_hold_started_at ?? null}
              onHoldAccumulated={(t as any).on_hold_duration_accumulated ?? 0}
              status={t.status}
            />

            {/* ── Breach Justification ── */}
            {(t.response_sla_breached_at || t.sla_breached_at) && (
              <BreachJustificationPanel
                ticketId={t.id}
                responseBreachedAt={t.response_sla_breached_at}
                slaBreachedAt={t.sla_breached_at}
                onSubmitted={() => dispatch(fetchAgentTicket(ticketId!))}
              />
            )}

            {/* ── AI Draft ── */}
            {t.ai_draft && <AiDraftPanel draft={t.ai_draft} onUse={handleUseDraft} />}

            {/* ── Activity ── */}
            <div className="bg-white border border-[#dfe1e6] rounded flex flex-col overflow-hidden">
              <div className="px-6 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                <h3 className="text-[#172b4d] text-sm font-semibold">Activity</h3>
                <div className="flex items-center gap-3 text-xs text-[#8993a4]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0052cc] inline-block" /> {currentUserLabel}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#dfe1e6] inline-block" /> {customerName}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff991f] inline-block" /> Internal</span>
                </div>
              </div>

              {/* ── Composer ── */}
              <div className="px-6 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 p-0.5 bg-[#f4f5f7] rounded border border-[#dfe1e6]">
                    <button
                      onClick={() => setIsInternal(false)}
                      className={clsx('px-3 py-1 rounded text-xs font-medium transition-colors', !isInternal ? 'bg-white text-[#0052cc] border border-[#dfe1e6] shadow-sm' : 'text-[#6b778c] hover:text-[#172b4d]')}
                    >
                      Reply to customer
                    </button>
                    <button
                      onClick={() => setIsInternal(true)}
                      className={clsx('px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1', isInternal ? 'bg-[#fff7e6] text-[#ff991f] border border-[#ffe2a8]' : 'text-[#6b778c] hover:text-[#172b4d]')}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Internal note
                    </button>
                  </div>
                  {!isInternal && commentText.trim().length > 0 && (
                    <button
                      onClick={handleEnhance}
                      disabled={enhancing}
                      className="h-7 px-3 rounded border border-[#dfe1e6] text-xs text-[#6b778c] hover:border-[#b3bac5] hover:text-[#172b4d] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {enhancing
                        ? <div className="w-3 h-3 border border-[#6b778c] border-t-transparent rounded-full animate-spin" />
                        : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      }
                      {enhancing ? 'Enhancing…' : 'Enhance'}
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0052cc] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none mt-0.5">
                    {currentUserInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'rounded border bg-white transition-all overflow-hidden',
                      commentFocused
                        ? (isInternal ? 'border-[#ff991f] shadow-[0_0_0_1px_#ff991f]' : 'border-[#0052cc] shadow-[0_0_0_1px_#0052cc]')
                        : 'border-[#dfe1e6] hover:border-[#b3bac5]',
                    )}>
                      <textarea
                        ref={textareaRef}
                        value={commentText}
                        onFocus={() => {
                          setCommentFocused(true);
                          // Fire setInProgress only when status is 'assigned'
                          if (!inProgressFiredRef.current && agentTicketDetail?.status === 'assigned') {
                            inProgressFiredRef.current = true;
                            ticketsService.setInProgress(ticketId!).catch(() => {});
                          }
                        }}
                        onBlur={() => { if (!commentText.trim()) setCommentFocused(false); }}
                        onChange={(e) => {
                          setCommentText(e.target.value);
                          setCommentError('');
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onComment(); }
                        }}
                        placeholder={isInternal ? 'Internal note — only visible to agents…' : 'Write your response to the customer…'}
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
                          className="px-3 py-1.5 rounded bg-[#0052cc] text-white text-sm font-medium hover:bg-[#0065ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                          {isInternal ? 'Save note' : 'Send reply'}
                        </button>
                        <button
                          onClick={() => { setCommentText(''); setCommentError(''); setCommentFocused(false); }}
                          className="px-3 py-1.5 text-[#44546f] text-sm rounded hover:bg-[#ebecf0] transition-colors"
                        >
                          Cancel
                        </button>
                        <span className="ml-auto text-xs text-[#8993a4]">
                          <kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to send
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {merged.length > 0 && <div className="border-t border-[#ebecf0]" />}

              {/* ── Thread ── */}
              <div className="max-h-[400px] overflow-y-auto px-6">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : merged.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-[#8993a4] text-sm">No messages yet on this ticket.</p>
                    <p className="text-[#c1c7d0] text-xs mt-1">Post the first reply above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f1f3]">
                    {merged.map((entry) =>
                      entry.kind === 'message'
                        ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} authorNames={authorNames} customerName={customerName} currentUserId={currentUserId} />
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
    </MainLayout>
  );
};