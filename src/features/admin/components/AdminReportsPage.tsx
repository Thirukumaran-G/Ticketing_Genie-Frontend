import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { MainLayout } from '../../../layouts/MainLayout';
import { PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SeverityRow    { severity: string; count: number; }
interface StatusRow      { status: string; count: number; }
interface ResolutionTime { avg_resolution_time_min: number; min_resolution_time_min: number; max_resolution_time_min: number; }
interface BreachBySev    { severity: string; breached: number; }
interface DayRow         { day: string; count: number; }
interface CompanyRow     { company_id: string; total: number; }
interface PriorityRow    { priority: string; count: number; }
interface BreachDay      { day: string; breach_count: number; }
interface ProductRow     { product_id: string; product_name: string; total: number; resolved: number; }

// ─── Style Maps ───────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
};
const PRI_COLOR: Record<string, string> = {
  P0: '#ef4444', P1: '#f97316', P2: '#eab308', P3: '#3b82f6',
};
const STATUS_COLOR: Record<string, string> = {
  new: '#6366f1', acknowledged: '#8b5cf6', in_progress: '#3b82f6',
  on_hold: '#f59e0b', resolved: '#22c55e', closed: '#64748b', reopened: '#ef4444',
};

const TT = {
  contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  labelStyle:   { color: '#64748b', fontSize: 11, fontWeight: 600 },
  itemStyle:    { color: '#1e293b', fontSize: 12 },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; sub: string; id?: string; children: React.ReactNode }> = ({ title, sub, id, children }) => (
  <div id={id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h3 className="text-sm font-bold text-slate-900 mb-0.5">{title}</h3>
    <p className="text-xs text-slate-400 mb-5">{sub}</p>
    {children}
  </div>
);

const Empty = () => <p className="text-slate-400 text-sm text-center py-8">No data available</p>;

// ─── Stat pill ────────────────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-slate-900' }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
    <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminReportsPage: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading,      setLoading]      = useState(true);
  const [downloading,  setDownloading]  = useState(false);
  const [bySeverity,   setBySeverity]   = useState<SeverityRow[]>([]);
  const [byStatus,     setByStatus]     = useState<StatusRow[]>([]);
  const [resolution,   setResolution]   = useState<ResolutionTime | null>(null);
  const [breachBySev,  setBreachBySev]  = useState<BreachBySev[]>([]);
  const [byDay,        setByDay]        = useState<DayRow[]>([]);
  const [byPriority,   setByPriority]   = useState<PriorityRow[]>([]);
  const [breachDays,   setBreachDays]   = useState<BreachDay[]>([]);
  const [byProduct,    setByProduct]    = useState<ProductRow[]>([]);
  const [topCompanies, setTopCompanies] = useState<(CompanyRow & { name: string })[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [
        sev, status, res, breachSev, days,
        pri, breach, prod, companies, authProducts, authCompanies,
      ] = await Promise.all([
        adminTicketService.reportTicketsBySeverity(),
        adminTicketService.reportTicketsByStatus(),
        adminTicketService.reportAvgResolutionTime(),
        adminTicketService.reportSLABreachBySeverity(),
        adminTicketService.reportTicketsByDay(),
        adminTicketService.reportOpenByPriority(),
        adminTicketService.reportSLABreachesByDay(),
        adminTicketService.reportTicketsByProduct(),
        adminTicketService.reportTopCompanies(),
        adminAuthService.listProducts(),
        adminAuthService.listCompanies(),
      ]);

      setBySeverity(sev.tickets_by_severity);
      setByStatus(status.tickets_by_status);
      setResolution(res);
      setBreachBySev(breachSev.sla_breach_by_severity);
      setByDay(days.tickets_by_day);
      setByPriority(pri.open_tickets_by_priority);
      setBreachDays(breach.sla_breaches_by_day.slice(-30));

      const nameMap: Record<string, string> = {};
      authProducts.forEach((p: any) => { nameMap[p.id] = p.name; });
      setByProduct(
        prod.tickets_by_product.map((r: any) => ({
          ...r, product_name: nameMap[r.product_id] ?? r.product_name,
        }))
      );

      const companyMap: Record<string, string> = {};
      authCompanies.forEach((c: any) => { companyMap[c.id] = c.name; });
      setTopCompanies(
        companies.top_companies.map((r: CompanyRow) => ({
          ...r, name: companyMap[r.company_id] ?? r.company_id.slice(0, 8) + '…',
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // PDF download using browser print
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const el = reportRef.current;
      if (!el) return;
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body * { visibility: hidden !important; }
          #report-content, #report-content * { visibility: visible !important; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `;
      document.head.appendChild(style);
      window.print();
      document.head.removeChild(style);
    } finally {
      setDownloading(false);
    }
  };

  const genDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <MainLayout navItems={adminNav} pageTitle="Reports">
      <div className="p-6 space-y-6" id="report-content" ref={reportRef}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
            <p className="text-slate-400 text-sm mt-0.5">Generated on {genDate}</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={load}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={downloadPDF}
              disabled={downloading || loading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {loading ? <PageLoader /> : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

            {/* 1. Tickets by Severity */}
            <Section title="Tickets by Severity" sub="Distribution of all tickets across severity levels">
              {bySeverity.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySeverity} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="severity" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Tickets">
                      {bySeverity.map(r => (
                        <Cell key={r.severity} fill={SEV_COLOR[r.severity] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 2. Tickets by Status */}
            <Section title="Tickets by Status" sub="Current ticket distribution across all workflow statuses">
              {byStatus.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        percent && percent > 0.03
                          ? `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                          : ''
                      }
                      labelLine={false}
                    >
                      {byStatus.map(r => (
                        <Cell key={r.status} fill={STATUS_COLOR[r.status] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip {...TT} />
                    <Legend
                      iconType="circle" iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 3. Resolution Time */}
            <Section title="Resolution Time" sub="How long tickets take to resolve (minutes)">
              {!resolution ? <Empty /> : (
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Average (min)" value={resolution.avg_resolution_time_min} />
                  <Stat label="Fastest (min)" value={resolution.min_resolution_time_min} accent="text-emerald-600" />
                  <Stat label="Slowest (min)" value={resolution.max_resolution_time_min} accent="text-red-500" />
                </div>
              )}
            </Section>

            {/* 4. SLA Breach by Severity */}
            <Section title="SLA Breaches by Severity" sub="Which severity levels are breaching SLA most">
              {breachBySev.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breachBySev} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="severity" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="breached" name="Breached" radius={[6, 6, 0, 0]}>
                      {breachBySev.map(r => (
                        <Cell key={r.severity} fill={SEV_COLOR[r.severity] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 5. Ticket Creation Trend — full width */}
            <div className="xl:col-span-2">
              <Section title="Ticket Creation Trend" sub="Number of tickets created per day over the last 30 days">
                {byDay.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={d => d.slice(5)}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...TT} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Tickets Created"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>

            {/* 6. Open by Priority */}
            <Section title="Open Tickets by Priority" sub="Current open tickets broken down by priority level">
              {byPriority.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byPriority} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="priority" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="count" name="Open Tickets" radius={[6, 6, 0, 0]}>
                      {byPriority.map(r => (
                        <Cell key={r.priority} fill={PRI_COLOR[r.priority] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 7. SLA Breach Trend */}
            <Section title="SLA Breach Trend" sub="SLA resolution breaches over the last 30 days">
              {breachDays.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={breachDays}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={d => d.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Line
                      type="monotone"
                      dataKey="breach_count"
                      name="Breaches"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 8. Tickets by Product */}
            <Section title="Tickets by Product" sub="Total vs resolved ticket volume per product">
              {byProduct.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.max(220, byProduct.length * 50)}>
                  <BarChart data={byProduct} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="product_name"
                      width={110}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip {...TT} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                    <Bar dataKey="total"    name="Total"    fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* 9. Top Companies by Volume */}
            <Section title="Top Companies by Ticket Volume" sub="Companies generating the most support tickets">
              {topCompanies.length === 0 ? <Empty /> : (
                <div className="space-y-3">
                  {topCompanies.map((c, idx) => {
                    const max  = topCompanies[0]?.total ?? 1;
                    const pct  = (c.total / max) * 100;
                    return (
                      <div key={c.company_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-5 tabular-nums">#{idx + 1}</span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{c.name}</span>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-700">{c.total}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </MainLayout>
  );
};