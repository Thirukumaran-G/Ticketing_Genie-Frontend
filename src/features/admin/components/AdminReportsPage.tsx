import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Spinner } from '../../../components/ui';
import { adminNav } from './adminNav';
import { useAdminReports } from '../hooks/useAdminReports';

const CARD = 'bg-zinc-950 border border-zinc-800 rounded-xl p-6';

const PRI_COLORS: Record<string, string> = {
  P0: '#ef4444', P1: '#f97316', P2: '#eab308', P3: '#3b82f6',
};
const SEV_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

const Section: React.FC<{ title: string; sub: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className={CARD}>
    <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-zinc-500 mb-5">{sub}</p>
    {children}
  </div>
);

const Empty = () => <p className="text-zinc-600 text-sm text-center py-6">No data available</p>;

const TooltipStyle = {
  contentStyle: { backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 },
  labelStyle:   { color: '#a1a1aa', fontSize: 11 },
  itemStyle:    { color: '#fff', fontSize: 12 },
};

export const AdminReportsPage: React.FC = () => {
  const { byPriority, byDay, frt, byProduct, loading, refresh } = useAdminReports();

  return (
    <MainLayout navItems={adminNav} pageTitle="Reports">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Reports</h2>
            <p className="text-zinc-500 text-sm mt-1">Live data from the ticket database</p>
          </div>
          <Button size="sm" variant="secondary" onClick={refresh}>↻ Refresh</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Open tickets by priority — bar chart */}
            <Section title="Open Tickets by Priority" sub="Current open tickets grouped by priority">
              {byPriority.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byPriority} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="priority" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TooltipStyle} />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {byPriority.map(entry => (
                        <Cell key={entry.priority} fill={PRI_COLORS[entry.priority] ?? '#71717a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* SLA breaches by day — line chart */}
            <Section title="SLA Breaches by Day" sub="Resolution SLA breach events over time">
              {byDay.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={d => d.slice(5)} // show MM-DD only
                    />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="breach_count"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* First response time — stat cards */}
            <Section title="First Response Time" sub="Time from ticket creation to first agent reply">
              {!frt ? <Empty /> : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Average', value: frt.average_first_response_time_min },
                    { label: 'Median',  value: frt.median_first_response_time_min  },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 text-center">
                      <p className="text-3xl font-bold text-white tabular-nums">{Math.round(value)}</p>
                      <p className="text-xs text-zinc-500 mt-1">{label} minutes</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Tickets by product — horizontal bar chart */}
            <Section title="Tickets by Product" sub="Total vs resolved ticket volume per product">
              {byProduct.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.max(200, byProduct.length * 52)}>
                  <BarChart data={byProduct} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="product_name"
                      width={100}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip {...TooltipStyle} />
                    <Legend
                      iconType="circle" iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
                    />
                    <Bar dataKey="total"    name="Total"    fill="#3b82f6" radius={[0,4,4,0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

          </div>
        )}
      </div>
    </MainLayout>
  );
};