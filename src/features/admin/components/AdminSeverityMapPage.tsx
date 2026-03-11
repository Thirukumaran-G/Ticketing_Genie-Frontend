import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Modal, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { SeverityPriorityMapResponse } from '../../../types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const SEV_COLORS: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400',
};
const PRI_COLORS: Record<string, string> = {
  P0: 'text-red-400', P1: 'text-orange-400', P2: 'text-yellow-400', P3: 'text-blue-400',
};

const schema = z.object({
  severity:         z.string().min(1, 'Select severity'),
  tier_id:          z.string().min(1, 'Select tier'),
  derived_priority: z.string().min(1, 'Select priority'),
});
type Form = z.infer<typeof schema>;

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">{label}</label>
    <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...props}>
      {children}
    </select>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const AdminSeverityMapPage: React.FC = () => {
  const [maps, setMaps]           = useState<SeverityPriorityMapResponse[]>([]);
  const [tiers, setTiers]         = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    const [m, t] = await Promise.all([
      adminTicketService.listSeverityPriorityMap(),
      adminTicketService.listTiers(),
    ]);
    setMaps(m); setTiers(t); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (d: Form) => {
    try {
      setSubmitting(true);
      await adminTicketService.upsertSeverityPriorityMap(d);
      toast.success('Mapping saved');
      reset(); setShowModal(false); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this mapping?')) return;
    try { await adminTicketService.deleteSeverityPriorityMap(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const tierName = (id: string) => tiers.find(t => t.id === id)?.name ?? id.slice(0,8) + '…';

  return (
    <MainLayout navItems={adminNav} pageTitle="Severity → Priority Map">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Severity / Priority Map</h2>
            <p className="text-zinc-500 text-sm mt-1">Maps severity + tier to a derived ticket priority</p>
          </div>
          <Button size="sm" onClick={() => { reset(); setShowModal(true); }}>+ New Mapping</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="w-28 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Severity</div>
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Tier</div>
            <div className="w-24 text-xs font-semibold text-zinc-500 uppercase tracking-widest">→ Priority</div>
            <div className="w-20" />
          </div>
          {loading ? <PageLoader /> : maps.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No mappings yet</p></div>
          ) : maps.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="w-28">
                <span className={`text-sm font-bold capitalize ${SEV_COLORS[m.severity] ?? 'text-white'}`}>{m.severity}</span>
              </div>
              <div className="flex-1 text-sm text-zinc-300">{tierName(m.tier_id)}</div>
              <div className="w-24">
                <span className={`text-sm font-bold ${PRI_COLORS[m.derived_priority] ?? 'text-white'}`}>{m.derived_priority}</span>
              </div>
              <div className="w-20">
                <Button size="sm" variant="danger" onClick={() => onDelete(m.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); reset(); }} title="New Severity Mapping">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Sel label="Severity" error={errors.severity?.message} {...register('severity')}>
            <option value="">Select severity…</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Sel>
          <Sel label="Tier" error={errors.tier_id?.message} {...register('tier_id')}>
            <option value="">Select tier…</option>
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Sel>
          <Sel label="Derived Priority" error={errors.derived_priority?.message} {...register('derived_priority')}>
            <option value="">Select priority…</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Sel>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Save Mapping</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};