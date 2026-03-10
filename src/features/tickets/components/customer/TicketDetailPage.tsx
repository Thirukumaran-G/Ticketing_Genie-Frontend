import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { PageLoader } from '../../../../components/ui/index';
import { StatusBadge, SeverityDot, PriorityLabel, SLABreachPill } from '../shared/TicketBadges';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { fetchMyTicket } from '../../slices/ticketsSlice';
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

  if (err) return (
    <div className={clsx('flex items-center justify-center text-xs text-zinc-500 bg-zinc-800 rounded-xl', className)}>
      Failed to load
    </div>
  );
  if (!src) return (
    <div className={clsx('flex items-center justify-center bg-zinc-800 rounded-xl', className)}>
      <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
    </div>
  );
  return <img src={src} alt={alt} className={clsx('object-cover', className)} />;
};

// ── MetaRow ───────────────────────────────────────────────────────────────────

const MetaRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-2 py-2.5 border-b border-zinc-900 last:border-0">
    <span className="text-xs text-zinc-600 uppercase tracking-widest flex-shrink-0 pt-0.5">{label}</span>
    <div className="text-right">{children}</div>
  </div>
);

// ── Bubbles ────────────────────────────────────────────────────────────────────

const TextBubble: React.FC<{ item: ConversationItem }> = ({ item }) => {
  const isOwn = item.author_type === 'customer';
  return (
    <div className={clsx('flex gap-2.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
        isOwn ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300'
      )}>
        {isOwn ? 'You' : 'A'}
      </div>
      <div className={clsx('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start', 'max-w-[78%]')}>
        <div className={clsx(
          'px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isOwn
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
            : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 rounded-2xl rounded-tl-sm'
        )}>
          {item.content}
        </div>
        <span className="text-[11px] text-zinc-600 px-1">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

const AttachmentBubble: React.FC<{ att: AttachmentItem; ticketId: string; isOwn: boolean }> = ({
  att, ticketId, isOwn,
}) => {
  const url = ticketsService.getAttachmentUrl(ticketId, att.id);
  const isImg = IMAGE_TYPES.has(att.mime_type ?? '');

  return (
    <div className={clsx('flex gap-2.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
        isOwn ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300'
      )}>
        {isOwn ? 'You' : 'A'}
      </div>
      <div className={clsx('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="block rounded-xl overflow-hidden border border-zinc-700/60 hover:border-zinc-500 transition-colors">
            <AuthImage url={url} alt={att.file_name} className="w-52 h-52" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className={clsx(
            'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all',
            isOwn
              ? 'bg-blue-700/40 border-blue-600/30 hover:bg-blue-700/60 text-white rounded-tr-sm'
              : 'bg-zinc-800/80 border-zinc-700/60 hover:border-zinc-500 text-zinc-200 rounded-tl-sm'
          )}>
            <span className="text-lg">{fileIcon(att.mime_type)}</span>
            <div className="min-w-0">
              <p className="text-sm truncate max-w-[140px]">{att.file_name}</p>
              {att.file_size && <p className="text-[11px] opacity-50">{formatBytes(att.file_size)}</p>}
            </div>
            <svg className="w-3.5 h-3.5 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
        <span className="text-[11px] text-zinc-600 px-1">
          {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const dispatch = useAppDispatch();
  const { myTicketDetail, isLoading } = useAppSelector((s) => s.tickets);

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const loadThread = async () => {
    if (!ticketId) return;
    try {
      setThreadLoading(true);
      setThread(await ticketsService.getThread(ticketId));
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  };

  useEffect(() => {
    if (ticketId) { dispatch(fetchMyTicket(ticketId)); loadThread(); }
  }, [ticketId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const merged: ThreadEntry[] = thread
    ? [
        ...thread.conversations.map(c => ({ kind: 'message' as const, data: c })),
        ...thread.attachments.map(a => ({ kind: 'attachment' as const, data: a, side: 'customer' as const })),
      ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())
    : [];

  const onSend = async () => {
    if (!ticketId) return;
    if (replyText.trim().length < 5) { setReplyError('At least 5 characters'); return; }
    try {
      setSending(true); setReplyError('');
      await ticketsService.replyToTicket(ticketId, replyText);
      setReplyText('');
      toast.success('Reply sent');
      loadThread();
    } catch { toast.error('Failed to send reply'); }
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

  return (
    <MainLayout navItems={customerNav} pageTitle={t.ticket_number}>
      {/* Full-height flex container */}
      <div className="flex flex-col h-[calc(100vh-56px)]">

        {/* Back nav */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <Link
            to="/tickets/mine"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            My Tickets
          </Link>
        </div>

        {/* Main two-column layout — fills remaining height */}
        <div className="flex flex-1 gap-4 px-5 pb-5 min-h-0 overflow-hidden">

          {/* ── LEFT: Conversation (dominant) ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Conversation header */}
            <div className="px-5 py-3.5 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-600">{t.ticket_number}</span>
                <StatusBadge status={t.status} />
                {(t.sla_breached_at || t.response_sla_breached_at) && <SLABreachPill />}
                <h1 className="text-sm font-semibold text-white ml-1 truncate">{t.title ?? '(No title)'}</h1>
              </div>
            </div>

            {/* Thread — scrollable, fills all available height */}
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
                  <p className="text-xs text-zinc-700 mt-1">An agent will respond shortly.</p>
                </div>
              ) : (
                merged.map(entry =>
                  entry.kind === 'message'
                    ? <TextBubble key={`m-${entry.data.id}`} item={entry.data} />
                    : <AttachmentBubble key={`a-${entry.data.id}`} att={entry.data} ticketId={t.id} isOwn={entry.side === 'customer'} />
                )
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Reply bar — pinned to bottom */}
            {canReply && (
              <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-zinc-900">
                {replyError && <p className="text-xs text-red-400 mb-1.5 px-1 pt-1">{replyError}</p>}
                <div className={clsx(
                  'flex items-end gap-2 border rounded-xl px-4 py-3 mt-2 transition-colors',
                  replyError ? 'border-red-800 bg-zinc-900' : 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-600'
                )}>
                  <textarea
                    value={replyText}
                    onChange={e => { setReplyText(e.target.value); setReplyError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    placeholder="Reply to this ticket…"
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none max-h-32 leading-relaxed"
                  />
                  {/* Attach */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Attach file"
                    className="flex-shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-40"
                  >
                    {uploading
                      ? <div className="w-4 h-4 border border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    }
                  </button>
                  {/* Send */}
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={sending || replyText.trim().length < 5}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {sending
                      ? <div className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    }
                  </button>
                </div>
                <p className="text-[11px] text-zinc-700 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Ticket details panel ── */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

            {/* Ticket meta */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Ticket Info</p>

              <MetaRow label="Status">
                <StatusBadge status={t.status} />
              </MetaRow>

              {t.severity && (
                <MetaRow label="Severity">
                  <span className="flex items-center gap-1.5 justify-end">
                    <SeverityDot severity={t.severity} />
                    <span className="text-white text-sm capitalize">{t.severity}</span>
                  </span>
                </MetaRow>
              )}

              {t.priority && (
                <MetaRow label="Priority">
                  <PriorityLabel priority={t.priority} />
                </MetaRow>
              )}

              {t.environment && (
                <MetaRow label="Environment">
                  <span className="text-white text-sm capitalize">{t.environment}</span>
                </MetaRow>
              )}

              <MetaRow label="Raised">
                <span className="text-white text-sm">{format(new Date(t.created_at), 'MMM d, yyyy')}</span>
              </MetaRow>
            </div>

            {/* SLA */}
            {(t.sla_response_due || t.sla_resolve_due) && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">SLA</p>

                {t.sla_response_due && (
                  <MetaRow label="Response Due">
                    <span className={clsx('text-sm font-medium', t.response_sla_breached_at ? 'text-red-400' : 'text-white')}>
                      {format(new Date(t.sla_response_due), 'MMM d, h:mm a')}
                      {t.response_sla_breached_at && (
                        <span className="block text-[10px] text-red-500 mt-0.5">Breached</span>
                      )}
                    </span>
                  </MetaRow>
                )}

                {t.sla_resolve_due && (
                  <MetaRow label="Resolution Due">
                    <span className={clsx('text-sm font-medium', t.sla_breached_at ? 'text-red-400' : 'text-white')}>
                      {format(new Date(t.sla_resolve_due), 'MMM d, h:mm a')}
                      {t.sla_breached_at && (
                        <span className="block text-[10px] text-red-500 mt-0.5">Breached</span>
                      )}
                    </span>
                  </MetaRow>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Description</p>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                {t.description ?? 'No description provided.'}
              </p>
            </div>

            {/* Priority override notice */}
            {t.priority_overridden && t.override_reason && (
              <div className="bg-yellow-950/30 border border-yellow-900 rounded-xl p-4">
                <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1.5">Priority updated</p>
                <p className="text-sm text-yellow-300 leading-relaxed">{t.override_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};