// src/features/tickets/components/teamlead/TLTicketDetailPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { AgentSLAPanel, BreachJustification } from '../shared/SLAPanel';
import { ApologyModal } from './ApologyModal';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchTLTicket, manualAssignThunk, fetchTeamOverview, fetchProducts } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { tlNav } from './teamleadNav';

interface ConversationItem {
  id: string; author_id: string; author_type: 'customer' | 'agent' | 'team_lead';
  content: string; is_internal: boolean; created_at: string;
}
interface AttachmentItem {
  id: string; file_name: string; file_size: number | null; mime_type: string | null; created_at: string;
}
interface CustomerInfo { full_name: string; email: string; }
interface TeamItem { id: string; name: string; }
type ThreadEntry = { kind: 'message'; data: ConversationItem } | { kind: 'attachment'; data: AttachmentItem };
interface ThreadData { conversations: ConversationItem[]; attachments: AttachmentItem[]; }

const CUSTOMER_SUPPORT_TEAM_NAME = 'Customer Support Team';

const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']);

function formatBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
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

// ✅ TL can only close tickets — not change to any other status
const TL_STATUSES = [
  { value: 'closed', label: 'Closed' },
];

function getInitials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase(); }

// ── SLA status badge ──────────────────────────────────────────────────────────
const SLAStatusBadge: React.FC<{ type: 'met' | 'breached' | 'overdue' }> = ({ type }) => {
  if (type === 'met') return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-semibold">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      Met
    </span>
  );
  if (type === 'breached') return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-semibold">
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
      Breached
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded font-semibold">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Overdue
    </span>
  );
};

// ── ImageModal ─────────────────────────────────────────────────────────────────
const ImageModal: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow text-[#172b4d] hover:bg-[#f4f5f7] z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded shadow-lg object-contain" />
      </div>
    </div>
  );
};

// ── AuthImage ─────────────────────────────────────────────────────────────────
const AuthImage: React.FC<{
  ticketId: string;
  attachmentId: string;
  alt: string;
  className?: string;
  onClick?: (signedUrl: string) => void;
}> = ({ ticketId, attachmentId, alt, className, onClick }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ticketsService
      .getTLAttachmentSignedUrl(ticketId, attachmentId)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, [ticketId, attachmentId]);

  if (err) return (
    <div className={clsx('flex items-center justify-center text-xs text-[#44546f] bg-[#f4f5f7] rounded', className)}>
      Failed
    </div>
  );
  if (!src) return (
    <div className={clsx('flex items-center justify-center bg-[#f4f5f7] rounded', className)}>
      <div className="w-4 h-4 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return (
    <img src={src} alt={alt} className={clsx('object-cover cursor-zoom-in', className)} onClick={() => onClick?.(src)} />
  );
};

// ── openAttachment ────────────────────────────────────────────────────────────
const openAttachment = async (ticketId: string, attachmentId: string) => {
  try {
    const url = await ticketsService.getTLAttachmentSignedUrl(ticketId, attachmentId);
    window.open(url, '_blank', 'noreferrer');
  } catch {
    toast.error('Failed to open attachment');
  }
};

const KV: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-3 min-h-[30px]">
    <span className="w-28 flex-shrink-0 text-xs text-[#8993a4]">{label}</span>
    <div className="flex-1 text-sm text-[#172b4d] min-w-0">{children}</div>
  </div>
);

const TextBubble: React.FC<{ item: ConversationItem; authorNames: Record<string,string>; customerName: string; currentUserId: string }> = ({ item, authorNames, customerName }) => {
  const isAgent = item.author_type === 'agent';
  const isTL = item.author_type === 'team_lead';
  const isInternal = item.is_internal;
  const resolvedName = authorNames[item.author_id];
  let displayName: string, initials: string, bgColor: string;
  if (isTL) { displayName = resolvedName ? `${resolvedName} (team lead)` : 'Team Lead'; initials = resolvedName ? getInitials(resolvedName) : 'TL'; bgColor = 'bg-[#ff991f] text-white'; }
  else if (isAgent) { displayName = resolvedName ? `${resolvedName} (agent)` : 'Agent'; initials = resolvedName ? getInitials(resolvedName) : 'A'; bgColor = isInternal ? 'bg-[#ff991f] text-white' : 'bg-[#0052cc] text-white'; }
  else { displayName = customerName; initials = getInitials(customerName); bgColor = 'bg-[#dfe1e6] text-[#44546f]'; }

  const isBreachNote = item.content.startsWith('[BREACH_JUSTIFICATION:');
  const isApologyNote = item.content.startsWith('[APOLOGY_SENT]');
  const isBulkNote = item.content.startsWith('[BULK_');
  const isUnassignNote = item.content.startsWith('[Unassigned]');
  const isRerouteNote = item.content.startsWith('[REROUTED]');
  const getSystemBadge = () => {
    if (isBreachNote) return { label: 'Breach justification', color: 'text-purple-600 bg-purple-50 border-purple-200' };
    if (isApologyNote) return { label: 'Apology sent', color: 'text-pink-600 bg-pink-50 border-pink-200' };
    if (isBulkNote) return { label: 'Bulk action', color: 'text-teal-600 bg-teal-50 border-teal-200' };
    if (isUnassignNote) return { label: 'Unassigned', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (isRerouteNote) return { label: 'Ticket rerouted', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    return null;
  };
  const badge = getSystemBadge();

  return (
    <div className="flex gap-3 py-4">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5', bgColor)}>{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          {isInternal && <span className="text-[10px] font-medium text-[#ff991f] bg-[#fff7e6] border border-[#ffe2a8] px-1.5 py-0.5 rounded">Internal note</span>}
          {badge && <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded border', badge.color)}>{badge.label}</span>}
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        <div className={clsx('text-sm leading-relaxed whitespace-pre-wrap text-[#172b4d]', isInternal && 'bg-[#fff7e6] border border-[#ffe2a8] rounded px-3 py-2')}>{item.content}</div>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{ att: AttachmentItem; ticketId: string; customerName: string }> = ({ att, ticketId, customerName }) => {
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');

  return (
    <div className="flex gap-3 py-4">
      {modalSrc && <ImageModal src={modalSrc} alt={att.file_name} onClose={() => setModalSrc(null)} />}
      <div className="w-8 h-8 rounded-full bg-[#dfe1e6] flex items-center justify-center text-xs font-bold text-[#44546f] flex-shrink-0 select-none mt-0.5">{getInitials(customerName)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{customerName}</span>
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
        </div>
        {isImg ? (
          <div className="inline-block border border-[#dfe1e6] rounded overflow-hidden hover:border-[#0052cc] transition-colors">
            <AuthImage ticketId={ticketId} attachmentId={att.id} alt={att.file_name} className="w-44 h-44" onClick={(signedUrl) => setModalSrc(signedUrl)} />
          </div>
        ) : (
          <button onClick={() => openAttachment(ticketId, att.id)} className="inline-flex items-center gap-3 px-3 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded hover:bg-[#ebecf0] hover:border-[#b3bac5] transition-all group cursor-pointer">
            <div className="w-8 h-8 bg-white border border-[#dfe1e6] rounded flex items-center justify-center text-base flex-shrink-0">{fileIcon(att.mime_type)}</div>
            <div className="min-w-0">
              <p className="text-sm text-[#172b4d] font-medium truncate max-w-[200px] group-hover:text-[#0052cc] transition-colors">{att.file_name}</p>
              {att.file_size && <p className="text-xs text-[#8993a4] mt-0.5">{formatBytes(att.file_size)}</p>}
            </div>
            <svg className="w-4 h-4 text-[#8993a4] flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

export const TLTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { tlTicketDetail, teamOverview, isLoading, products } = useAppSelector((s) => s.tickets);
  const { user: currentUser } = useAppSelector((s) => s.auth);
  const currentUserId = currentUser?.id ?? '';
  const tlInitials = currentUser?.name ? getInitials(currentUser.name) : 'TL';
  const tlLabel = currentUser?.name ? `${currentUser.name} (team lead)` : 'Team Lead';

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [authorNames, setAuthorNames] = useState<Record<string,string>>({});
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const [showApologyModal, setShowApologyModal] = useState(false);
  const [breachJustifications, setBreachJustifications] = useState<BreachJustification[]>([]);

  // ── Route ticket state (Customer Support TL only) ────────────────────────
  const [allTeams, setAllTeams] = useState<TeamItem[]>([]);
  const [selectedRerouteTeam, setSelectedRerouteTeam] = useState('');
  const [rerouting, setRerouting] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const customerName = customerInfo?.full_name || 'Customer';
  const agentOptions = (teamOverview?.agents ?? []).map((a) => ({ value: String(a.user_id), label: `${a.full_name || 'Agent ' + String(a.user_id).slice(0,8)} (${a.open_tickets} open)` }));
  const responseBreached = !!tlTicketDetail?.response_sla_breached_at;
  const resolutionBreached = !!tlTicketDetail?.sla_breached_at;
  const anyBreached = responseBreached || resolutionBreached;

  const productName = tlTicketDetail?.product_id
    ? products.find((p) => p.id === String(tlTicketDetail.product_id))?.name ?? null
    : null;

  // ── Is this user the Customer Support Team lead? ─────────────────────────
  const isCustomerSupportTL = teamOverview?.team_name === CUSTOMER_SUPPORT_TEAM_NAME;

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      const data = await ticketsService.getTLTicketThread(ticketId);
      setThread(data);
      const names = await ticketsService.resolveUserNames(data.conversations.map((c) => c.author_id));
      setAuthorNames(names);
    } catch { } finally { setThreadLoading(false); }
  };
  const loadCustomerInfo = async () => { if (!ticketId) return; try { setCustomerInfo(await ticketsService.getTLTicketCustomerInfo(ticketId)); } catch { } };
  const loadBreachJustifications = async () => { if (!ticketId) return; try { setBreachJustifications(await ticketsService.getTLBreachJustifications(ticketId)); } catch { } };

  const loadAllTeams = async () => {
    try {
      const teams = await ticketsService.getAllTeams();
      setAllTeams(teams);
    } catch {
      // non-critical, silently ignore
    }
  };

  useEffect(() => {
    if (ticketId) { dispatch(fetchTLTicket(ticketId)); dispatch(fetchTeamOverview()); loadThread(); loadCustomerInfo(); loadBreachJustifications(); }
    dispatch(fetchProducts());
  }, [ticketId, dispatch]);

  useEffect(() => {
    if (isCustomerSupportTL) {
      loadAllTeams();
    }
  }, [isCustomerSupportTL]);

  useEffect(() => { if (tlTicketDetail) setSelectedStatus(tlTicketDetail.status); }, [tlTicketDetail]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);
  useEffect(() => { setShowReasonInput(false); }, [selectedStatus]);

  const merged: ThreadEntry[] = thread
    ? [...thread.conversations.map((c) => ({ kind: 'message' as const, data: c })), ...thread.attachments.map((a) => ({ kind: 'attachment' as const, data: a }))].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onComment = async () => {
    if (!ticketId) return;
    if (!commentText.trim()) { setCommentError('Cannot be empty'); return; }
    try {
      setSending(true); setCommentError('');
      await ticketsService.postTLInternalNote(ticketId, commentText);
      setCommentText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success('Internal note saved'); loadThread(); dispatch(fetchTLTicket(ticketId));
    } catch { toast.error('Failed to post'); } finally { setSending(false); }
  };

  const onStatusUpdate = async () => {
    if (!ticketId || !tlTicketDetail || selectedStatus === tlTicketDetail.status) return;
    try {
      setUpdatingStatus(true);
      await ticketsService.updateTLStatus(ticketId, selectedStatus, statusReason || undefined);
      toast.success('Status updated'); setStatusReason(''); dispatch(fetchTLTicket(ticketId));
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const onAssign = async () => {
    if (!ticketId || !selectedAgent) return;
    try {
      setAssigning(true);
      await dispatch(manualAssignThunk({ ticketId, agent_user_id: selectedAgent })).unwrap();
      toast.success('Ticket assigned'); setSelectedAgent(''); dispatch(fetchTLTicket(ticketId)); dispatch(fetchTeamOverview());
    } catch (err: any) { toast.error(typeof err === 'string' ? err : 'Assignment failed'); }
    finally { setAssigning(false); }
  };

  const onReroute = async () => {
    if (!ticketId || !selectedRerouteTeam) return;
    try {
      setRerouting(true);
      await ticketsService.rerouteTicket(ticketId, selectedRerouteTeam);
      toast.success('Ticket routed successfully. The team lead has been notified.');
      setSelectedRerouteTeam('');
      dispatch(fetchTLTicket(ticketId));
      loadThread();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to route ticket');
    } finally {
      setRerouting(false);
    }
  };

  if (isLoading || !tlTicketDetail) return <MainLayout navItems={tlNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;

  const t = tlTicketDetail;
  const resolvedAgentName = (() => {
    if (!t.assigned_to) return null;
    const agent = (teamOverview?.agents ?? []).find((a) => String(a.user_id) === String(t.assigned_to));
    return agent?.full_name ?? null;
  })();

  // ── SLA state flags ───────────────────────────────────────────────────────
  const responseIsBreached = !!t.response_sla_breached_at;
  const responseIsMet      = !!t.first_response_at && !responseIsBreached;
  const responseIsOverdue  = !t.first_response_at && !responseIsBreached && !!t.sla_response_due && new Date() > new Date(t.sla_response_due);

  const resolveIsBreached = !!t.sla_breached_at;
  const resolveIsMet      = !!t.resolved_at && !resolveIsBreached;
  const resolveIsOverdue  = !t.resolved_at && !resolveIsBreached && !['resolved','closed'].includes(t.status) && !!t.sla_resolve_due && new Date() > new Date(t.sla_resolve_due);

  // Reroute dropdown: exclude Customer Support Team itself
  const rerouteOptions = allTeams.filter((team) => team.name !== CUSTOMER_SUPPORT_TEAM_NAME);

  const col1 = [
    { label: 'Status', node: <StatusBadge status={t.status} /> },
    ...(t.priority ? [{ label: 'Priority', node: <PriorityLabel priority={t.priority} /> }] : []),
    ...(t.severity ? [{ label: 'Severity', node: <span className="flex items-center gap-1.5"><SeverityDot severity={t.severity} /><span className="capitalize">{t.severity}</span></span> }] : []),
    {
      label: 'Cust. priority',
      node: t.customer_priority ? (
        <span className="flex items-center gap-1.5">
          <span className="capitalize">{t.customer_priority}</span>
          {t.priority_overridden && (
            <span className="text-[10px] font-medium text-[#ff991f] bg-[#fff7e6] border border-[#ffe2a8] px-1.5 py-0.5 rounded">Overridden</span>
          )}
        </span>
      ) : <span className="text-[#8993a4]">—</span>,
    },
    { label: 'Assigned', node: !t.assigned_to ? <span className="text-[#ff991f]">Unassigned</span> : <span>{resolvedAgentName ?? `Agent ${String(t.assigned_to).slice(0,8)}…`}</span> },
  ];

  const col2 = [
    ...(productName ? [{ label: 'Product', node: <span>{productName}</span> }] : []),
    ...(t.environment ? [{ label: 'Environment', node: <span className="capitalize">{t.environment}</span> }] : []),
    { label: 'Customer Tier', node: t.tier_snapshot ? <span className="capitalize font-medium">{t.tier_snapshot}</span> : <span className="text-[#8993a4]">—</span> },
    ...(t.source ? [{ label: 'Source', node: <span className="capitalize">{t.source}</span> }] : []),
  ];

  // ── col3: always show due times unchanged; colour + badge when met/breached/overdue ──
  const col3 = [
    { label: 'Raised', node: <span>{format(new Date(t.created_at), 'MMM d, yyyy · h:mm a')}</span> },
    { label: 'Reopens', node: <span>{t.reopen_count}</span> },
    ...(t.sla_response_due ? [{
      label: 'Response due',
      node: (
        <span className={clsx(
          'flex items-center gap-1.5 text-sm flex-wrap',
          responseIsBreached ? 'text-red-600 font-medium' :
          responseIsMet      ? 'text-green-600 font-medium' :
          responseIsOverdue  ? 'text-red-500' :
                               'text-[#172b4d]',
        )}>
          {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
          {responseIsBreached && <SLAStatusBadge type="breached" />}
          {responseIsMet      && <SLAStatusBadge type="met" />}
          {responseIsOverdue  && <SLAStatusBadge type="overdue" />}
        </span>
      ),
    }] : []),
    ...(t.first_response_at ? [{ label: 'First response', node: <span className="text-green-600">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span> }] : []),
    ...(t.sla_resolve_due ? [{
      label: 'Resolve due',
      node: (
        <span className={clsx(
          'flex items-center gap-1.5 text-sm flex-wrap',
          resolveIsBreached ? 'text-red-600 font-medium' :
          resolveIsMet      ? 'text-green-600 font-medium' :
          resolveIsOverdue  ? 'text-red-500' :
                              'text-[#172b4d]',
        )}>
          {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
          {resolveIsBreached && <SLAStatusBadge type="breached" />}
          {resolveIsMet      && <SLAStatusBadge type="met" />}
          {resolveIsOverdue  && <SLAStatusBadge type="overdue" />}
        </span>
      ),
    }] : []),
    ...(t.resolved_at ? [{ label: 'Resolved at', node: <span className="text-green-600">{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span> }] : []),
  ];

  return (
    <MainLayout navItems={tlNav} pageTitle={t.ticket_number}>
      {showApologyModal && <ApologyModal ticketId={t.id} ticketNumber={t.ticket_number} customerName={customerInfo?.full_name} onClose={() => setShowApologyModal(false)} onSent={() => { loadThread(); dispatch(fetchTLTicket(ticketId!)); }} />}

      <div className="h-[calc(100vh-56px)] bg-[#f4f5f7] overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="py-5 space-y-3">
            <div className="px-5">
              <Link to="/tickets/team/all" className="inline-flex items-center gap-2 text-[#44546f] hover:text-[#172b4d] text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Queue
              </Link>
            </div>

            <div className="px-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#44546f] text-xs font-mono mb-0.5">{t.ticket_number}</p>
                <h1 className="text-[#172b4d] text-xl font-semibold leading-snug">{t.title ?? '(No title)'}</h1>
                {customerInfo && <p className="text-[#6b778c] text-xs mt-1">{customerInfo.full_name}{customerInfo.email && <span className="ml-1.5 text-[#8993a4]">· {customerInfo.email}</span>}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {anyBreached && <SLABreachPill />}
                <StatusBadge status={t.status} />
                {anyBreached && (
                  <button onClick={() => resolutionBreached && setShowApologyModal(true)} disabled={!resolutionBreached} title={resolutionBreached ? 'Send apology to customer for resolution SLA breach' : 'Apology is sent only for resolution SLA breach'} className={clsx('h-8 px-3 rounded text-xs font-medium transition-colors flex items-center gap-1.5', resolutionBreached ? 'bg-pink-600 hover:bg-pink-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Send apology
                  </button>
                )}
              </div>
            </div>

            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-3">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-2">Details</p>
                <div className="grid grid-cols-3 gap-0">
                  <div className="flex flex-col gap-0.5 pr-6">{col1.map((kv,i)=><KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
                  <div className="flex flex-col gap-0.5 px-6 border-x border-[#ebecf0]">{col2.map((kv,i)=><KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
                  <div className="flex flex-col gap-0.5 pl-6">{col3.map((kv,i)=><KV key={i} label={kv.label}>{kv.node}</KV>)}</div>
                </div>
              </div>
            </div>

            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-3">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-2">Description</p>
                {t.priority_overridden && t.override_reason && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-[#fff7e6] border border-[#ffe2a8] rounded mb-2">
                    <svg className="w-4 h-4 text-[#ff991f] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <p className="text-xs text-[#172b4d]"><span className="font-semibold text-[#ff991f]">Priority override:</span> {t.override_reason}</p>
                  </div>
                )}
                <p className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">{t.description ?? <span className="text-[#8993a4] italic">No description provided.</span>}</p>
              </div>
            </div>

            <div className="px-5">
              <AgentSLAPanel createdAt={t.created_at} slaResponseDue={t.sla_response_due} slaResolveDue={t.sla_resolve_due} firstResponseAt={t.first_response_at} resolvedAt={t.resolved_at} responseBreachedAt={t.response_sla_breached_at} slaBreachedAt={t.sla_breached_at} onHoldStartedAt={t.on_hold_started_at ?? null} onHoldAccumulated={t.on_hold_duration_accumulated ?? 0} status={t.status} showBreachJustifications breachJustifications={breachJustifications} />
            </div>

            {/* ── Action panels grid ─────────────────────────────────────────── */}
            <div className={clsx(
              'px-5 grid gap-3',
              isCustomerSupportTL ? 'grid-cols-3' : 'grid-cols-2',
            )}>
              {/* Update Status */}
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Update Status</p>
                <div className="flex items-start gap-3">
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors">
                    {t.status !== 'closed' && <option value={t.status} disabled>{t.status.replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase())} (current)</option>}
                    {TL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button onClick={onStatusUpdate} disabled={updatingStatus || selectedStatus === t.status} className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                    {updatingStatus && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                    Apply
                  </button>
                </div>
                <p className="text-xs text-[#8993a4] mt-1.5">Customer will receive an email on status change.</p>
              </div>

              {/* Reassign Agent */}
              <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
                <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Reassign Agent</p>
                <div className="flex items-start gap-3">
                  <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors flex-1">
                    <option value="">Select agent…</option>
                    {agentOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <button onClick={onAssign} disabled={assigning || !selectedAgent} className="h-8 px-4 rounded border border-[#dfe1e6] text-sm text-[#42526e] hover:bg-[#f4f5f7] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                    {assigning && <div className="w-3.5 h-3.5 border border-[#6b778c] border-t-transparent rounded-full animate-spin" />}
                    Assign
                  </button>
                </div>
                <p className="text-xs text-[#8993a4] mt-1.5">Agent will be notified of assignment.</p>
              </div>

              {/* Route Ticket — Customer Support TL only */}
              {isCustomerSupportTL && (
                <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest">Route Ticket</p>
                    <span className="text-[10px] font-medium text-[#0052cc] bg-[#e9f0ff] border border-[#c0d4ff] px-1.5 py-0.5 rounded">CS Team Lead</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <select
                      value={selectedRerouteTeam}
                      onChange={(e) => setSelectedRerouteTeam(e.target.value)}
                      className="h-8 px-2 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none hover:border-[#b3bac5] focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors flex-1"
                    >
                      <option value="">Select team…</option>
                      {rerouteOptions.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={onReroute}
                      disabled={rerouting || !selectedRerouteTeam}
                      className="h-8 px-4 rounded border border-[#0052cc] text-sm text-[#0052cc] hover:bg-[#e9f0ff] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      {rerouting
                        ? <div className="w-3.5 h-3.5 border border-[#0052cc] border-t-transparent rounded-full animate-spin" />
                        : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        )
                      }
                      Route
                    </button>
                  </div>
                  <p className="text-xs text-[#8993a4] mt-1.5">The target team lead will be notified.</p>
                </div>
              )}
            </div>

            <div className="px-5">
              <div className="bg-white border border-[#dfe1e6] rounded flex flex-col overflow-hidden">
                <div className="px-6 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                  <h3 className="text-[#172b4d] text-sm font-semibold">Activity</h3>
                  <div className="flex items-center gap-3 text-xs text-[#8993a4]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0052cc] inline-block" /> Agent</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff991f] inline-block" /> {tlLabel}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#dfe1e6] inline-block" /> {customerName}</span>
                  </div>
                </div>

                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 text-[#ff991f]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <span className="text-xs font-semibold text-[#ff991f] uppercase tracking-widest">Internal Note (Team Lead only)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff991f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none mt-0.5">{tlInitials}</div>
                    <div className="flex-1 min-w-0">
                      <div className={clsx('rounded border bg-white transition-all overflow-hidden', commentFocused ? 'border-[#ff991f] shadow-[0_0_0_1px_#ff991f]' : 'border-[#dfe1e6] hover:border-[#b3bac5]')}>
                        <textarea ref={textareaRef} value={commentText} onFocus={() => setCommentFocused(true)}
                          onChange={(e) => { setCommentText(e.target.value); setCommentError(''); e.target.style.height='auto'; e.target.style.height=`${e.target.scrollHeight}px`; }}
                          onKeyDown={(e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); onComment(); } }}
                          placeholder="Add an internal note visible only to team leads and agents…" rows={commentFocused ? 3 : 1}
                          className="w-full text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-transparent px-3 py-2.5 resize-none outline-none leading-relaxed" style={{ maxHeight: '400px', overflowY: 'auto' }} />
                      </div>
                      {commentError && <p className="text-xs text-[#de350b] mt-1">{commentError}</p>}
                      {commentFocused && (
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={onComment} disabled={sending || !commentText.trim()} className="px-3 py-1.5 rounded bg-[#ff991f] hover:bg-[#ff8b00] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                            {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                            Save note
                          </button>
                          <button onClick={() => { setCommentText(''); setCommentError(''); setCommentFocused(false); }} className="px-3 py-1.5 text-[#44546f] text-sm rounded hover:bg-[#ebecf0] transition-colors">Cancel</button>
                          <span className="ml-auto text-xs text-[#8993a4]"><kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to save</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {merged.length > 0 && <div className="border-t border-[#ebecf0]" />}
                <div className="max-h-[400px] overflow-y-auto px-6">
                  {threadLoading ? (
                    <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" /></div>
                  ) : merged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-[#8993a4] text-sm">No messages yet on this ticket.</p>
                      <p className="text-[#c1c7d0] text-xs mt-1">Post the first internal note above.</p>
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
      </div>
    </MainLayout>
  );
};