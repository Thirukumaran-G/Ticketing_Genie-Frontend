// src/features/notifications/components/NotificationsPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../layouts/MainLayout';
import { useAppSelector } from '../../../app/store';
import { ROLES } from '../../../config/constants';
import { customerNav } from '../../tickets/components/customer/customerNav';
import { agentNav } from '../../tickets/components/agent/agentNav';
import { tlNav } from '../../tickets/components/teamlead/teamleadNav';
import { notificationsService } from '../services/notificationsService';
import { ENV } from '../../../config/env';

interface Notif {
  id:          string;
  type:        string | null;
  title:       string | null;
  message:     string | null;
  is_read:     boolean;
  is_internal: boolean;
  created_at:  string;
  ticket_id:   string | null;
}

interface Preference {
  user_id:           string;
  preferred_contact: 'email' | 'in_app';
}

const toNotif = (item: {
  id: string; type?: string; title?: string; message?: string;
  is_read: boolean; is_internal: boolean; created_at: string; ticket_id?: string;
}): Notif => ({
  id:          item.id,
  type:        item.type      ?? null,
  title:       item.title     ?? null,
  message:     item.message   ?? null,
  is_read:     item.is_read,
  is_internal: item.is_internal,
  created_at:  item.created_at,
  ticket_id:   item.ticket_id ?? null,
});

const typeColor = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'bg-blue-500';
    case 'ticket_raised':            return 'bg-blue-500';
    case 'ticket_assigned':          return 'bg-green-500';
    case 'ticket_priority_updated':  return 'bg-purple-500';
    case 'ticket_pending':           return 'bg-yellow-500';
    case 'ticket_needs_assign':      return 'bg-orange-500';
    case 'critical_ticket_assigned': return 'bg-red-500';
    case 'sla_breach':               return 'bg-red-500';
    case 'sla_warning':              return 'bg-orange-400';
    case 'sla_escalation_reminder':  return 'bg-red-600';
    case 'sla_breach_justification': return 'bg-purple-500';
    case 'internal_note':            return 'bg-amber-500';
    case 'agent_reply':              return 'bg-blue-400';
    case 'customer_reply':           return 'bg-cyan-500';
    case 'ticket_reopened':          return 'bg-orange-500';
    case 'similar_tickets_detected': return 'bg-indigo-500';
    case 'bulk_assigned':            return 'bg-teal-500';
    case 'apology_message':          return 'bg-pink-500';
    default:                         return 'bg-slate-400';
  }
};

const typeBorderLeft = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'border-l-blue-500';
    case 'ticket_raised':            return 'border-l-blue-500';
    case 'ticket_assigned':          return 'border-l-green-500';
    case 'ticket_priority_updated':  return 'border-l-purple-500';
    case 'ticket_pending':           return 'border-l-yellow-500';
    case 'ticket_needs_assign':      return 'border-l-orange-500';
    case 'critical_ticket_assigned': return 'border-l-red-500';
    case 'sla_breach':               return 'border-l-red-500';
    case 'sla_warning':              return 'border-l-orange-400';
    case 'sla_escalation_reminder':  return 'border-l-red-600';
    case 'sla_breach_justification': return 'border-l-purple-500';
    case 'internal_note':            return 'border-l-amber-500';
    case 'agent_reply':              return 'border-l-blue-400';
    case 'customer_reply':           return 'border-l-cyan-500';
    case 'ticket_reopened':          return 'border-l-orange-500';
    case 'similar_tickets_detected': return 'border-l-indigo-500';
    case 'bulk_assigned':            return 'border-l-teal-500';
    case 'apology_message':          return 'border-l-pink-500';
    default:                         return 'border-l-slate-300';
  }
};

const typeLabel = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'Created';
    case 'ticket_raised':            return 'Ticket Raised';
    case 'ticket_assigned':          return 'Assigned';
    case 'ticket_priority_updated':  return 'Priority Updated';
    case 'ticket_pending':           return 'Pending';
    case 'ticket_needs_assign':      return 'Action Required';
    case 'critical_ticket_assigned': return 'Critical';
    case 'sla_breach':               return 'SLA Breach';
    case 'sla_warning':              return 'SLA Warning';
    case 'sla_escalation_reminder':  return 'Escalation';
    case 'sla_breach_justification': return 'Breach Justification';
    case 'internal_note':            return 'Internal Note';
    case 'agent_reply':              return 'Agent Reply';
    case 'customer_reply':           return 'Customer Reply';
    case 'ticket_reopened':          return 'Reopened';
    case 'similar_tickets_detected': return 'Similar Tickets';
    case 'bulk_assigned':            return 'Bulk Assigned';
    case 'apology_message':          return 'Apology Sent';
    default:                         return 'Notice';
  }
};

// ── Detail Panel ──────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{ notif: Notif; onClose: () => void }> = ({ notif, onClose }) => (
  <div className="flex flex-col h-full bg-white">
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', typeColor(notif.type))} />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest truncate">
          {typeLabel(notif.type)}
        </span>
        {notif.is_internal && (
          <span className="text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 rounded-md flex-shrink-0">
            Internal
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <h3 className="text-base font-semibold text-slate-900 leading-snug">
        {notif.title ?? '—'}
      </h3>
      {notif.message ? (
        <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
          {notif.message}
        </p>
      ) : (
        <p className="text-sm text-slate-400 italic">No message content.</p>
      )}
    </div>

    <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
      <p className="text-xs text-slate-400">
        {format(new Date(notif.created_at), 'MMM d, yyyy · h:mm a')}
      </p>
      {notif.ticket_id && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <span className="font-mono text-slate-500">{notif.ticket_id.slice(0, 8)}…</span>
        </div>
      )}
    </div>
  </div>
);

// ── Empty right state ─────────────────────────────────────────────────────────

const EmptyDetail: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-slate-50/40 text-center px-8">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </div>
    <p className="text-sm font-medium text-slate-500">Nothing selected</p>
    <p className="text-xs text-slate-400 mt-1">Click a notification to view details</p>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const { user, accessToken: token } = useAppSelector((s) => s.auth);
  const role = user?.role ?? '';

  const nav =
    role === ROLES.CUSTOMER  ? customerNav :
    role === ROLES.TEAM_LEAD ? tlNav :
    agentNav;

  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [pref, setPref]               = useState<Preference | null>(null);
  const [loading, setLoading]         = useState(true);
  const [prefLoading, setPrefLoading] = useState(true);
  const [toggling, setToggling]       = useState(false);
  const [selected, setSelected]       = useState<Notif | null>(null);

  const tokenRef = useRef<string | null>(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // FIX: fetchNotifs replaces entire list from DB — always reflects truth
  const fetchNotifs = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifs(data.map(toNotif));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const fetchPref = useCallback(async () => {
    setPrefLoading(true);
    try {
      const data = await notificationsService.getPreference();
      setPref(data);
    } catch { /* silent */ }
    finally { setPrefLoading(false); }
  }, []);

  const togglePref = async () => {
    if (toggling) return;
    setToggling(true);
    try { const data = await notificationsService.togglePreference(); setPref(data); }
    catch { /* silent */ }
    finally { setToggling(false); }
  };

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markRead(id);
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch { /* silent */ }
  }, []);

  const markAllRead = async () => {
    await Promise.all(notifs.filter((n) => !n.is_read).map((n) => markRead(n.id)));
  };

  const openNotif = useCallback((n: Notif) => {
    if (!n.is_read) markRead(n.id);
    setSelected(n);
  }, [markRead]);

  useEffect(() => {
    fetchNotifs();
    fetchPref();

    const pollTimer = setInterval(fetchNotifs, 10_000);

    if (!token) return () => clearInterval(pollTimer);

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (currentToken: string) => {
      if (es) es.close();
      es = new EventSource(
        `${ENV.TICKET_BASE}/notifications/stream?token=${encodeURIComponent(currentToken)}`,
      );
      es.onopen = () => {};
      es.onerror = () => {
        es.close();
        reconnectTimer = setTimeout(() => {
          const t = tokenRef.current;
          if (t) connect(t);
        }, 5_000);
      };

      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const newNotif: Notif = {
            id:          data.id ?? String(Date.now()),
            type:        data.type        ?? null,
            title:       data.title       ?? null,
            message:     data.message     ?? null,
            is_read:     false,
            is_internal: data.is_internal ?? false,
            created_at:  new Date().toISOString(),
            ticket_id:   data.ticket_id   ?? null,
          };
          setNotifs((prev) => {
            // FIX: duplicate guard — if real id already exists skip the push
            // (can happen if poll ran just before SSE fired)
            if (data.id && prev.some((n) => n.id === data.id)) return prev;
            return [newNotif, ...prev];
          });
        } catch { /* bad payload */ }
      });

      es.addEventListener('read_receipt', (e: MessageEvent) => {
        try {
          const { id } = JSON.parse(e.data);
          setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        } catch { /* bad payload */ }
      });

      es.addEventListener('internal_note', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const newNotif: Notif = {
            id:          data.id ?? String(Date.now()),
            type:        'internal_note',
            title:       data.title   ?? 'Internal note',
            message:     data.message ?? null,
            is_read:     false,
            is_internal: true,
            created_at:  new Date().toISOString(),
            ticket_id:   data.ticket_id ?? null,
          };
          setNotifs((prev) => {
            if (data.id && prev.some((n) => n.id === data.id)) return prev;
            return [newNotif, ...prev];
          });
        } catch { /* bad payload */ }
      });
    };

    connect(token);
    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
    };
  }, [token, fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <MainLayout navItems={nav} pageTitle="Notifications">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* ── Left: list ──────────────────────────────────────────────────── */}
        <div className={clsx(
          'flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all duration-200',
          selected ? 'w-[400px] flex-shrink-0' : 'flex-1',
        )}>
          <div className="flex-shrink-0 border-b border-slate-100">
            <div className={clsx(
              'flex items-center justify-between px-6 py-4',
              !selected && 'max-w-3xl mx-auto w-full',
            )}>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!prefLoading && pref && (
                  <button
                    onClick={togglePref}
                    disabled={toggling}
                    className="text-xs text-slate-600 hover:text-blue-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {pref.preferred_contact === 'in_app' ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        In-app · switch to email
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email · switch to in-app
                      </>
                    )}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-slate-600 hover:text-blue-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className={clsx(!selected && 'max-w-3xl mx-auto w-full py-6 px-6')}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                  <p className="text-slate-400 text-xs mt-1">New notifications will appear here in real-time</p>
                </div>
              ) : (
                <div className={clsx(
                  'bg-white overflow-hidden',
                  !selected && 'border border-slate-200 rounded-2xl shadow-sm',
                )}>
                  {notifs.map((n, idx) => (
                    <div
                      key={n.id}
                      onClick={() => openNotif(n)}
                      className={clsx(
                        'flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors border-l-2',
                        idx !== notifs.length - 1 && 'border-b border-slate-100',
                        selected?.id === n.id
                          ? clsx('bg-blue-50/80', typeBorderLeft(n.type))
                          : clsx(
                              'border-l-transparent hover:bg-slate-50',
                              !n.is_read && 'bg-blue-50/40 hover:bg-blue-50/70',
                            ),
                      )}
                    >
                      <div className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', typeColor(n.type))} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            {typeLabel(n.type)}
                          </span>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          n.is_read ? 'text-slate-500' : 'text-slate-900',
                        )}>
                          {n.title ?? '—'}
                        </p>
                        {n.message && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {format(new Date(n.created_at), 'MMM d, yyyy · h:mm a')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: detail panel ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {selected
            ? <DetailPanel notif={selected} onClose={() => setSelected(null)} />
            : <EmptyDetail />
          }
        </div>

      </div>
    </MainLayout>
  );
};