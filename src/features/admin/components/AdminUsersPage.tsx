// src/features/admin/components/AdminUsersPage.tsx
import React from 'react';
import { clsx } from 'clsx';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, PageLoader, Badge } from '../../../components/ui';
import { adminNav } from './adminNav';
import { useAdminUsers } from '../hooks/useAdminUsers';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-950 text-purple-400',
  agent: 'bg-blue-950 text-blue-400',
  team_lead: 'bg-cyan-950 text-cyan-400',
  customer: 'bg-zinc-800 text-zinc-400',
};

export const AdminUsersPage: React.FC = () => {
  const { filtered, users, loading, filter, setFilter, deactivate } = useAdminUsers();

  const onDeactivate = async (id: string, email: string) => {
    if (!confirm(`Deactivate ${email}?`)) return;
    try { await deactivate(id); toast.success('User deactivated'); }
    catch { toast.error('Failed'); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Users">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Users</h2>
            <p className="text-zinc-500 text-sm mt-1">{users.length} total</p>
          </div>
        </div>
        <div className="flex gap-1 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 w-fit">
          {['all','admin','agent','team_lead','customer'].map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === r ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')}>
              {r.replace('_',' ')}
            </button>
          ))}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Email</div>
            <div className="w-28 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Role</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-24" />
          </div>
          {loading ? <PageLoader /> : filtered.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{u.email}</p>
                <p className="text-xs text-zinc-600 font-mono">{u.id.slice(0,8)}…</p>
              </div>
              <div className="w-28">
                <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize', ROLE_COLORS[u.role] ?? ROLE_COLORS.customer)}>
                  {u.role.replace('_',' ')}
                </span>
              </div>
              <div className="w-20"><Badge variant={u.is_active ? 'success' : 'default'}>{u.is_active ? 'Active' : 'Off'}</Badge></div>
              <div className="w-24">
                {u.is_active && <Button size="sm" variant="danger" onClick={() => onDeactivate(u.id, u.email)}>Deactivate</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};
