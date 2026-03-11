import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout';
import { Spinner } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';

const PRI_COLORS: Record<string, { bar: string; text: string }> = {
  P0: { bar: 'bg-red-500',    text: 'text-red-400'    },
  P1: { bar: 'bg-orange-500', text: 'text-orange-400' },
  P2: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  P3: { bar: 'bg-blue-500',   text: 'text-blue-400'   },
};

const StatCard: React.FC<{ label: string; value: string | number; accent?: string }> = ({
  label, value, accent = 'text-white',
}) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col gap-2">
    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{label}</p>
    <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const [byPriority, setByPriority] = useState<{ priority: string; count: number }[]>([]);
  const [frt, setFrt]               = useState<{ average_first_response_time_min: number; median_first_response_time_min: number } | null>(null);
  const [totalBreaches, setBreaches] = useState(0);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      adminTicketService.reportOpenByPriority(),
      adminTicketService.reportFirstResponseTime(),
      adminTicketService.reportSLABreachesByDay(),
    ]).then(([p, f, d]) => {
      setByPriority(p.open_tickets_by_priority);
      setFrt(f);
      setBreaches(d.sla_breaches_by_day.reduce((s, r) => s + r.breach_count, 0));
    }).finally(() => setLoading(false));
  }, []);

  const totalOpen = byPriority.reduce((s, r) => s + r.count, 0);
  const maxCount  = Math.max(...byPriority.map(r => r.count), 1);

  const quickLinks = [
    ['/admin/companies',      'Companies'],
    ['/admin/products',       'Products'],
    ['/admin/users',          'Users'],
    ['/admin/teams',          'Teams'],
    ['/admin/sla-rules',      'SLA Rules'],
    ['/admin/severity-map',   'Sev/Pri Map'],
    ['/admin/keyword-rules',  'Keyword Rules'],
    ['/admin/product-config', 'Product Config'],
    ['/admin/email-config',   'Email Config'],
    ['/admin/reports',        'Reports'],
  ];

  return (
    <MainLayout navItems={adminNav} pageTitle="Dashboard">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-1">System-wide overview</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Open Tickets"         value={totalOpen} />
              <StatCard label="Total SLA Breaches"   value={totalBreaches} accent="text-red-400" />
              <StatCard label="Avg First Response"   value={frt ? `${Math.round(frt.average_first_response_time_min)}m` : '—'} />
              <StatCard label="Median First Response" value={frt ? `${Math.round(frt.median_first_response_time_min)}m` : '—'} />
            </div>

            {/* Priority breakdown */}
            {byPriority.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">
                  Open Tickets by Priority
                </h3>
                <div className="space-y-3">
                  {['P0','P1','P2','P3'].map(p => {
                    const row   = byPriority.find(r => r.priority === p);
                    const count = row?.count ?? 0;
                    const pct   = (count / maxCount) * 100;
                    const c     = PRI_COLORS[p];
                    return (
                      <div key={p} className="flex items-center gap-4">
                        <span className={`w-8 text-xs font-bold tabular-nums ${c.text}`}>{p}</span>
                        <div className="flex-1 bg-zinc-900 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full flex items-center justify-end pr-3 text-xs font-bold text-white transition-all duration-500 ${c.bar}`}
                            style={{ width: `${pct}%`, minWidth: count > 0 ? '2.5rem' : 0 }}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </div>
                        <span className="w-8 text-xs text-zinc-500 text-right tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {quickLinks.map(([path, label]) => (
                <Link
                  key={path}
                  to={path}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 text-sm font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-between group"
                >
                  {label}
                  <svg className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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