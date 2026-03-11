import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { MainLayout } from '../../../layouts/MainLayout';
import { useAppSelector } from '../../../app/store';
import { ROLES } from '../../../config/constants';
import { customerNav } from '../../tickets/components/customer/customerNav';
import { agentNav } from '../../tickets/components/agent/agentNav';
import { tlNav } from '../../tickets/components/teamlead/teamleadNav';
import { notificationsService } from '../services/notificationsService';

interface Notif {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  ticket_id: string | null;
}

interface Preference {
  user_id: string;
  preferred_contact: 'email' | 'in_app';
}

const typeColor = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'bg-blue-500';
    case 'ticket_assigned':          return 'bg-green-500';
    case 'ticket_pending':           return 'bg-yellow-500';
    case 'ticket_needs_assign':      return 'bg-orange-500';
    case 'critical_ticket_assigned': return 'bg-red-500';
    default:                         return 'bg-zinc-600';
  }
};

const typeBorder = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'border-blue-500/30';
    case 'ticket_assigned':          return 'border-green-500/30';
    case 'ticket_pending':           return 'border-yellow-500/30';
    case 'ticket_needs_assign':      return 'border-orange-500/30';
    case 'critical_ticket_assigned': return 'border-red-500/30';
    default:                         return 'border-zinc-700';
  }
};

const typeLabel = (type: string | null) => {
  switch (type) {
    case 'ticket_created':           return 'Created';
    case 'ticket_assigned':          return 'Assigned';
    case 'ticket_pending':           return 'Pending';
    case 'ticket_needs_assign':      return 'Action Required';
    case 'critical_ticket_assigned': return 'Critical';
    default:                         return 'Notice';
  }
};

// ── Modal ─────────────────────────────────────────────────────────────────────

const NotifModal: React.FC<{ notif: Notif; onClose: () => void }> = ({ notif, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div className={clsx(
        'w-full max-w-md bg-zinc-950 border rounded-2xl shadow-2xl overflow-hidden',
        typeBorder(notif.type)
      )}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', typeColor(notif.type))} />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              {typeLabel(notif.type)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-5 space-y-3">
          <h3 className="text-sm font-semibold text-white leading-snug">
            {notif.title ?? '—'}
          </h3>
          {notif.message && (
            <p className="text-sm text-zinc-400 whitespace-pre-line leading-relaxed">
              {notif.message}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            {format(new Date(notif.created_at), 'MMM d, yyyy · h:mm a')}
          </span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const { user, token } = useAppSelector((s) => s.auth);
  const role            = user?.role ?? '';

  const nav =
    role === ROLES.CUSTOMER  ? customerNav :
    role === ROLES.TEAM_LEAD ? tlNav :
    agentNav;

  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [pref, setPref]               = useState<Preference | null>(null);
  const [loading, setLoading]         = useState(true);
  const [prefLoading, setPrefLoading] = useState(true);
  const [toggling, setToggling]       = useState(false);
  const [sseStatus, setSseStatus]     = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [selected, setSelected]       = useState<Notif | null>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifs(data);
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
    try {
      const data = await notificationsService.togglePreference();
      setPref(data);
    } catch { /* silent */ }
    finally { setToggling(false); }
  };

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markRead(id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch { /* silent */ }
  }, []);

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markRead(n.id)));
  };

  // Click row → mark read + open modal only, no navigation
  const openNotif = useCallback((n: Notif) => {
    if (!n.is_read) markRead(n.id);
    setSelected(n);
  }, [markRead]);

  useEffect(() => {
    fetchNotifs();
    fetchPref();

    if (!token) return;

    const url = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    let es: EventSource;

    const connect = () => {
      es = new EventSource(url);
      setSseStatus('connecting');

      es.onopen  = () => setSseStatus('connected');
      es.onerror = () => {
        setSseStatus('error');
        es.close();
        setTimeout(connect, 5000);
      };

      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setNotifs((prev) => [
            {
              id:         data.id ?? String(Date.now()),
              type:       data.type ?? null,
              title:      data.title ?? null,
              message:    data.message ?? null,
              is_read:    false,
              created_at: new Date().toISOString(),
              ticket_id:  data.ticket_id ?? null,
            },
            ...prev,
          ]);
        } catch { /* bad payload */ }
      });

      es.addEventListener('read_receipt', (e: MessageEvent) => {
        try {
          const { id } = JSON.parse(e.data);
          setNotifs((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
          );
        } catch { /* bad payload */ }
      });
    };

    connect();
    return () => { es?.close(); };
  }, [token]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const isInApp     = pref?.preferred_contact === 'in_app';

  return (
    <MainLayout navItems={nav} pageTitle="Notifications">
      <div className="p-6 max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Notifications</h2>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-800 rounded-lg px-3 py-2"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* ── List ── */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : notifs.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">No notifications yet</p>
              <p className="text-zinc-700 text-xs mt-1">New notifications will appear here in real-time</p>
            </div>
          ) : (
            notifs.map((n, idx) => (
              <div
                key={n.id}
                onClick={() => openNotif(n)}
                className={clsx(
                  'flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer',
                  idx !== notifs.length - 1 && 'border-b border-zinc-900',
                  n.is_read
                    ? 'hover:bg-zinc-900/20'
                    : 'bg-zinc-900/40 hover:bg-zinc-900/60'
                )}
              >
                <div className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', typeColor(n.type))} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      {typeLabel(n.type)}
                    </span>
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={clsx(
                    'text-sm font-medium truncate',
                    n.is_read ? 'text-zinc-400' : 'text-white'
                  )}>
                    {n.title ?? '—'}
                  </p>
                  {n.message && (
                    <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">
                      {n.message}
                    </p>
                  )}
                  <p className="text-xs text-zinc-700 mt-1">
                    {format(new Date(n.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <NotifModal
          notif={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </MainLayout>
  );
};