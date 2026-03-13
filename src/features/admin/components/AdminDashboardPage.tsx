import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout';
import { Spinner } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
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
interface BreachDay   { day: string; breach_count: number; }
interface ProductRow  {
  product_id: string; product_name: string;
  total: number; resolved: number; avg_resolution_time_min: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRI_CFG: Record<string, { bar: string; badge: string; label: string }> = {
  P0: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600 ring-red-200',          label: 'Critical' },
  P1: { bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 ring-orange-200', label: 'High'     },
  P2: { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', label: 'Medium'   },
  P3: { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600 ring-blue-200',       label: 'Low'      },
};

const QUICK_LINKS = [
  { path: '/admin/companies',      label: 'Companies',      icon: '🏢' },
  { path: '/admin/products',       label: 'Products',       icon: '📦' },
  { path: '/admin/users',          label: 'Users',          icon: '👥' },
  { path: '/admin/teams',          label: 'Teams',          icon: '🤝' },
  { path: '/admin/sla-rules',      label: 'SLA Rules',      icon: '⏱' },
  { path: '/admin/severity-map',   label: 'Severity Map',   icon: '🗺' },
  { path: '/admin/keyword-rules',  label: 'Keywords',       icon: '🔑' },
  { path: '/admin/product-config', label: 'Product Config', icon: '⚙️' },
  { path: '/admin/email-config',   label: 'Email Config',   icon: '✉️' },
  { path: '/admin/reports',        label: 'Full Reports',   icon: '📊' },
];

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

const Sparkline: React.FC<{ data: BreachDay[] }> = ({ data }) => {
  if (!data.length) return <p className="text-xs text-slate-400 py-6 text-center">No breach data</p>;
  const W = 400, H = 80, PAD = 8;
  const max = Math.max(...data.map(d => d.breach_count), 1);
  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - (d.breach_count / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="breach-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#breach-fill)" />
      <polyline points={polyline} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const [x, y] = pts[i].split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill="#ef4444" opacity={d.breach_count > 0 ? 1 : 0} />;
      })}
    </svg>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const [summary,    setSummary]    = useState<Summary | null>(null);
  const [byPriority, setByPriority] = useState<PriorityRow[]>([]);
  const [breachDays, setBreachDays] = useState<BreachDay[]>([]);
  const [byProduct,  setByProduct]  = useState<ProductRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      adminTicketService.reportDashboardSummary(),
      adminTicketService.reportOpenByPriority(),
      adminTicketService.reportSLABreachesByDay(),
      adminTicketService.reportTicketsByProduct(),
      adminAuthService.listProducts(),  // ← real names direct from auth-service
    ]).then(([s, p, d, prod, authProducts]) => {
      setSummary(s);
      setByPriority(p.open_tickets_by_priority);
      setBreachDays(d.sla_breaches_by_day.slice(-14));

      // Build id → name map from auth-service response
      const nameMap: Record<string, string> = {};
      authProducts.forEach((ap: { id: string; name: string }) => {
        nameMap[ap.id] = ap.name;
      });

      // Overwrite product_name using the auth-service map
      const resolved = prod.tickets_by_product
        .map(r => ({
          ...r,
          product_name: nameMap[r.product_id] ?? r.product_name,
        }))
        .slice(0, 5);

      setByProduct(resolved);
    }).finally(() => setLoading(false));
  }, []);

  const maxPriCount     = Math.max(...byPriority.map(r => r.count), 1);
  const maxProductTotal = Math.max(...byProduct.map(r => r.total), 1);
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <MainLayout navItems={adminNav} pageTitle="Dashboard">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
            <p className="text-slate-400 text-sm mt-0.5">{dateStr}</p>
          </div>
          <Link
            to="/admin/reports"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Full reports
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🎫" label="Open Tickets"       value={summary?.open_ticket_count ?? '—'}                       sub="Across all priorities" />
              <StatCard icon="✅" label="Resolved Today"     value={summary?.tickets_resolved_today ?? '—'}                  accent="text-emerald-600" sub="UTC day" />
              <StatCard icon="⏱" label="Avg First Response" value={summary ? `${summary.avg_first_response_min}m` : '—'}    sub="All time average" />
              <StatCard icon="🚨" label="Total SLA Breaches" value={summary?.total_sla_breaches ?? '—'}                      accent="text-red-500" sub="All time" />
            </div>

            {/* ── Two-column middle ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Priority breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Open by Priority</h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {byPriority.reduce((s, r) => s + r.count, 0)} total
                  </span>
                </div>
                {byPriority.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No open tickets</p>
                ) : (
                  <div className="space-y-3">
                    {(['P0','P1','P2','P3'] as const).map(p => {
                      const row   = byPriority.find(r => r.priority === p);
                      const count = row?.count ?? 0;
                      const cfg   = PRI_CFG[p];
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${cfg.badge}`}>{p}</span>
                          <span className="text-xs text-slate-400 w-12">{cfg.label}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                              style={{ width: `${(count / maxPriCount) * 100}%`, minWidth: count > 0 ? '1.5rem' : 0 }}
                            />
                          </div>
                          <span className="w-7 text-xs font-semibold text-slate-700 text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tickets by product — names resolved from auth-service */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Tickets by Product</h3>
                  <span className="text-xs text-slate-400">Top 5</span>
                </div>
                {byProduct.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No data</p>
                ) : (
                  <div className="space-y-3">
                    {byProduct.map(row => {
                      const resolvedPct = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0;
                      return (
                        <div key={row.product_id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                              {row.product_name}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-emerald-600 font-medium">{resolvedPct}% resolved</span>
                              <span className="tabular-nums font-semibold text-slate-700">{row.total}</span>
                            </div>
                          </div>
                          <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-400 transition-all duration-500"
                              style={{ width: `${(row.total / maxProductTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── SLA Breach Trend ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">SLA Breach Trend</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Last 14 days</p>
                </div>
                {breachDays.length > 0 && (
                  <span className="text-xs font-semibold text-red-500 tabular-nums">
                    {breachDays.reduce((s, d) => s + d.breach_count, 0)} breaches
                  </span>
                )}
              </div>
              <Sparkline data={breachDays} />
              {breachDays.length > 0 && (
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>{breachDays[0]?.day}</span>
                  <span>{breachDays[breachDays.length - 1]?.day}</span>
                </div>
              )}
            </div>

            {/* ── Quick Links ── */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Access</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {QUICK_LINKS.map(({ path, label, icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className="bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-4 text-sm font-medium text-slate-600 hover:text-blue-700 transition-all flex flex-col gap-2 group"
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="flex items-center justify-between">
                      {label}
                      <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};