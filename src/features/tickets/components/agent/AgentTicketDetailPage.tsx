// src/features/tickets/components/agent/AgentTicketDetailPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, PageLoader, Select } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchAgentTicket, updateAgentStatusThunk } from '../../slices/ticketsSlice';
import { ticketsService } from '../../services/ticketsService';
import { agentNav } from './agentNav';
import { TICKET_STATUSES } from '../../../../config';
import { ticketClient } from '../../../../lib/axios';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id: string;
  author_type: 'customer' | 'agent';
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

  if (err) return <div className={clsx('flex items-center justify-center text-xs text-zinc-500 bg-zinc-800 rounded-xl', className)}>Failed</div>;
  if (!src) return <div className={clsx('flex items-center justify-center bg-zinc-800 rounded-xl', className)}><div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" /></div>;
  return <img src={src} alt={alt} className={clsx('object-cover', className)} />;
};

// ── MetaRow ───────────────────────────────────────────────────────────────────

const MetaRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-2 py-2.5 border-b border-zinc-900 last:border-0">
    <span className="text-xs text-zinc-600 uppercase tracking-widest flex-shrink-0 pt-0.5">{label}</span>
    <div className="text-right">{children}</div>
  </div>
);

// ── AiDraftPanel ──────────────────────────────────────────────────────────────

const AiDraftPanel: React.FC<{ draft: string; onUse: (text: string) => void }> = ({ draft, onUse }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(draft);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDraft(draft);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white flex items-center justify-center flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">AI Draft</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Edit / Cancel toggle */}
          <button
            onClick={isEditing ? handleCancel : () => setIsEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-500 transition-all"
          >
            {isEditing ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </>
            )}
          </button>

          {/* Use button */}
          <button
            onClick={() => onUse(editedDraft)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 border border-indigo-500 text-xs text-white hover:bg-indigo-500 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Use
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editedDraft}
          onChange={e => setEditedDraft(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-200 leading-relaxed resize-none outline-none focus:border-zinc-500 transition-colors"
          style={{ minHeight: '220px' }}
          autoFocus
        />
      ) : (
        <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap border-l-2 border-zinc-700 pl-3">
          {editedDraft}
        </p>
      )}
    </div>
  );
};

// ── Bubbles ────────────────────────────────────────────────────────────────────

const TextBubble: React.FC<{ item: ConversationItem; customerName: string }> = ({ item, customerName }) => {
  const isAgent = item.author_type === 'agent';
  const isInternal = item.is_internal;

  return (
    <div className={clsx('flex gap-2.5', isAgent ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
        isAgent
          ? isInternal ? 'bg-amber-800 text-amber-200' : 'bg-indigo-600 text-white'
          : 'bg-zinc-700 text-zinc-300'
      )}>
        {isAgent ? 'You' : getInitials(customerName)}
      </div>
      <div className={clsx('flex flex-col gap-1 max-w-[78%]', isAgent ? 'items-end' : 'items-start')}>
        {isInternal && (
          <span className="text-[10px] text-amber-500 font-medium px-1 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Internal note
          </span>
        )}
        <div className={clsx(
          'px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isAgent
            ? isInternal
              ? 'bg-amber-950/50 border border-amber-900/50 text-amber-100 rounded-2xl rounded-tr-sm'
              : 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
            : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 rounded-2xl rounded-tl-sm'
        )}>
          {item.content}
        </div>
        <span className="text-[11px] text-zinc-600 px-1">
          {isAgent ? (isInternal ? 'Internal · ' : 'You · ') : `${customerName} · `}
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{ att: AttachmentItem; ticketId: string; customerName: string }> = ({
  att, ticketId, customerName,
}) => {
  const url = ticketsService.getAgentAttachmentUrl(ticketId, att.id);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');

  return (
    <div className="flex gap-2.5 flex-row">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 bg-zinc-700 text-zinc-300">
        {getInitials(customerName)}
      </div>
      <div className="flex flex-col gap-1 items-start">
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="block rounded-xl overflow-hidden border border-zinc-700/60 hover:border-zinc-500 transition-colors">
            <AuthImage url={url} alt={att.file_name} className="w-52 h-52" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 transition-all">
            <span className="text-lg">{fileIcon(att.mime_type)}</span>
            <div className="min-w-0">
              <p className="text-sm truncate max-w-[140px]">{att.file_name}</p>
              {att.file_size && <p className="text-[11px] text-zinc-500">{formatBytes(att.file_size)}</p>}
            </div>
            <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
        <span className="text-[11px] text-zinc-600 px-1">
          {customerName} · {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const AgentTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { agentTicketDetail, isLoading } = useAppSelector((s) => s.tickets);

  const [thread, setThread]               = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [customerInfo, setCustomerInfo]   = useState<CustomerInfo | null>(null);
  const [commentText, setCommentText]     = useState('');
  const [commentError, setCommentError]   = useState('');
  const [sending, setSending]             = useState(false);
  const [isInternal, setIsInternal]       = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason]     = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);


  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const customerName = customerInfo?.full_name || 'Customer';

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      setThread(await ticketsService.getAgentThread(ticketId));
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  };

  const loadCustomerInfo = async () => {
    if (!ticketId) return;
    try {
      const info = await ticketsService.getTicketCustomerInfo(ticketId);
      setCustomerInfo(info);
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchAgentTicket(ticketId));
      loadThread();
      loadCustomerInfo();
    }
  }, [ticketId]);

  useEffect(() => {
    if (agentTicketDetail) setSelectedStatus(agentTicketDetail.status);
  }, [agentTicketDetail]);

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
    if (!commentText.trim()) { setCommentError('Cannot be empty'); return; }
    try {
      setSending(true); setCommentError('');
      await ticketsService.postAgentComment(ticketId, commentText, isInternal);
      setCommentText('');
      // Reset textarea height
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
      toast.success('Status updated — customer notified');
      setStatusReason('');
      dispatch(fetchAgentTicket(ticketId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update status');
    } finally { setUpdatingStatus(false); }
  };

  // Called by AiDraftPanel when agent hits "Use"
  const handleUseDraft = (text: string) => {
    setCommentText(text);
    setIsInternal(false);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      // Reset + re-grow height to match pasted content
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      const len = text.length;
      textareaRef.current.setSelectionRange(len, len);
    }, 50);
    toast.success('Draft pasted — edit and send');
  };

  if (isLoading || !agentTicketDetail) {
    return <MainLayout navItems={agentNav} pageTitle="Ticket Detail"><PageLoader /></MainLayout>;
  }

  const t = agentTicketDetail;

  return (
    <MainLayout navItems={agentNav} pageTitle={t.ticket_number}>
      <div className="flex flex-col h-[calc(100vh-56px)]">

        {/* Back */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <Link to="/tickets/queue" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Queue
          </Link>
        </div>

        <div className="flex flex-1 gap-4 px-5 pb-5 min-h-0 overflow-hidden">

          {/* ── LEFT: Conversation ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-zinc-600">{t.ticket_number}</span>
                <StatusBadge status={t.status} />
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
                <h1 className="text-sm font-semibold text-white ml-1 truncate">{t.title ?? '(No title)'}</h1>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                    {getInitials(customerName)}
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">{customerName}</span>
                  {customerInfo?.email && (
                    <span className="text-xs text-zinc-600">· {customerInfo.email}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> You
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> {customerName}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                    <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Internal
                  </span>
                </div>
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {threadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                </div>
              ) : merged.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">No messages yet</p>
                  <p className="text-xs text-zinc-700 mt-1">Post the first reply below.</p>
                </div>
              ) : (
                merged.map(entry =>
                  entry.kind === 'message'
                    ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} customerName={customerName} />
                    : <AttachmentBubble key={`a-${entry.data.id}`} att={entry.data} ticketId={t.id} customerName={customerName} />
                )
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Composer */}
            <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-zinc-900">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg w-fit mb-3">
                <button
                  onClick={() => setIsInternal(false)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    !isInternal ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Reply to Customer
                </button>
                <button
                  onClick={() => setIsInternal(true)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    isInternal ? 'bg-amber-800 text-amber-100' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Internal Note
                </button>
              </div>

              {commentError && <p className="text-xs text-red-400 mb-1.5 px-1">{commentError}</p>}
              <div className={clsx(
                'flex items-start gap-2 border rounded-xl px-4 py-3 transition-colors',
                isInternal
                  ? 'bg-amber-950/20 border-amber-900/40 focus-within:border-amber-700/60'
                  : 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-600'
              )}>
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={e => {
                    setCommentText(e.target.value);
                    setCommentError('');
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onComment(); } }}
                  placeholder={isInternal ? 'Internal note — only visible to agents…' : 'Write your response to the customer…'}
                  rows={3}
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none leading-relaxed w-full"
                  style={{ minHeight: '72px', maxHeight: '400px', overflowY: 'auto' }}
                />
                <button
                  type="button"
                  onClick={onComment}
                  disabled={sending || !commentText.trim()}
                  className={clsx(
                    'flex-shrink-0 p-1.5 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-0.5',
                    isInternal ? 'bg-amber-700 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-500'
                  )}
                >
                  {sending
                    ? <div className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  }
                </button>
              </div>
              <p className="text-[11px] text-zinc-700 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>

          {/* ── RIGHT: Details panel ── */}
          <div className="w-96 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

              {/* Update Status */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Update Status</p>
                <Select options={INFO_STATUSES} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} />
                {showReasonInput && (
                  <textarea
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Add a note for the customer (optional)…"
                    rows={2}
                    className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none outline-none focus:border-zinc-600 transition-colors"
                  />
                )}
                <Button
                  size="sm"
                  full
                  className="mt-3"
                  loading={updatingStatus}
                  disabled={selectedStatus === t.status}
                  onClick={onStatusUpdate}
                >
                  Apply & Notify Customer
                </Button>
                <p className="text-[10px] text-zinc-700 mt-1.5">Customer will receive an email on status change.</p>
              </div>

              {/* Ticket meta */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Ticket Info</p>
                {t.severity && (
                  <MetaRow label="Severity">
                    <span className="flex items-center gap-1.5 justify-end">
                      <SeverityDot severity={t.severity} />
                      <span className="text-white text-sm capitalize">{t.severity}</span>
                    </span>
                  </MetaRow>
                )}
                {t.priority && (
                  <MetaRow label="Priority"><PriorityLabel priority={t.priority} /></MetaRow>
                )}
                {t.environment && (
                  <MetaRow label="Environment"><span className="text-white text-sm capitalize">{t.environment}</span></MetaRow>
                )}
                <MetaRow label="Source"><span className="text-white text-sm capitalize">{t.source ?? '—'}</span></MetaRow>
                <MetaRow label="Raised"><span className="text-white text-sm">{format(new Date(t.created_at), 'MMM d, yyyy')}</span></MetaRow>
                <MetaRow label="Reopens"><span className="text-white text-sm">{t.reopen_count}</span></MetaRow>
                {t.tier_snapshot && (
                  <MetaRow label="Tier"><span className="text-white text-sm">{t.tier_snapshot}</span></MetaRow>
                )}
                {t.customer_priority && (
                  <MetaRow label="Cust. Priority"><span className="text-white text-sm capitalize">{t.customer_priority}</span></MetaRow>
                )}
                {t.first_response_at && (
                  <MetaRow label="First Response"><span className="text-white text-sm">{format(new Date(t.first_response_at), 'MMM d, h:mm a')}</span></MetaRow>
                )}
                {t.resolved_at && (
                  <MetaRow label="Resolved"><span className="text-white text-sm">{format(new Date(t.resolved_at), 'MMM d, h:mm a')}</span></MetaRow>
                )}
              </div>

              {/* SLA */}
              {(t.sla_response_due || t.sla_resolve_due) && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">SLA</p>
                  {t.sla_response_due && (
                    <MetaRow label="Response Due">
                      <span className={clsx('text-sm font-medium', t.response_sla_breached_at ? 'text-red-400' : 'text-white')}>
                        {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
                        {t.response_sla_breached_at && <span className="block text-[10px] text-red-500">Breached</span>}
                      </span>
                    </MetaRow>
                  )}
                  {t.sla_resolve_due && (
                    <MetaRow label="Resolution Due">
                      <span className={clsx('text-sm font-medium', t.sla_breached_at ? 'text-red-400' : 'text-white')}>
                        {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
                        {t.sla_breached_at && <span className="block text-[10px] text-red-500">Breached</span>}
                      </span>
                    </MetaRow>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Description</p>
                <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {t.description ?? 'No description.'}
                </p>
              </div>

              {/* AI Draft — Edit + Use */}
              {t.ai_draft && (
                <AiDraftPanel draft={t.ai_draft} onUse={handleUseDraft} />
              )}

              {/* Priority override */}
              {t.priority_overridden && t.override_reason && (
                <div className="bg-yellow-950/30 border border-yellow-900 rounded-xl p-4">
                  <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1.5">Priority Override</p>
                  <p className="text-sm text-yellow-300 leading-relaxed">{t.override_reason}</p>
                </div>
              )}
            </div>
        </div>
      </div>
    </MainLayout>
  );
};