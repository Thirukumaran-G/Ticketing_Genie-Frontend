// src/features/admin/components/AdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout';
import { Spinner } from '../../../components/ui/index';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-white' }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const [byPriority, setByPriority] = useState<Record<string, number> | null>(null);
  const [frt, setFrt] = useState<{ avg_minutes: number; median_minutes: number } | null>(null);
  const [slaBreaches, setSlaBreaches] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminTicketService.reportOpenByPriority(),
      adminTicketService.reportFirstResponseTime(),
      adminTicketService.reportSLABreachesByDay(),
    ]).then(([p, f, s]) => { setByPriority(p); setFrt(f); setSlaBreaches(s); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalOpen = byPriority ? Object.values(byPriority).reduce((a, b) => (a as number) + (b as number), 0) : 0;
  const totalBreaches = slaBreaches ? Object.values(slaBreaches).reduce((a, b) => (a as number) + (b as number), 0) : 0;

  return (
    <MainLayout navItems={adminNav} pageTitle="Dashboard">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-1">System-wide overview</p>
        </div>
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Open Tickets" value={totalOpen} />
              <StatCard label="SLA Breaches" value={totalBreaches} color="text-red-400" />
              <StatCard label="Avg First Response" value={frt ? `${Math.round(frt.avg_minutes)}m` : '—'} />
              <StatCard label="Median First Response" value={frt ? `${Math.round(frt.median_minutes)}m` : '—'} />
            </div>
            {byPriority && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Open by Priority</h3>
                <div className="grid grid-cols-4 gap-3">
                  {['P0','P1','P2','P3'].map((p) => {
                    const c: Record<string,string> = { P0:'text-red-400', P1:'text-orange-400', P2:'text-yellow-400', P3:'text-blue-400' };
                    return (
                      <div key={p} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 text-center">
                        <p className={`text-2xl font-bold ${c[p]}`}>{byPriority[p] ?? 0}</p>
                        <p className="text-xs text-zinc-500 mt-1">{p}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ['/admin/companies','Companies'],
                ['/admin/users','Users'],
                ['/admin/teams','Teams'],
                ['/admin/sla-rules','SLA Rules'],
                ['/admin/keyword-rules','Keyword Rules'],
                ['/admin/reports','Reports'],
              ].map(([path, label]) => (
                <Link key={path} to={path}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 text-sm font-medium text-zinc-300 hover:text-white transition-all flex items-center justify-between">
                  {label}
                  <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};
