// src/features/tickets/components/customer/TicketDetailPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchMyTicket, fetchProducts } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { customerNav } from './customerNav';
import { CustomerSLAPanel } from '../shared/SLAPanel';

interface ConversationItem {
  id: string; author_id: string; author_type: 'customer' | 'agent'; content: string; created_at: string;
}
interface AttachmentItem {
  id: string; file_name: string; file_size: number | null; mime_type: string | null; created_at: string;
}
type ThreadEntry = { kind: 'message'; data: ConversationItem } | { kind: 'attachment'; data: AttachmentItem; side: 'customer' | 'agent' };
interface ThreadData { conversations: ConversationItem[]; attachments: AttachmentItem[]; }

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
function getInitials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase(); }
function getTierInfo(tier: string | null | undefined) {
  const t = (tier ?? '').toLowerCase();
  if (t.includes('platinum') || t.includes('enterprise')) return { label: tier!, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' };
  if (t.includes('gold') || t.includes('premium')) return { label: tier!, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  if (t.includes('silver') || t.includes('pro')) return { label: tier!, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
  return { label: tier || 'Standard', color: 'text-[#44546f]', bg: 'bg-[#f4f5f7] border-[#dfe1e6]' };
}

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
      .getCustomerAttachmentSignedUrl(ticketId, attachmentId)
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
    <img
      src={src}
      alt={alt}
      className={clsx('object-cover cursor-zoom-in', className)}
      onClick={() => onClick?.(src)}
    />
  );
};

// ── openAttachment ────────────────────────────────────────────────────────────
const openAttachment = async (ticketId: string, attachmentId: string) => {
  try {
    const url = await ticketsService.getCustomerAttachmentSignedUrl(ticketId, attachmentId);
    window.open(url, '_blank', 'noreferrer');
  } catch {
    toast.error('Failed to open attachment');
  }
};

const TextBubble: React.FC<{ item: ConversationItem; authorNames: Record<string,string>; currentUserId: string; currentUserInitials: string }> = ({ item, authorNames, currentUserInitials }) => {
  const isCustomer = item.author_type === 'customer';
  const resolvedName = authorNames[item.author_id];
  const displayName = isCustomer ? 'You' : (resolvedName ?? 'Support Agent');
  const initials = isCustomer ? currentUserInitials : resolvedName ? getInitials(resolvedName) : 'A';
  return (
    <div className="flex gap-3 py-4">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5', isCustomer ? 'bg-[#0052cc] text-white' : 'bg-[#dfe1e6] text-[#44546f]')}>{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          <span className="text-[#8993a4] text-xs font-normal">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        <div className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">{item.content}</div>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{
  att: AttachmentItem;
  ticketId: string;
  isOwn: boolean;
  authorNames: Record<string,string>;
  currentUserInitials: string;
}> = ({ att, ticketId, isOwn, currentUserInitials }) => {
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');
  const displayName = isOwn ? 'You' : 'Support Agent';
  const initials = isOwn ? currentUserInitials : 'A';

  return (
    <div className="flex gap-3 py-4">
      {modalSrc && <ImageModal src={modalSrc} alt={att.file_name} onClose={() => setModalSrc(null)} />}
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5', isOwn ? 'bg-[#0052cc] text-white' : 'bg-[#dfe1e6] text-[#44546f]')}>{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
        </div>
        {isImg ? (
          <div className="inline-block mt-1 border border-[#dfe1e6] rounded overflow-hidden hover:border-[#0052cc] transition-colors">
            <AuthImage
              ticketId={ticketId}
              attachmentId={att.id}
              alt={att.file_name}
              className="w-44 h-44"
              onClick={(signedUrl) => setModalSrc(signedUrl)}
            />
          </div>
        ) : (
          <button
            onClick={() => openAttachment(ticketId, att.id)}
            className="inline-flex items-center gap-3 mt-1 px-3 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded hover:bg-[#ebecf0] hover:border-[#b3bac5] transition-all group cursor-pointer"
          >
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

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { myTicketDetail, isLoading, products } = useAppSelector((s) => s.tickets);
  const { user: currentUser } = useAppSelector((s) => s.auth);
  const currentUserId = currentUser?.id ?? '';
  const currentUserInitials = currentUser?.name ? getInitials(currentUser.name) : 'C';

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [authorNames, setAuthorNames] = useState<Record<string,string>>({});
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      const data = await ticketsService.getThread(ticketId);
      setThread(data);
      const names = await ticketsService.resolveUserNames(data.conversations.map((c) => c.author_id));
      setAuthorNames(names);
    } catch { } finally { setThreadLoading(false); }
  };

  useEffect(() => {
    if (!myTicketDetail?.assigned_to) { setAssigneeName(null); return; }
    ticketsService.resolveUserNames([myTicketDetail.assigned_to]).then((map) => setAssigneeName(map[myTicketDetail.assigned_to!] ?? null));
  }, [myTicketDetail?.assigned_to]);

  useEffect(() => {
    if (ticketId) { dispatch(fetchMyTicket(ticketId)); loadThread(); }
    if (!products.length) dispatch(fetchProducts());
  }, [ticketId]);

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const merged: ThreadEntry[] = thread
    ? [...thread.conversations.map((c) => ({ kind: 'message' as const, data: c })), ...thread.attachments.map((a) => ({ kind: 'attachment' as const, data: a, side: 'customer' as const }))].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onSend = async () => {
    if (!ticketId) return;
    if (replyText.trim().length < 5) { setReplyError('At least 5 characters required.'); return; }
    try {
      setSending(true); setReplyError('');
      await ticketsService.replyToTicket(ticketId, replyText);
      setReplyText(''); setCommentFocused(false);
      toast.success('Comment added');
      dispatch(fetchMyTicket(ticketId)); loadThread();
    } catch { toast.error('Failed to send'); } finally { setSending(false); }
  };

  const onClose = async () => {
    if (!ticketId) return;
    try {
      setClosing(true);
      await ticketsService.closeTicket(ticketId);
      toast.success('Ticket closed'); dispatch(fetchMyTicket(ticketId));
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Failed to close ticket'); }
    finally { setClosing(false); }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticketId) return;
    try {
      setUploading(true);
      await ticketsService.uploadAttachment(ticketId, file);
      toast.success('File attached'); loadThread();
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  if (isLoading || !myTicketDetail) return <MainLayout navItems={customerNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;

  const t = myTicketDetail;
  const canReplyOrReopen = true;
  const canClose = t.status === 'resolved';
  const productName = t.product_id ? products.find((p) => p.id === String(t.product_id))?.name ?? null : null;
  const tierInfo = t.tier_snapshot ? getTierInfo(t.tier_snapshot) : null;

  // ── SLA nodes: always show the due time, only change colour + add badge when met/overdue ──
  const responseDueNode = (() => {
    if (!t.sla_response_due) return null;
    const due = new Date(t.sla_response_due);
    const met = !!t.first_response_at;
    const overdue = !met && new Date() > due;
    return (
      <span className={clsx('flex items-center gap-1.5 text-sm flex-wrap',
        met ? 'text-[#216e4e]' : overdue ? 'text-[#ae2e24]' : 'text-[#172b4d]'
      )}>
        {format(due, 'MMM d, h:mm a')}
        {met && <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-semibold">Met</span>}
        {overdue && <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded font-semibold">Overdue</span>}
      </span>
    );
  })();

  const resolveDueNode = (() => {
    if (!t.sla_resolve_due) return null;
    const due = new Date(t.sla_resolve_due);
    const met = t.status === 'resolved' || t.status === 'closed';
    const overdue = !met && new Date() > due;
    return (
      <span className={clsx('flex items-center gap-1.5 text-sm flex-wrap',
        met ? 'text-[#216e4e]' : overdue ? 'text-[#ae2e24]' : 'text-[#172b4d]'
      )}>
        {format(due, 'MMM d, h:mm a')}
        {met && <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-semibold">Met</span>}
        {overdue && <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded font-semibold">Overdue</span>}
      </span>
    );
  })();

  return (
    <MainLayout navItems={customerNav} pageTitle={t.ticket_number}>
      <div className="bg-[#f4f5f7] min-h-screen">
        <div className="bg-white border-b border-[#dfe1e6] px-6 py-2.5 flex items-center gap-2">
          <Link to="/tickets/mine" className="text-[#0052cc] hover:underline text-sm flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            My Tickets
          </Link>
          <span className="text-[#dfe1e6]">/</span>
          <span className="text-[#44546f] text-sm font-mono">{t.ticket_number}</span>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#44546f] text-xs font-mono mb-0.5">{t.ticket_number}</p>
              <h1 className="text-[#172b4d] text-xl font-semibold leading-snug">{t.title ?? '(No title)'}</h1>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    if (ticketId) {
                      dispatch(fetchMyTicket(ticketId));
                      loadThread();
                      toast.success('Refreshed');
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#dfe1e6] bg-white text-[#172b4d] text-sm font-medium hover:border-[#b3bac5] hover:bg-[#f4f5f7] transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button type="button" onClick={onClose} disabled={!canClose || closing}
                  title={canClose ? 'Mark this ticket as closed' : `Can only close a resolved ticket (current: ${t.status})`}
                  className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium transition-all', canClose ? 'bg-white border-[#dfe1e6] text-[#172b4d] hover:border-[#b3bac5] hover:bg-[#f4f5f7] cursor-pointer' : 'bg-[#f4f5f7] border-[#dfe1e6] text-[#c1c7d0] cursor-not-allowed')}>
                  {closing ? <div className="w-3.5 h-3.5 border border-[#44546f] border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  Close ticket
                </button>
              </div>
          </div>

          <CustomerSLAPanel createdAt={t.created_at} slaResponseDue={t.sla_response_due} slaResolveDue={t.sla_resolve_due} firstResponseAt={t.first_response_at} resolvedAt={t.resolved_at} responseBreachedAt={t.response_sla_breached_at} slaBreachedAt={t.sla_breached_at} onHoldStartedAt={null} onHoldAccumulated={0} status={t.status} />

          <div className="bg-white border border-[#dfe1e6] rounded overflow-hidden">
            <div className="px-5 py-2.5"><p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest">Details</p></div>
            <div className="grid grid-cols-3 divide-x divide-[#f4f5f7]">
              <div>
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Status</span><StatusBadge status={t.status} /></div>
                {t.priority && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Priority</span><PriorityLabel priority={t.priority} /></div>}
                {t.severity && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">System Severity</span><span className="flex items-center gap-1.5 text-sm text-[#172b4d]"><SeverityDot severity={t.severity} /><span className="capitalize">{t.severity}</span></span></div>}
                {tierInfo && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Tier</span><span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold', tierInfo.bg, tierInfo.color)}><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{tierInfo.label}</span></div>}
                {t.reopen_count > 0 && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Reopens</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fff7e6] border border-[#f3cc4d] text-xs font-semibold text-[#974f0c]"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>{t.reopen_count}×</span></div>}
              </div>
              <div>
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Assignee</span>{t.assigned_to ? assigneeName ? <span className="flex items-center gap-1.5 min-w-0"><div className="w-5 h-5 rounded-full bg-[#dfe1e6] flex items-center justify-center text-[10px] font-bold text-[#44546f] flex-shrink-0">{getInitials(assigneeName)}</div><span className="text-sm text-[#172b4d] truncate">{assigneeName}</span></span> : <span className="text-sm text-[#8993a4]">Loading…</span> : <span className="text-sm text-[#8993a4]">Unassigned</span>}</div>
                {productName && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Product</span><span className="text-sm text-[#172b4d] truncate">{productName}</span></div>}
                {t.environment && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Environment</span><span className="text-sm text-[#172b4d] capitalize">{t.environment}</span></div>}
                {t.customer_priority && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Your severity</span><span className="text-sm text-[#172b4d] capitalize">{t.customer_priority}</span></div>}
              </div>
              <div>
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Raised</span><span className="text-sm text-[#172b4d]">{format(new Date(t.created_at), 'MMM d, yyyy · h:mm a')}</span></div>
                {responseDueNode && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Response due</span>{responseDueNode}</div>}
                {t.first_response_at && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">First response</span><span className="text-sm text-[#216e4e]">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span></div>}
                {resolveDueNode && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Resolve due</span>{resolveDueNode}</div>}
                {t.resolved_at && <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafbfc] transition-colors"><span className="w-20 flex-shrink-0 text-xs text-[#6b778c]">Resolved at</span><span className="text-sm text-[#216e4e]">{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span></div>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
            <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Description</p>
            {t.priority_overridden && t.override_reason && (
              <div className="flex items-start gap-2 px-3 py-2 bg-[#fffae6] border border-[#f3cc4d] rounded mb-3">
                <svg className="w-4 h-4 text-[#974f0c] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <p className="text-xs text-[#172b4d]">{t.override_reason}</p>
              </div>
            )}
            <p className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">{t.description ?? <span className="text-[#8993a4] italic">No description provided.</span>}</p>
          </div>

          <div className="bg-white border border-[#dfe1e6] rounded pb-2">
            <div className="px-6 pt-5 pb-3"><h3 className="text-[#172b4d] text-sm font-semibold">Activity</h3></div>

            {canReplyOrReopen && (
              <div className="px-6 pb-4">
                {t.status === 'closed' && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-[#fffae6] border border-[#f3cc4d] rounded text-xs text-[#974f0c]">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    This ticket is closed. Adding a comment will automatically reopen it.
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#0052cc] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none mt-0.5">{currentUserInitials}</div>
                  <div className="flex-1 min-w-0">
                    <div className={clsx('rounded border bg-white transition-all overflow-hidden', commentFocused ? 'border-[#0052cc] shadow-[0_0_0_1px_#0052cc]' : 'border-[#dfe1e6] hover:border-[#b3bac5]', replyError && !commentFocused && 'border-[#ff7452]')}>
                      {commentFocused && (
                        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#ebecf0] bg-[#fafbfc]">
                          <button type="button" title="Bold" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg></button>
                          <button type="button" title="Italic" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
                          <div className="w-px h-4 bg-[#dfe1e6] mx-1" />
                          <button type="button" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors disabled:opacity-40">
                            {uploading ? <div className="w-3.5 h-3.5 border border-[#0052cc] border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                          </button>
                        </div>
                      )}
                      <textarea ref={textareaRef} value={replyText} onFocus={() => setCommentFocused(true)} onChange={(e) => { setReplyText(e.target.value); setReplyError(''); }} onKeyDown={(e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={t.status === 'closed' ? 'Add a comment to reopen this ticket…' : 'Add a comment…'} rows={commentFocused ? 5 : 1} className="w-full text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-transparent px-3 py-2.5 resize-none outline-none leading-relaxed" />
                    </div>
                    {replyError && <p className="text-xs text-[#ae2e24] mt-1 px-0.5">{replyError}</p>}
                    {commentFocused && (
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button" onClick={onSend} disabled={sending || replyText.trim().length < 5} className="px-3 py-1.5 bg-[#0052cc] text-white text-sm font-medium rounded hover:bg-[#0747a6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                          {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                          {t.status === 'closed' ? 'Send & reopen' : 'Save'}
                        </button>
                        <button type="button" onClick={() => { setReplyText(''); setReplyError(''); setCommentFocused(false); }} className="px-3 py-1.5 text-[#44546f] text-sm rounded hover:bg-[#ebecf0] transition-colors">Cancel</button>
                        <span className="ml-auto text-xs text-[#8993a4]"><kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to save</span>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                  </div>
                </div>
              </div>
            )}

            {canReplyOrReopen && merged.length > 0 && <div className="border-t border-[#ebecf0]" />}

            <div className="px-6">
              {threadLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" /></div>
              ) : merged.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <p className="text-[#8993a4] text-sm">No comments yet on this issue.</p>
                  <p className="text-[#c1c7d0] text-xs mt-1">An agent will respond shortly.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f0f1f3]">
                  {merged.map((entry) =>
                    entry.kind === 'message'
                      ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} authorNames={authorNames} currentUserId={currentUserId} currentUserInitials={currentUserInitials} />
                      : <AttachmentBubble key={`a-${entry.data.id}`} att={entry.data} ticketId={t.id} isOwn={entry.side === 'customer'} authorNames={authorNames} currentUserInitials={currentUserInitials} />
                  )}
                </div>
              )}
              <div ref={threadEndRef} />
            </div>
          </div>
          <div className="h-4" />
        </div>
      </div>
    </MainLayout>
  );
};