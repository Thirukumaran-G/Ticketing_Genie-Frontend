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
  const [maps,        setMaps]        = useState<SeverityPriorityMapResponse[]>([]);
  const [tiers,       setTiers]       = useState<{ id: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [editingMap,  setEditingMap]  = useState<SeverityPriorityMapResponse | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        adminTicketService.listSeverityPriorityMap(),
        adminAuthService.listTiers(),
      ]);
      setMaps(m);
      setTiers(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (map: SeverityPriorityMapResponse) => {
    setEditingMap(map);
    setValue('derived_priority', map.derived_priority);
  };

  const onClose = () => {
    setEditingMap(null);
    reset();
  };

  const onSubmit = async (d: Form) => {
    if (!editingMap) return;
    try {
      setSubmitting(true);
      await adminTicketService.updateSeverityPriorityMap(editingMap.id, d);
      toast.success('Mapping updated');
      onClose();
      load();
    } catch {
      toast.error('Failed to update mapping');
    } finally {
      setSubmitting(false);
    }
  };

  const onToggle = async (map: SeverityPriorityMapResponse) => {
    try {
      setTogglingId(map.id);
      await adminTicketService.toggleSeverityPriorityMap(map.id);
      toast.success(map.is_active ? 'Mapping disabled' : 'Mapping enabled');
      load();
    } catch {
      toast.error('Failed to update mapping');
    } finally {
      setTogglingId(null);
    }
  };

  const tierName = (id: string) => tiers.find(t => t.id === id)?.name ?? '—';

  return (
    <MainLayout navItems={adminNav} pageTitle="Severity → Priority Map">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Severity / Priority Map</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Maps severity + tier to a derived ticket priority
          </p>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          <div className="grid grid-cols-[1fr_1fr_160px_80px_80px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Severity</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Tier</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Derived Priority</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Status</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Edit</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : maps.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No mappings found</p>
            </div>
          ) : (
            maps.map((m, idx) => (
              <div
                key={m.id}
                className={`grid grid-cols-[1fr_1fr_160px_80px_80px] items-center px-6 py-4 border-b border-slate-100 last:border-0 transition-opacity ${
                  !m.is_active ? 'opacity-50' : ''
                } ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                {/* Severity */}
                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${SEV_BADGE[m.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.severity}
                  </span>
                </div>

                {/* Tier */}
                <p className="text-sm font-semibold text-slate-900 capitalize">{tierName(m.tier_id)}</p>

                {/* Derived priority */}
                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRI_BADGE[m.derived_priority] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.derived_priority}
                  </span>
                </div>

                {/* Toggle */}
                <div className="flex items-center">
                  {togglingId === m.id ? (
                    <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <button
                      onClick={() => onToggle(m)}
                      title={m.is_active ? 'Disable mapping' : 'Enable mapping'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        m.is_active ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        m.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}/>
                    </button>
                  )}
                </div>

                {/* Edit */}
                <div className="flex items-center">
                  <button
                    onClick={() => openEdit(m)}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit priority mapping"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                           m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={!!editingMap} onClose={onClose} title="Edit Priority Mapping">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

          {/* Locked info */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Severity</p>
              <p className="text-sm font-semibold text-slate-700 capitalize">{editingMap?.severity}</p>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Tier</p>
              <p className="text-sm font-semibold text-slate-700 capitalize">{tierName(editingMap?.tier_id ?? '')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Severity and tier are locked — only derived priority can be changed.</p>

          <Sel
            label="Derived Priority"
            error={errors.derived_priority?.message}
            {...register('derived_priority')}
          >
            <option value="">Select priority…</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Sel>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Update Mapping'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};