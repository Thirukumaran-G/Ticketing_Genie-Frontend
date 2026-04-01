import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Input, Modal, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { SLARuleResponse } from '../../../types';

const PRI_BADGE: Record<string, string> = {
  P0: 'bg-red-100 text-red-600',
  P1: 'bg-orange-100 text-orange-600',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-blue-100 text-blue-600',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const hrs  = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
  }
  const days = Math.floor(minutes / 1440);
  const hrs  = Math.floor((minutes % 1440) / 60);
  return hrs === 0 ? `${days} day` : `${days} day ${hrs} hr`;
}

const schema = z.object({
  response_time_min:   z.coerce.number().min(1, 'Must be > 0'),
  resolution_time_min: z.coerce.number().min(1, 'Must be > 0'),
});
type Form = z.infer<typeof schema>;

export const AdminSLAPage: React.FC = () => {
  const [rules,       setRules]       = useState<SLARuleResponse[]>([]);
  const [tiers,       setTiers]       = useState<{ id: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<SLARuleResponse | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        adminTicketService.listSLARules(),
        adminAuthService.listTiers(),
      ]);
      setRules(r);
      setTiers(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (rule: SLARuleResponse) => {
    setEditingRule(rule);
    setValue('response_time_min',   rule.response_time_min);
    setValue('resolution_time_min', rule.resolution_time_min);
  };

  const onClose = () => {
    setEditingRule(null);
    reset();
  };

  const onSubmit = async (d: Form) => {
    if (!editingRule) return;
    try {
      setSubmitting(true);
      await adminTicketService.updateSLARule(editingRule.id, d);
      toast.success('SLA rule updated');
      onClose();
      load();
    } catch {
      toast.error('Failed to update rule');
    } finally {
      setSubmitting(false);
    }
  };

  const onToggle = async (rule: SLARuleResponse) => {
    try {
      setTogglingId(rule.id);
      await adminTicketService.toggleSLARule(rule.id);
      toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
      load();
    } catch {
      toast.error('Failed to update rule');
    } finally {
      setTogglingId(null);
    }
  };

  const tierName = (id: string) => tiers.find(t => t.id === id)?.name ?? '—';

  return (
    <MainLayout navItems={adminNav} pageTitle="SLA Rules">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">SLA Rules</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Response and resolution targets per tier + priority
          </p>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          <div className="grid grid-cols-[180px_120px_1fr_1fr_80px_80px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Tier</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Priority</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Response</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Resolution</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Status</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Edit</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : rules.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No SLA rules found</p>
            </div>
          ) : (
            rules.map((r, idx) => (
              <div
                key={r.id}
                className={`grid grid-cols-[180px_120px_1fr_1fr_80px_80px] items-center px-6 py-4 border-b border-slate-100 last:border-0 transition-opacity ${
                  !r.is_active ? 'opacity-50' : ''
                } ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <p className="text-sm font-semibold text-slate-900 capitalize">{tierName(r.tier_id)}</p>

                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRI_BADGE[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                    {r.priority}
                  </span>
                </div>

                <p className="text-sm text-slate-700 tabular-nums font-medium">
                  {formatDuration(r.response_time_min)}
                </p>

                <p className="text-sm text-slate-700 tabular-nums font-medium">
                  {formatDuration(r.resolution_time_min)}
                </p>

                {/* Toggle */}
                <div className="flex items-center">
                  {togglingId === r.id ? (
                    <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <button
                      onClick={() => onToggle(r)}
                      title={r.is_active ? 'Disable rule' : 'Enable rule'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        r.is_active ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        r.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}/>
                    </button>
                  )}
                </div>

                {/* Edit */}
                <div className="flex items-center">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit timings"
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
      <Modal open={!!editingRule} onClose={onClose} title="Edit SLA Rule">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

          {/* Locked info */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Tier</p>
              <p className="text-sm font-semibold text-slate-700 capitalize">{tierName(editingRule?.tier_id ?? '')}</p>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Priority</p>
              <p className="text-sm font-semibold text-slate-700">{editingRule?.priority}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Tier and priority are locked — only timings can be updated.</p>

          <Input
            label="Response Time (minutes)"
            type="number" min={1}
            error={errors.response_time_min?.message}
            {...register('response_time_min')}
          />
          <Input
            label="Resolution Time (minutes)"
            type="number" min={1}
            error={errors.resolution_time_min?.message}
            {...register('resolution_time_min')}
          />

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
              {submitting ? 'Saving…' : 'Update Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};