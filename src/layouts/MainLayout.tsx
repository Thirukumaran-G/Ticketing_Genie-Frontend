// src/layouts/MainLayout.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../features/auth';
import { useAppSelector } from '../app/store';
import { notificationsService } from '../features/notifications/services/notificationsService';
import { ENV } from '../config/env';


export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  matchPrefixes?: string[];
}

const Logo = () => (
  <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  </div>
);

const roleLabel: Record<string, string> = {
  customer:  'Customer',
  agent:     'Support Agent',
  team_lead: 'Team Lead',
  admin:     'Admin',
};

const NotifBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true;
  if (item.matchPrefixes) {
    return item.matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    );
  }
  return false;
}

interface SidebarProps {
  navItems:    NavItem[];
  unreadCount: number;
  onClose?:    () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, unreadCount, onClose }) => {
  const location         = useLocation();
  const navigate         = useNavigate();
  const { user, logout } = useAuth();

  const displayName    = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const avatarInitial  = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-blue-950 border-r border-blue-900/50">
      <div className="px-5 py-5 border-b border-blue-900/50">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-white font-bold text-sm leading-none tracking-wide">Ticketing Genie</div>
            <div className="text-blue-300 text-xs mt-0.5">
              {user?.role ? roleLabel[user.role] ?? user.role : ''}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active      = isNavActive(item, location.pathname);
          const isNotifItem = item.path === '/notifications';
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                  : 'text-blue-200 hover:text-white hover:bg-blue-800/50',
              )}
            >
              <span className="flex-shrink-0 w-4">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {isNotifItem && <NotifBadge count={unreadCount} />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-blue-900/50 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-300">{avatarInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{displayName}</div>
            <div className="text-blue-300 text-xs truncate">{user?.email ?? ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:text-white hover:bg-blue-800/50 transition-all duration-150"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
};

interface MainLayoutProps {
  children:   React.ReactNode;
  navItems:   NavItem[];
  pageTitle?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, navItems, pageTitle }) => {
  const [open, setOpen]               = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { accessToken }               = useAppSelector((s) => s.auth);

  const sseRef        = useRef<EventSource | null>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to the latest token so the onerror closure always uses the fresh one
  const tokenRef      = useRef<string | null>(accessToken);

  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch { /* non-critical */ }
  }, []);

  const connectSSE = useCallback((token: string) => {
    // Close any existing connection first
    sseRef.current?.close();
    if (reconnectRef.current) clearTimeout(reconnectRef.current);

    const url = `${ENV.TICKET_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    sseRef.current = es;

    es.addEventListener('notification', () => {
      setUnreadCount((prev) => prev + 1);
    });

    es.addEventListener('read_receipt', () => {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    es.onerror = () => {
      es.close();
      // Always reconnect with the LATEST token from the ref, not the stale closure value.
      // This handles token refresh — if axios refreshed the token while SSE was connected,
      // tokenRef.current will have the new one.
      reconnectRef.current = setTimeout(() => {
        const latestToken = tokenRef.current;
        if (latestToken) connectSSE(latestToken);
      }, 5_000);
    };
  }, []); // no deps — uses tokenRef for fresh token on reconnect

  useEffect(() => {
    fetchCount();
    pollRef.current = setInterval(fetchCount, 60_000);

    if (accessToken) connectSSE(accessToken);

    return () => {
      sseRef.current?.close();
      if (pollRef.current)   clearInterval(pollRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []); // run once on mount

  // When token changes (after silent refresh), reconnect SSE with new token immediately
  useEffect(() => {
    if (!accessToken) return;
    connectSSE(accessToken);
  }, [accessToken, connectSSE]);

  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden md:flex md:flex-col md:w-60 flex-shrink-0">
        <Sidebar navItems={navItems} unreadCount={unreadCount} onClose={undefined} />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar navItems={navItems} unreadCount={unreadCount} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-blue-100 bg-white flex items-center px-4 flex-shrink-0 gap-3 shadow-sm">
          <button className="md:hidden p-2 text-slate-600 hover:text-slate-900" onClick={() => setOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {pageTitle && <h1 className="text-slate-700 font-semibold text-sm truncate">{pageTitle}</h1>}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link
              to="/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors"
              onClick={() => setUnreadCount(0)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};