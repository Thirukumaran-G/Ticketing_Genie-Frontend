import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { MainLayout } from '../../../layouts/MainLayout';
import { Spinner } from '../../../components/ui';
import { adminTicketService, BreachDayRaw } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  open_ticket_count:      number;
  total_sla_breaches:     number;
  avg_first_response_min: number;
  tickets_resolved_today: number;
}
interface PriorityRow { priority: string; count: number; }
type BreachDay = BreachDayRaw;

const normalizeBreachDay = (r: any): BreachDay => ({
  day:                   r.day,
  breach_count:          r.breach_count          ?? 0,
  response_breach_count: r.response_breach_count ?? 0,
  resolve_breach_count:  r.resolve_breach_count  ?? 0,
});

interface ProductRow  {
  product_id: string; product_name: string;
  total: number; resolved: number; avg_resolution_time_min: number;
}
interface SeverityRow    { severity: string; count: number; }
interface StatusRow      { status: string; count: number; }
interface ResolutionTime {
  avg_resolution_time_min: number;
  min_resolution_time_min: number;
  max_resolution_time_min: number;
}
interface DayRow    { day: string; count: number; }
interface CompanyRow { company_id: string; total: number; name: string; }

// ─── Valid ticket statuses ────────────────────────────────────────────────────
const VALID_STATUSES = [
  'new', 'acknowledged', 'assigned', 'in_progress',
  'on_hold', 'resolved', 'closed', 'reopened',
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PRI_CFG: Record<string, { bar: string; badge: string; label: string }> = {
  P0: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600 ring-red-200',          label: 'Critical' },
  P1: { bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 ring-orange-200', label: 'High'     },
  P2: { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', label: 'Medium'   },
  P3: { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600 ring-blue-200',       label: 'Low'      },
};

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
};
const STATUS_COLOR: Record<string, string> = {
  new: '#6366f1', acknowledged: '#8b5cf6', assigned: '#06b6d4',
  in_progress: '#3b82f6', on_hold: '#f59e0b',
  resolved: '#22c55e', closed: '#64748b', reopened: '#ef4444',
};

const TT = {
  contentStyle: {
    backgroundColor: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  labelStyle: { color: '#64748b', fontSize: 11, fontWeight: 600 },
  itemStyle:  { color: '#1e293b', fontSize: 12 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  accent?: string; icon: string;
}> = ({ label, value, sub, accent = 'text-slate-900', icon }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
      <span className="text-xl">{icon}</span>
    </div>
    <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </div>
);

const Section: React.FC<{ title: string; sub: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h3 className="text-sm font-bold text-slate-900 mb-0.5">{title}</h3>
    <p className="text-xs text-slate-400 mb-5">{sub}</p>
    {children}
  </div>
);

const Empty = () => <p className="text-slate-400 text-sm text-center py-8">No data available</p>;

const Stat: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-slate-900' }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
    <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [byPriority,   setByPriority]   = useState<PriorityRow[]>([]);
  const [breachDays30, setBreachDays30] = useState<BreachDay[]>([]);
  const [byProduct,    setByProduct]    = useState<ProductRow[]>([]);
  const [bySeverity,   setBySeverity]   = useState<SeverityRow[]>([]);
  const [byStatus,     setByStatus]     = useState<StatusRow[]>([]);
  const [resolution,   setResolution]   = useState<ResolutionTime | null>(null);
  const [byDay,        setByDay]        = useState<DayRow[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [
        s, p, breach, prod, authProducts,
        sev, status, res, days,
        companies, authCompanies,
      ] = await Promise.all([
        adminTicketService.reportDashboardSummary(),
        adminTicketService.reportOpenByPriority(),
        adminTicketService.reportSLABreachesByDay(),
        adminTicketService.reportTicketsByProduct(),
        adminAuthService.listProducts(),
        adminTicketService.reportTicketsBySeverity(),
        adminTicketService.reportTicketsByStatus(),
        adminTicketService.reportAvgResolutionTime(),
        adminTicketService.reportTicketsByDay(),
        adminTicketService.reportTopCompanies(),
        adminAuthService.listCompanies(),
      ]);

      setSummary(s);
      setByPriority(p.open_tickets_by_priority);

      // 30-day breach series — single fetch, no duplicate
      setBreachDays30(breach.sla_breaches_by_day.slice(-30).map(normalizeBreachDay));

      const productNameMap: Record<string, string> = {};
      authProducts.forEach((ap: { id: string; name: string }) => {
        productNameMap[ap.id] = ap.name;
      });

      // Full product list with resolved names — single fetch
      setByProduct(
        prod.tickets_by_product.map((r: ProductRow) => ({
          ...r,
          product_name: productNameMap[r.product_id] ?? r.product_name,
        })),
      );

      setBySeverity(sev.tickets_by_severity);
      setByStatus(
        (status.tickets_by_status as StatusRow[]).filter(r =>
          VALID_STATUSES.includes(r.status)
        ),
      );
      setResolution(res);
      setByDay(days.tickets_by_day);

      const companyNameMap: Record<string, string> = {};
      authCompanies.forEach((c: any) => { companyNameMap[c.id] = c.name; });

      setTopCompanies(
        companies.top_companies.map((r: any) => ({
          ...r,
          name: companyNameMap[r.company_id] ?? r.company_id.slice(0, 8) + '…',
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Total tickets derived from byStatus sum — no extra API call needed
  const totalTickets = byStatus.reduce((sum, r) => sum + r.count, 0);

  const maxPriCount = Math.max(...byPriority.map(r => r.count), 1);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const downloadPDF = async () => {
    setDownloading(true);
    try {
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

  return (
    <MainLayout navItems={adminNav} pageTitle="Dashboard">
      <div id="report-content" className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-end justify-between no-print">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
            <p className="text-slate-400 text-sm mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
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

        {loading ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* ══ SECTION 1: Summary Stats — now includes Total Tickets ══ */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Overview</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                  icon="🎫" label="Total Tickets"
                  value={totalTickets}
                  sub="All statuses"
                />
                <StatCard
                  icon="📋" label="Assigned Tickets"
                  value={summary?.open_ticket_count ?? '—'}
                  sub="Status: assigned"
                />
                <StatCard
                  icon="✅" label="Resolved Today"
                  value={summary?.tickets_resolved_today ?? '—'}
                  accent="text-emerald-600"
                  sub="UTC day"
                />
                <StatCard
                  icon="⏱" label="Avg First Response"
                  value={summary ? `${summary.avg_first_response_min}m` : '—'}
                  sub="All time average"
                />
                <StatCard
                  icon="🚨" label="Total SLA Breaches"
                  value={summary?.total_sla_breaches ?? '—'}
                  accent="text-red-500"
                  sub="All time"
                />
              </div>
            </div>

            {/* ══ SECTION 2: Assigned by Priority (single, no duplicate) ══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Priority breakdown — kept as the detailed labelled bar card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
                    Assigned by Priority
                  </h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {byPriority.reduce((s, r) => s + r.count, 0)} total
                  </span>
                </div>
                {byPriority.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No assigned tickets</p>
                ) : (
                  <div className="space-y-3">
                    {(['P0','P1','P2','P3'] as const).map(p => {
                      const row   = byPriority.find(r => r.priority === p);
                      const count = row?.count ?? 0;
                      const cfg   = PRI_CFG[p];
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${cfg.badge}`}>
                            {p}
                          </span>
                          <span className="text-xs text-slate-400 w-12">{cfg.label}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                              style={{
                                width: `${(count / maxPriCount) * 100}%`,
                                minWidth: count > 0 ? '1.5rem' : 0,
                              }}
                            />
                          </div>
                          <span className="w-7 text-xs font-semibold text-slate-700 text-right tabular-nums">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tickets by Severity */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-0.5">
                  Tickets by Severity
                </h3>
                <p className="text-xs text-slate-400 mb-5">Distribution across severity levels</p>
                {bySeverity.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={bySeverity} barSize={44}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="severity"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false} tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip {...TT} />
                      <Bar dataKey="count" radius={[6,6,0,0]} name="Tickets">
                        {bySeverity.map(r => (
                          <Cell key={r.severity} fill={SEV_COLOR[r.severity] ?? '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ══ SECTION 3: Detailed Reports ══ */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Detailed Reports
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* Tickets by Status */}
                <Section
                  title="Tickets by Status"
                  sub="Current distribution across all workflow statuses"
                >
                  {byStatus.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={byStatus} dataKey="count" nameKey="status"
                          cx="50%" cy="50%" outerRadius={80}
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

                {/* Resolution Time */}
                <Section
                  title="Resolution Time"
                  sub="How long tickets take to resolve (minutes)"
                >
                  {!resolution ? <Empty /> : (
                    <div className="grid grid-cols-3 gap-4">
                      <Stat label="Average (min)" value={resolution.avg_resolution_time_min} />
                      <Stat label="Fastest (min)" value={resolution.min_resolution_time_min} accent="text-emerald-600" />
                      <Stat label="Slowest (min)" value={resolution.max_resolution_time_min} accent="text-red-500" />
                    </div>
                  )}
                </Section>

                {/* Ticket Creation Trend — full width */}
                <div className="xl:col-span-2">
                  <Section
                    title="Ticket Creation Trend"
                    sub="Number of tickets created per day over the last 30 days"
                  >
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
                          <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={false} tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip {...TT} />
                          <Line
                            type="monotone" dataKey="count" name="Tickets Created"
                            stroke="#3b82f6" strokeWidth={2.5} dot={false}
                            activeDot={{ r: 5, fill: '#3b82f6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Section>
                </div>

                {/* SLA Breach Trend 30-day — full width, single chart */}
                <div className="xl:col-span-2">
                  <Section
                    title="SLA Breach Trend — Last 30 Days"
                    sub="Response SLA (dashed orange) vs Resolve SLA (solid red) breaches per day"
                  >
                    {breachDays30.length === 0 ? <Empty /> : (
                      <>
                        <div className="flex items-center gap-6 mb-4">
                          <span className="text-xs font-semibold text-orange-500 tabular-nums">
                            {breachDays30.reduce((s, d) => s + d.response_breach_count, 0)} response breaches
                          </span>
                          <span className="text-xs font-semibold text-red-500 tabular-nums">
                            {breachDays30.reduce((s, d) => s + d.resolve_breach_count, 0)} resolve breaches
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={breachDays30}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                              dataKey="day"
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              axisLine={false} tickLine={false}
                              tickFormatter={d => d.slice(5)}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fill: '#94a3b8', fontSize: 12 }}
                              axisLine={false} tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip {...TT} />
                            <Legend
                              iconType="circle" iconSize={8}
                              wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                            />
                            <Line
                              type="monotone" dataKey="response_breach_count" name="Response SLA"
                              stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={false}
                              activeDot={{ r: 5, fill: '#f97316' }}
                            />
                            <Line
                              type="monotone" dataKey="resolve_breach_count" name="Resolve SLA"
                              stroke="#ef4444" strokeWidth={2.5} dot={false}
                              activeDot={{ r: 5, fill: '#ef4444' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </Section>
                </div>

                {/* Tickets by Product — full horizontal bar, single instance */}
                <div className="xl:col-span-2">
                  <Section
                    title="Tickets by Product"
                    sub="Total vs resolved ticket volume per product"
                  >
                    {byProduct.length === 0 ? <Empty /> : (
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(220, byProduct.length * 50)}
                      >
                        <BarChart data={byProduct} layout="vertical" barSize={12}>
                          <CartesianGrid
                            strokeDasharray="3 3" stroke="#f1f5f9"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            axisLine={false} tickLine={false}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category" dataKey="product_name" width={120}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip {...TT} />
                          <Legend
                            iconType="circle" iconSize={8}
                            wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                          />
                          <Bar dataKey="total"    name="Total"    fill="#3b82f6" radius={[0,4,4,0]} />
                          <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Section>
                </div>

                {/* Top Companies by Ticket Volume */}
                <div className="xl:col-span-2">
                  <Section
                    title="Top Companies by Ticket Volume"
                    sub="Companies generating the most support tickets"
                  >
                    {topCompanies.length === 0 ? <Empty /> : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                        {topCompanies.map((c, idx) => {
                          const max = topCompanies[0]?.total ?? 1;
                          const pct = (c.total / max) * 100;
                          return (
                            <div key={c.company_id}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 w-5 tabular-nums">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                                    {c.name}
                                  </span>
                                </div>
                                <span className="text-xs font-bold tabular-nums text-slate-700">
                                  {c.total}
                                </span>
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

              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};