// src/features/admin/components/AdminReportsPage.tsx
import React from 'react';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Spinner } from '../../../components/ui';
import { adminNav } from './adminNav';
import { useAdminReports } from '../hooks/useAdminReports';

const PRI_COLORS: Record<string, string> = {
  P0: 'bg-red-500', P1: 'bg-orange-500', P2: 'bg-yellow-500', P3: 'bg-blue-500',
};

const BarChart: React.FC<{ data: Record<string, unknown>; colorMap?: Record<string, string> }> = ({ data, colorMap }) => {
  const entries = Object.entries(data).sort((a, b) => (b[1] as number) - (a[1] as number));
  const max = Math.max(...entries.map(([, v]) => v as number), 1);
  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <div className="w-20 text-xs text-zinc-400 font-mono text-right">{key}</div>
          <div className="flex-1 bg-zinc-900 rounded-full h-5 overflow-hidden">
            <div className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold text-white transition-all ${colorMap?.[key] ?? 'bg-zinc-600'}`}
              style={{ width: `${((val as number) / max) * 100}%`, minWidth: (val as number) > 0 ? '2rem' : 0 }}>
              {val as number}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Section: React.FC<{ title: string; sub: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
    <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-zinc-500 mb-5">{sub}</p>
    {children}
  </div>
);

export const AdminReportsPage: React.FC = () => {
  // All data fetching in hook
  const { byPriority, byDay, frt, byProduct, loading, refresh } = useAdminReports();

  return (
    <MainLayout navItems={adminNav} pageTitle="Reports">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Reports</h2>
            <p className="text-zinc-500 text-sm mt-1">Live data from the ticket service</p>
          </div>
          <Button size="sm" variant="secondary" onClick={refresh}>↻ Refresh</Button>
        </div>
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Open Tickets by Priority" sub="Current open tickets grouped by priority">
              {byPriority && Object.keys(byPriority).length > 0
                ? <BarChart data={byPriority} colorMap={PRI_COLORS} />
                : <p className="text-zinc-600 text-sm">No data</p>}
            </Section>
            <Section title="First Response Time" sub="Average and median time to first agent reply">
              {frt ? (
                <div className="grid grid-cols-2 gap-4">
                  {[['avg', frt.avg_minutes], ['median', frt.median_minutes]].map(([label, val]) => (
                    <div key={label as string} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 text-center">
                      <p className="text-3xl font-bold text-white">{Math.round(val as number)}</p>
                      <p className="text-xs text-zinc-500 mt-1">{label} minutes</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-zinc-600 text-sm">No data</p>}
            </Section>
            <Section title="SLA Breaches by Day" sub="Number of SLA breaches per day">
              {byDay && Object.keys(byDay).length > 0
                ? <BarChart data={byDay} />
                : <p className="text-zinc-600 text-sm">No breaches recorded</p>}
            </Section>
            <Section title="Tickets by Product" sub="Total ticket volume per product">
              {byProduct && Object.keys(byProduct).length > 0
                ? <BarChart data={byProduct} />
                : <p className="text-zinc-600 text-sm">No data</p>}
            </Section>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
