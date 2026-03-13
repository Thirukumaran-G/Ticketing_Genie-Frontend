import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Modal, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { SeverityPriorityMapResponse } from '../../../types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-600',
  high:     'bg-orange-100 text-orange-600',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-blue-100 text-blue-600',
};
const PRI_BADGE: Record<string, string> = {
  P0: 'bg-red-100 text-red-600',
  P1: 'bg-orange-100 text-orange-600',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-blue-100 text-blue-600',
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
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <select
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export const AdminSeverityMapPage: React.FC = () => {
  const [maps,       setMaps]       = useState<SeverityPriorityMapResponse[]>([]);
  const [tiers,      setTiers]      = useState<{ id: string; name: string }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        adminTicketService.listSeverityPriorityMap(),
        adminAuthService.listTiers(),   // ← direct from auth-service
      ]);
      setMaps(m);
      setTiers(t);
    } finally {
      setLoading(false);
    }
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
    if (!confirm('Permanently delete this mapping?')) return;
    try {
      setDeletingId(id);
      await adminTicketService.deleteSeverityPriorityMap(id);
      toast.success('Mapping deleted');
      load();
    } catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  const tierName = (id: string) => tiers.find(t => t.id === id)?.name ?? '—';

  return (
    <MainLayout navItems={adminNav} pageTitle="Severity → Priority Map">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Severity / Priority Map</h2>
            <p className="text-slate-500 text-sm mt-0.5">Maps severity + tier to a derived ticket priority</p>
          </div>
          <button
            onClick={() => { reset(); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Mapping
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_160px_80px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Severity</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Tier</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Derived Priority</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Action</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : maps.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No mappings yet</p>
            </div>
          ) : (
            maps.map((m, idx) => (
              <div
                key={m.id}
                className={`grid grid-cols-[1fr_1fr_160px_80px] items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {/* Severity */}
                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${SEV_BADGE[m.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.severity}
                  </span>
                </div>

                {/* Tier name — resolved from auth-service */}
                <p className="text-sm font-semibold text-slate-900 capitalize">{tierName(m.tier_id)}</p>

                {/* Derived priority */}
                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRI_BADGE[m.derived_priority] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.derived_priority}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(m.id)}
                  disabled={deletingId === m.id}    
                  className="p-1.5 text-red-600"
                  title="Delete mapping"
                >
                  {deletingId === m.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
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
            <button
              type="button"
              onClick={() => { setShowModal(false); reset(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save Mapping'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};