// src/features/tickets/components/agent/AgentGroupedTicketPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../../layouts/MainLayout';
import { StatusBadge, PriorityLabel, SeverityDot } from '../shared/TicketBadges';
import { useAppSelector } from '../../../../app/store';
import { ticketsService } from '../../services/ticketsService';
import { agentNav } from './agentNav';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChildConversation {
  id:          string;
  author_id:   string;
  author_type: string;
  content:     string;
  is_internal: boolean;
  created_at:  string;
}

interface ChildTicket {
  ticket_id:     string;
  ticket_number: string;
  title:         string | null;
  status:        string;
  customer_id:   string;
  priority:      string | null;
  severity:      string | null;
  created_at:    string;
  conversations: ChildConversation[];
}

interface ParentTicket {
  ticket_id:       string;
  ticket_number:   string;
  title:           string | null;
  status:          string;
  priority:        string | null;
  severity:        string | null;
  sla_resolve_due: string | null;
  child_count:     number;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Child Ticket Card ─────────────────────────────────────────────────────────

const ChildTicketCard: React.FC<{
  child:          ChildTicket;
  parentTicketId: string;
  customerNames:  Record<string, string>;
  onReplySent:    () => void;
  agentInitials:  string;
}> = ({ child, parentTicketId, customerNames, onReplySent, agentInitials }) => {
  const [expanded, setExpanded]   = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  const customerName = customerNames[child.customer_id] || 'Customer';
  const lastMessage  = child.conversations
    .filter((c) => !c.is_internal)
    .at(-1);
  const hasUnread = child.conversations.length > 0 &&
    child.conversations.at(-1)?.author_type === 'customer';

  const onSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      setSending(true);
      await ticketsService.replyToChildTicket(
        parentTicketId,
        child.ticket_id,
        replyText,
      );
      setReplyText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success(`Reply sent to ${customerName}`);
      onReplySent();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={clsx(
      'bg-white border rounded-xl overflow-hidden transition-all',
      hasUnread ? 'border-blue-300 shadow-sm' : 'border-[#dfe1e6]',
    )}>
      {/* Card header */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#fafbfc] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Customer avatar */}
        <div className="w-8 h-8 rounded-full bg-[#dfe1e6] flex items-center justify-center text-xs font-bold text-[#44546f] flex-shrink-0 select-none">
          {getInitials(customerName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#172b4d]">{customerName}</span>
            <span className="text-xs font-mono text-[#44546f]">{child.ticket_number}</span>
            {child.priority && <PriorityLabel priority={child.priority} />}
            <StatusBadge status={child.status} />
            {hasUnread && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                New reply
              </span>
            )}
          </div>
          {lastMessage && (
            <p className="text-xs text-[#44546f] truncate mt-0.5">
              {lastMessage.author_type === 'customer' ? '💬 ' : '↩ '}
              {lastMessage.content.slice(0, 80)}
              {lastMessage.content.length > 80 ? '…' : ''}
            </p>
          )}
          {!lastMessage && (
            <p className="text-xs text-[#8993a4] mt-0.5 italic">No messages yet</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#8993a4]">
            {child.conversations.length} message{child.conversations.length !== 1 ? 's' : ''}
          </span>
          <svg
            className={clsx('w-4 h-4 text-[#44546f] transition-transform', expanded && 'rotate-180')}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded conversation */}
      {expanded && (
        <div className="border-t border-[#ebecf0]">
          {/* Conversation thread */}
          <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto bg-[#fafbfc]">
            {child.conversations.length === 0 ? (
              <p className="text-xs text-[#8993a4] text-center py-4">
                No messages yet on this ticket.
              </p>
            ) : (
              child.conversations
                .filter((c) => !c.is_internal)
                .map((conv) => {
                  const isAgent = conv.author_type === 'agent';
                  return (
                    <div key={conv.id} className={clsx('flex gap-2', isAgent && 'flex-row-reverse')}>
                      <div className={clsx(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                        isAgent ? 'bg-[#0052cc] text-white' : 'bg-[#dfe1e6] text-[#44546f]',
                      )}>
                        {isAgent ? agentInitials : getInitials(customerName)}
                      </div>
                      <div className={clsx(
                        'max-w-[75%] px-3 py-2 rounded-lg text-xs leading-relaxed',
                        isAgent
                          ? 'bg-[#0052cc] text-white rounded-tr-none'
                          : 'bg-white border border-[#dfe1e6] text-[#172b4d] rounded-tl-none',
                      )}>
                        <p className="whitespace-pre-wrap">{conv.content}</p>
                        <p className={clsx(
                          'text-[10px] mt-1',
                          isAgent ? 'text-blue-200 text-right' : 'text-[#8993a4]',
                        )}>
                          {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Reply box */}
          <div className="px-4 py-3 border-t border-[#ebecf0] bg-white">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0052cc] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                {agentInitials}
              </div>
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendReply();
                    }
                  }}
                  placeholder={`Reply to ${customerName}…`}
                  rows={1}
                  className="w-full text-xs text-[#172b4d] placeholder:text-[#8993a4] bg-[#f4f5f7] border border-[#dfe1e6] rounded px-3 py-2 resize-none outline-none focus:border-[#0052cc] focus:bg-white transition-colors"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={onSendReply}
                    disabled={sending || !replyText.trim()}
                    className="h-6 px-3 rounded bg-[#0052cc] text-white text-xs font-medium hover:bg-[#0065ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    {sending && (
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    Send
                  </button>
                  <span className="text-[10px] text-[#8993a4]">
                    <kbd className="border border-[#dfe1e6] bg-[#f4f5f7] rounded px-1 py-0.5">Enter</kbd> to send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AgentGroupedTicketPage: React.FC = () => {
  const { ticketId: rawTicketId } = useParams<{ ticketId: string }>();
  const navigate  = useNavigate();
  const { user }  = useAppSelector((s) => s.auth);

  // Normalise undefined → null once; used everywhere below
  const ticketId: string | null = rawTicketId ?? null;

  const agentInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  // ── All hooks must be declared before any conditional return ──────────────
  const [parentTicket, setParentTicket]     = useState<ParentTicket | null>(null);
  const [children, setChildren]             = useState<ChildTicket[]>([]);
  const [customerNames, setCustomerNames]   = useState<Record<string, string>>({});
  const [loading, setLoading]               = useState(true);
  const [resolveOpen, setResolveOpen]       = useState(false);
  const [resolveMsg, setResolveMsg]         = useState('');
  const [resolving, setResolving]           = useState(false);

  const loadData = useCallback(async () => {
    if (!ticketId) return;
    try {
      const ticket = await ticketsService.getAgentTicket(ticketId);
      setParentTicket({
        ticket_id:       ticket.id,
        ticket_number:   ticket.ticket_number,
        title:           ticket.title           ?? null,
        status:          ticket.status,
        priority:        ticket.priority        ?? null,
        severity:        ticket.severity        ?? null,
        sla_resolve_due: ticket.sla_resolve_due ?? null,
        child_count:     0,
      });

      const childData = await ticketsService.getGroupedTicketChildren(ticketId);
      setChildren(childData);

      setParentTicket((prev) =>
        prev ? { ...prev, child_count: childData.length } : prev,
      );

      const customerIds = childData.map((c: ChildTicket) => c.customer_id);
      if (customerIds.length > 0) {
        const names = await ticketsService.resolveUserNames(customerIds);
        setCustomerNames(names);
      }
    } catch (err: any) {
      toast.error('Failed to load grouped ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Conditional returns AFTER all hooks ───────────────────────────────────

  if (!ticketId) {
    return (
      <MainLayout navItems={agentNav} pageTitle="Grouped Ticket">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[#44546f]">Ticket ID is required.</p>
          <button
            onClick={() => navigate('/tickets/agent/grouped')}
            className="text-xs text-[#0052cc] hover:underline"
          >
            ← Back to grouped tickets
          </button>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout navItems={agentNav} pageTitle="Grouped Ticket">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!parentTicket) {
    return (
      <MainLayout navItems={agentNav} pageTitle="Grouped Ticket">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[#44546f]">Ticket not found.</p>
          <button
            onClick={() => navigate('/tickets/agent/grouped')}
            className="text-xs text-[#0052cc] hover:underline"
          >
            ← Back to grouped tickets
          </button>
        </div>
      </MainLayout>
    );
  }

  // ── Handlers (ticketId is guaranteed string here) ─────────────────────────

  const onResolveParent = async () => {
    if (!resolveMsg.trim()) return;
    try {
      setResolving(true);
      await ticketsService.updateAgentStatus(ticketId, 'resolved', resolveMsg);
      toast.success('Parent resolved — all child tickets auto-resolved');
      setResolveOpen(false);
      navigate('/tickets/agent/grouped');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to resolve');
    } finally {
      setResolving(false);
    }
  };

  const hasUnresolvedChildren = children.some(
    (c) => !['resolved', 'closed'].includes(c.status),
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout navItems={agentNav} pageTitle={parentTicket.ticket_number}>

      {/* Resolve modal */}
      {resolveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setResolveOpen(false); }}
        >
          <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dfe1e6]">
              <h3 className="text-[#172b4d] text-sm font-semibold">Resolve ticket</h3>
              <p className="text-[#6b778c] text-xs mt-0.5">
                {children.length + 1} customers will be notified
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
                Resolution message <span className="text-[#de350b]">*</span>
              </label>
              <textarea
                value={resolveMsg}
                onChange={(e) => setResolveMsg(e.target.value)}
                placeholder="Describe what the issue was and how it was fixed…"
                rows={4}
                autoFocus
                className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
              />
              <p className="text-xs text-[#8993a4] mt-1">
                Sent to every customer on their own ticket.
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-end gap-2">
              <button
                onClick={() => setResolveOpen(false)}
                disabled={resolving}
                className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onResolveParent}
                disabled={resolving || resolveMsg.trim().length < 10}
                className="h-8 px-4 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {resolving && (
                  <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                )}
                Resolve & notify all
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-56px)] bg-[#f4f5f7] overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-5xl mx-auto py-5 px-5 space-y-4">

            {/* Header banner */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🔑</span>
                    <span className="text-xs font-mono text-[#44546f]">
                      {parentTicket.ticket_number}
                    </span>
                    {parentTicket.priority && (
                      <PriorityLabel priority={parentTicket.priority} />
                    )}
                    <StatusBadge status={parentTicket.status} />
                  </div>
                  <h1 className="text-[#172b4d] text-lg font-semibold">
                    {parentTicket.title ?? '(No title)'}
                  </h1>
                  <p className="text-amber-700 text-xs mt-1 font-medium">
                    This ticket represents{' '}
                    <strong>{children.length + 1} customers</strong> reporting the same issue.
                    Resolving it will automatically close all {children.length} related tickets.
                  </p>
                  {parentTicket.sla_resolve_due && (
                    <p className="text-xs text-[#6b778c] mt-1">
                      Resolve by:{' '}
                      <span className="font-medium text-[#172b4d]">
                        {format(new Date(parentTicket.sla_resolve_due), 'MMM d, h:mm a')}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/tickets/agent/${ticketId}`}
                    className="h-8 px-3 rounded border border-[#dfe1e6] bg-white text-xs text-[#42526e] hover:bg-[#f4f5f7] transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View full ticket
                  </Link>
                  {hasUnresolvedChildren && (
                    <button
                      onClick={() => setResolveOpen(true)}
                      className="h-8 px-4 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Resolve all ({children.length + 1})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-[#dfe1e6] rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[#172b4d]">{children.length + 1}</p>
                <p className="text-xs text-[#6b778c] mt-0.5">Total customers</p>
              </div>
              <div className="bg-white border border-[#dfe1e6] rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {children.filter((c) => !['resolved', 'closed'].includes(c.status)).length}
                </p>
                <p className="text-xs text-[#6b778c] mt-0.5">Open tickets</p>
              </div>
              <div className="bg-white border border-[#dfe1e6] rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {children.filter(
                    (c) => c.conversations.at(-1)?.author_type === 'customer',
                  ).length}
                </p>
                <p className="text-xs text-[#6b778c] mt-0.5">Awaiting reply</p>
              </div>
            </div>

            {/* Section label */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#44546f] uppercase tracking-widest text-[11px]">
                Customer Conversations
              </h2>
              <button
                onClick={loadData}
                className="h-6 px-2 rounded border border-[#dfe1e6] bg-white text-[10px] text-[#42526e] hover:bg-[#f4f5f7] transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Child tickets */}
            {children.length === 0 ? (
              <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-12 text-center">
                <p className="text-[#44546f] text-sm">No child tickets found.</p>
                <p className="text-[#8993a4] text-xs mt-1">
                  This is the only ticket in the group.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...children]
                  .sort((a, b) => {
                    const aWaiting = a.conversations.at(-1)?.author_type === 'customer' ? 0 : 1;
                    const bWaiting = b.conversations.at(-1)?.author_type === 'customer' ? 0 : 1;
                    return aWaiting - bWaiting;
                  })
                  .map((child) => (
                    <ChildTicketCard
                      key={child.ticket_id}
                      child={child}
                      parentTicketId={ticketId}
                      customerNames={customerNames}
                      onReplySent={loadData}
                      agentInitials={agentInitials}
                    />
                  ))
                }
              </div>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  );
};