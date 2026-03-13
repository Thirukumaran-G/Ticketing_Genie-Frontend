// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../features/auth';

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
  customer:   'Customer',
  agent:      'Support Agent',
  team_lead:  'Team Lead',
  admin:      'Admin',
};

interface SidebarProps {
  navItems: NavItem[];
  onClose?: () => void;
}

function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true;
  if (item.matchPrefixes) {
    return item.matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    );
  }
  return false;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, onClose }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-blue-950 border-r border-blue-900/50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-blue-900/50">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-white font-bold text-sm leading-none tracking-wide">Ticketing Genie</div>
            <div className="text-blue-300 text-xs mt-0.5">
              {user?.role ? roleLabel[user.role] : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isNavActive(item, location.pathname);
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-blue-900/50 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-300">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name || 'User'}</div>
            <div className="text-blue-300 text-xs truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:text-white hover:bg-blue-800/50 transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
};

interface MainLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  pageTitle?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, navItems, pageTitle }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-60 flex-shrink-0">
        <Sidebar navItems={navItems} />
      </div>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar navItems={navItems} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-blue-100 bg-white flex items-center px-4 flex-shrink-0 gap-3 shadow-sm">
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {pageTitle && <h1 className="text-slate-700 font-semibold text-sm">{pageTitle}</h1>}
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
