// src/features/tickets/components/customer/TicketDetailPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchMyTicket, fetchProducts } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { customerNav } from './customerNav';
import { ticketClient } from '../../../../lib/axios';

interface ConversationItem {
  id: string;
  author_type: 'customer' | 'agent';
  content: string;
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
  | { kind: 'attachment'; data: AttachmentItem; side: 'customer' | 'agent' };

interface ThreadData {
  conversations: ConversationItem[];
  attachments: AttachmentItem[];
}

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

function getTierInfo(tier: string | null | undefined) {
  const t = (tier ?? '').toLowerCase();
  if (t.includes('platinum') || t.includes('enterprise'))
    return { label: tier!, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' };
  if (t.includes('gold') || t.includes('premium'))
    return { label: tier!, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  if (t.includes('silver') || t.includes('pro'))
    return { label: tier!, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
  return { label: tier || 'Standard', color: 'text-[#44546f]', bg: 'bg-[#f4f5f7] border-[#dfe1e6]' };
}

function getResponseDeadlineLabel(
  createdAt: string,
  slaResponseDue: string | undefined | null,
  firstResponseAt: string | undefined | null,
  responseBreachedAt: string | undefined | null,
) {
  if (firstResponseAt) {
    const mins = differenceInMinutes(new Date(firstResponseAt), new Date(createdAt));
    const hrs = Math.floor(mins / 60);
    const label = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    return { text: 'Agent responded', sub: `within ${label}`, color: 'text-[#216e4e]', icon: 'check' as const };
  }
  if (responseBreachedAt)
    return { text: 'Response overdue', sub: 'Our team has been alerted', color: 'text-[#ae2e24]', icon: 'warning' as const };
  if (slaResponseDue) {
    const now = new Date(), due = new Date(slaResponseDue), created = new Date(createdAt);
    const totalMin = differenceInMinutes(due, created);
    const totalHrs = Math.round(totalMin / 60);
    const remainMins = differenceInMinutes(due, now);
    const remainHrs = Math.floor(remainMins / 60);
    if (remainMins < 0)
      return { text: 'Response overdue', sub: 'Our team has been alerted', color: 'text-[#ae2e24]', icon: 'warning' as const };
    const windowLabel = totalHrs > 0 ? `${totalHrs}h` : `${totalMin}m`;
    const remainLabel = remainHrs > 0 ? `${remainHrs}h ${remainMins % 60}m remaining` : `${remainMins}m remaining`;
    return { text: `Response within ${windowLabel}`, sub: remainLabel, color: remainMins < 60 ? 'text-[#974f0c]' : 'text-[#172b4d]', icon: 'clock' as const };
  }
  return { text: 'Our team will respond shortly', color: 'text-[#44546f]', icon: 'clock' as const };
}

// ── AuthImage ──────────────────────────────────────────────────────────────────
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

// ── KV pair ────────────────────────────────────────────────────────────────────
const KV: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-3 min-h-[30px]">
    <span className="w-24 flex-shrink-0 text-xs text-[#8993a4]">{label}</span>
    <div className="flex-1 text-sm text-[#172b4d] min-w-0">{children}</div>
  </div>
);

// ── Jira-style comment ─────────────────────────────────────────────────────────
const TextBubble: React.FC<{ item: ConversationItem; agentName: string | null }> = ({ item, agentName }) => {
  const isCustomer = item.author_type === 'customer';
  const displayName = isCustomer ? 'You' : (agentName ?? 'Support Agent');
  const initials = isCustomer
    ? 'Y'
    : agentName ? agentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'A';

  return (
    <div className="flex gap-3 py-4">
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5',
        isCustomer ? 'bg-[#0052cc] text-white' : 'bg-[#dfe1e6] text-[#44546f]'
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          <span className="text-[#8993a4] text-xs font-normal">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{ att: AttachmentItem; ticketId: string; isOwn: boolean; agentName: string | null }> = ({
  att, ticketId, isOwn, agentName,
}) => {
  const url = ticketsService.getAttachmentUrl(ticketId, att.id);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');
  const displayName = isOwn ? 'You' : (agentName ?? 'Support Agent');
  const initials = isOwn ? 'Y' : (agentName ? agentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'A');

  return (
    <div className="flex gap-3 py-4">
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none mt-0.5',
        isOwn ? 'bg-[#0052cc] text-white' : 'bg-[#dfe1e6] text-[#44546f]'
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#172b4d] text-sm font-semibold">{displayName}</span>
          <span className="text-[#8993a4] text-xs">{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
        </div>
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-block mt-1 border border-[#dfe1e6] rounded overflow-hidden hover:border-[#0052cc] transition-colors">
            <AuthImage url={url} alt={att.file_name} className="w-44 h-44" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-3 mt-1 px-3 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded hover:bg-[#ebecf0] hover:border-[#b3bac5] transition-all group">
            <div className="w-8 h-8 bg-white border border-[#dfe1e6] rounded flex items-center justify-center text-base flex-shrink-0">
              {fileIcon(att.mime_type)}
            </div>
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
export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { myTicketDetail, isLoading, products } = useAppSelector((s) => s.tickets);

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [commentFocused, setCommentFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadThread = async () => {
    if (!ticketId) return;
    try { setThreadLoading(true); setThread(await ticketsService.getThread(ticketId)); }
    catch { /* silent */ }
    finally { setThreadLoading(false); }
  };

  const loadAgentName = async () => {
    if (!ticketId) return;
    try {
      const data = await ticketsService.getTicketAgentInfo(ticketId);
      if (data?.assigned && data?.agent_name) setAgentName(data.agent_name);
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    if (ticketId) { dispatch(fetchMyTicket(ticketId)); loadThread(); loadAgentName(); }
    if (!products.length) dispatch(fetchProducts());
  }, [ticketId]);

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const merged: ThreadEntry[] = thread
    ? [
        ...thread.conversations.map(c => ({ kind: 'message' as const, data: c })),
        ...thread.attachments.map(a => ({ kind: 'attachment' as const, data: a, side: 'customer' as const })),
      ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onSend = async () => {
    if (!ticketId) return;
    if (replyText.trim().length < 5) { setReplyError('At least 5 characters required.'); return; }
    try {
      setSending(true); setReplyError('');
      await ticketsService.replyToTicket(ticketId, replyText);
      setReplyText(''); setCommentFocused(false);
      toast.success('Comment added');
      loadThread();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticketId) return;
    try {
      setUploading(true);
      await ticketsService.uploadAttachment(ticketId, file);
      toast.success('File attached');
      loadThread();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  if (isLoading || !myTicketDetail) {
    return <MainLayout navItems={customerNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;
  }

  const t = myTicketDetail;
  const canReply = !['closed', 'resolved'].includes(t.status);
  const productName = t.product_id ? products.find(p => p.id === String(t.product_id))?.name ?? null : null;
  const tierInfo = t.tier_snapshot ? getTierInfo(t.tier_snapshot) : null;
  const responseInfo = getResponseDeadlineLabel(t.created_at, t.sla_response_due, t.first_response_at, t.response_sla_breached_at);
  const slaBg = { check: 'bg-[#e3fcef] border-[#57d9a3]', warning: 'bg-[#ffebe6] border-[#ff7452]', clock: 'bg-[#deebff] border-[#4c9aff]' };

  const leftKVs: { label: string; node: React.ReactNode }[] = [
    { label: 'Status', node: <StatusBadge status={t.status} /> },
    ...(t.priority ? [{ label: 'Priority', node: <PriorityLabel priority={t.priority} /> }] : []),
    ...(t.severity ? [{ label: 'Severity', node: <span className="flex items-center gap-1.5"><SeverityDot severity={t.severity} /><span className="capitalize">{t.severity}</span></span> }] : []),
    ...(tierInfo ? [{ label: 'Support Tier', node: <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold', tierInfo.bg, tierInfo.color)}><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{tierInfo.label}</span> }] : []),
  ];

  const rightKVs: { label: string; node: React.ReactNode }[] = [
    {
      label: 'Assignee', node: agentName ? (
        <span className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#dfe1e6] flex items-center justify-center text-[10px] font-bold text-[#44546f] flex-shrink-0">
            {agentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span>{agentName}</span>
        </span>
      ) : <span className="text-[#8993a4]">Unassigned</span>
    },
    ...(productName ? [{ label: 'Product', node: <span>{productName}</span> }] : []),
    ...(t.environment ? [{ label: 'Environment', node: <span className="capitalize">{t.environment}</span> }] : []),
    { label: 'Raised', node: <span>{format(new Date(t.created_at), 'MMM d, yyyy')}</span> },
  ];

  return (
    <MainLayout navItems={customerNav} pageTitle={t.ticket_number}>
      {/* ── Whole page scrolls naturally ── */}
      <div className="bg-[#f4f5f7] min-h-screen">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-[#dfe1e6] px-6 py-2.5 flex items-center gap-2">
          <Link to="/tickets/mine" className="text-[#0052cc] hover:underline text-sm flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            My Tickets
          </Link>
          <span className="text-[#dfe1e6]">/</span>
          <span className="text-[#44546f] text-sm font-mono">{t.ticket_number}</span>
        </div>

        {/* Page content — uniform padding, natural stacking */}
        <div className="px-6 py-6 flex flex-col gap-4">

          {/* Title */}
          <div>
            <p className="text-[#44546f] text-xs font-mono mb-0.5">{t.ticket_number}</p>
            <h1 className="text-[#172b4d] text-xl font-semibold leading-snug">{t.title ?? '(No title)'}</h1>
          </div>

          {/* SLA banner */}
          <div className={clsx('flex items-center gap-2.5 px-4 py-2 rounded border text-sm', slaBg[responseInfo.icon])}>
            <span className={responseInfo.color}>
              {responseInfo.icon === 'check' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
              {responseInfo.icon === 'warning' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {responseInfo.icon === 'clock' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </span>
            <span className={clsx('font-medium', responseInfo.color)}>{responseInfo.text}</span>
            {responseInfo.sub && <span className="text-[#44546f]">— {responseInfo.sub}</span>}
          </div>

          {/* Details */}
          <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
            <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Details</p>
            <div className="flex gap-0">
              <div className="flex-1 flex flex-col gap-0.5 pr-6">
                {leftKVs.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}
              </div>
              <div className="w-px bg-[#ebecf0] flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-0.5 pl-6">
                {rightKVs.map((kv, i) => <KV key={i} label={kv.label}>{kv.node}</KV>)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">
            <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest mb-3">Description</p>
            {t.priority_overridden && t.override_reason && (
              <div className="flex items-start gap-2 px-3 py-2 bg-[#fffae6] border border-[#f3cc4d] rounded mb-3">
                <svg className="w-4 h-4 text-[#974f0c] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-[#172b4d]">{t.override_reason}</p>
              </div>
            )}
            <p className="text-[#172b4d] text-sm leading-relaxed whitespace-pre-wrap">
              {t.description ?? <span className="text-[#8993a4] italic">No description provided.</span>}
            </p>
          </div>

          {/* ── Activity — no inner scroll, grows with content ── */}
          <div className="bg-white border border-[#dfe1e6] rounded pb-2">

            {/* Header */}
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-[#172b4d] text-sm font-semibold">Activity</h3>
            </div>

            {/* Add comment box */}
            {canReply && (
              <div className="px-6 pb-4">
                <div className="flex gap-3 items-start">
                  {/* Your avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#0052cc] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none mt-0.5">
                    Y
                  </div>

                  {/* Editor */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'rounded border bg-white transition-all overflow-hidden',
                      commentFocused
                        ? 'border-[#0052cc] shadow-[0_0_0_1px_#0052cc]'
                        : 'border-[#dfe1e6] hover:border-[#b3bac5]',
                      replyError && !commentFocused && 'border-[#ff7452]'
                    )}>
                      {/* Formatting toolbar */}
                      {commentFocused && (
                        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#ebecf0] bg-[#fafbfc]">
                          <button type="button" title="Bold" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
                          </button>
                          <button type="button" title="Italic" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                          </button>
                          <button type="button" title="Underline" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
                          </button>
                          <div className="w-px h-4 bg-[#dfe1e6] mx-1" />
                          <button type="button" title="Bullet list" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
                          </button>
                          <button type="button" title="Numbered list" className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                          </button>
                          <div className="w-px h-4 bg-[#dfe1e6] mx-1" />
                          <button
                            type="button"
                            title="Attach file"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="p-1.5 rounded hover:bg-[#ebecf0] text-[#44546f] transition-colors disabled:opacity-40 flex items-center gap-1"
                          >
                            {uploading
                              ? <div className="w-3.5 h-3.5 border border-[#0052cc] border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            }
                          </button>
                        </div>
                      )}

                      {/* Textarea */}
                      <textarea
                        ref={textareaRef}
                        value={replyText}
                        onFocus={() => setCommentFocused(true)}
                        onChange={e => { setReplyText(e.target.value); setReplyError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        placeholder="Add a comment…"
                        rows={commentFocused ? 3 : 1}
                        className="w-full text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-transparent px-3 py-2.5 resize-none outline-none leading-relaxed"
                      />
                    </div>

                    {replyError && <p className="text-xs text-[#ae2e24] mt-1 px-0.5">{replyError}</p>}

                    {/* Save / Cancel */}
                    {commentFocused && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={onSend}
                          disabled={sending || replyText.trim().length < 5}
                          className="px-3 py-1.5 bg-[#0052cc] text-white text-sm font-medium rounded hover:bg-[#0747a6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReplyText(''); setReplyError(''); setCommentFocused(false); }}
                          className="px-3 py-1.5 text-[#44546f] text-sm rounded hover:bg-[#ebecf0] transition-colors"
                        >
                          Cancel
                        </button>
                        <span className="ml-auto text-xs text-[#8993a4]">
                          <kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5 text-[10px]">Enter</kbd> to save
                        </span>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            {canReply && merged.length > 0 && (
              <div className="border-t border-[#ebecf0]" />
            )}

            {/* ── Comments list — no scroll, grows naturally ── */}
            <div className="px-6">
              {threadLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : merged.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <p className="text-[#8993a4] text-sm">No comments yet on this issue.</p>
                  <p className="text-[#c1c7d0] text-xs mt-1">An agent will respond shortly.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f0f1f3]">
                  {merged.map(entry =>
                    entry.kind === 'message'
                      ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} agentName={agentName} />
                      : <AttachmentBubble key={`a-${entry.data.id}`} att={entry.data} ticketId={t.id} isOwn={entry.side === 'customer'} agentName={agentName} />
                  )}
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

          </div>

          {/* Bottom padding */}
          <div className="h-4" />

        </div>
      </div>
    </MainLayout>
  );
};