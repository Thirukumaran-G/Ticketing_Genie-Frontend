// src/features/admin/components/AdminSLAPage.tsx
// GET /admin/sla-rules, POST /admin/sla-rules (upsert), DELETE /admin/sla-rules/{id}
// GET /admin/tiers (ticket-service proxy)
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader } from '../../../components/ui/index';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { SLARuleResponse } from '../../../types';
import { PRIORITIES } from '../../../config';

const schema = z.object({
  tier_id: z.string().min(1, 'Select tier'),
  priority: z.string().min(1, 'Select priority'),
  response_time_min: z.coerce.number().min(1),
  resolution_time_min: z.coerce.number().min(1),
});
type Form = z.infer<typeof schema>;

export const AdminSLAPage: React.FC = () => {
  const [rules, setRules] = useState<SLARuleResponse[]>([]);
  const [tiers, setTiers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const load = () => Promise.all([
    adminTicketService.listSLARules(),
    adminTicketService.listTiers(),
  ]).then(([r, t]) => { setRules(r); setTiers(t); }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const onSubmit = async (d: Form) => {
    try { setSubmitting(true); await adminTicketService.upsertSLARule(d); toast.success('SLA rule saved'); reset(); setShowCreate(false); load(); }
    catch { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Deactivate this rule?')) return;
    try { await adminTicketService.deleteSLARule(id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  const tierName = (id: string) => tiers.find(t => t.id === id)?.name ?? id.slice(0, 8);

  return (
    <MainLayout navItems={adminNav} pageTitle="SLA Rules">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">SLA Rules</h2>
            <p className="text-zinc-500 text-sm mt-1">Response and resolution time targets per tier and priority</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Rule</Button>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Tier</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Priority</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Response (min)</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Resolution (min)</div>
            <div className="w-20" />
          </div>
          {loading ? <PageLoader /> : rules.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No rules yet</p></div>
          ) : rules.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="w-32 text-sm text-white capitalize">{tierName(r.tier_id)}</div>
              <div className="w-20"><span className="text-xs font-bold text-orange-400">{r.priority}</span></div>
              <div className="flex-1 text-sm text-zinc-300">{r.response_time_min} min</div>
              <div className="flex-1 text-sm text-zinc-300">{r.resolution_time_min} min</div>
              <div className="w-20">
                <Button size="sm" variant="danger" onClick={() => onDelete(r.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New SLA Rule">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Tier</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...register('tier_id')}>
              <option value="">Select tier…</option>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.tier_id && <p className="text-xs text-red-400 mt-1">{errors.tier_id.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Priority</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...register('priority')}>
              <option value="">Select priority…</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.priority && <p className="text-xs text-red-400 mt-1">{errors.priority.message}</p>}
          </div>
          <Input label="Response Time (minutes)" type="number" min={1} error={errors.response_time_min?.message} {...register('response_time_min')} />
          <Input label="Resolution Time (minutes)" type="number" min={1} error={errors.resolution_time_min?.message} {...register('resolution_time_min')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Save Rule</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};
