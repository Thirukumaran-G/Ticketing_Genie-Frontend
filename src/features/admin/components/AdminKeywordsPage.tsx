import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { KeywordRuleResponse } from '../../../types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SEV_VARIANT: Record<string, any> = {
  critical: 'critical', high: 'high', medium: 'medium', low: 'low',
};

const schema = z.object({
  keyword:  z.string().min(1, 'Required'),
  severity: z.string().min(1, 'Select severity'),
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

export const AdminKeywordsPage: React.FC = () => {
  const [rules, setRules]           = useState<KeywordRuleResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<KeywordRuleResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try { setRules(await adminTicketService.listKeywordRules()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); reset(); setShowModal(true); };
  const openEdit   = (r: KeywordRuleResponse) => {
    setEditing(r); setValue('keyword', r.keyword); setValue('severity', r.severity); setShowModal(true);
  };
  const onClose = () => { setShowModal(false); setEditing(null); reset(); };

  const onSubmit = async (d: Form) => {
    try {
      setSubmitting(true);
      if (editing) {
        await adminTicketService.updateKeywordRule(editing.id, d);
        toast.success('Updated');
      } else {
        await adminTicketService.createKeywordRule(d);
        toast.success('Created');
      }
      onClose(); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const onDeactivate = async (id: string) => {
    if (!confirm('Deactivate this rule?')) return;
    try { await adminTicketService.deleteKeywordRule(id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Keyword Rules">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Keyword Rules</h2>
            <p className="text-zinc-500 text-sm mt-1">Auto-classify tickets by keyword → severity</p>
          </div>
          <Button size="sm" onClick={openCreate}>+ New Rule</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Keyword</div>
            <div className="w-28 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Severity</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Active</div>
            <div className="w-28" />
          </div>
          {loading ? <PageLoader /> : rules.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No keyword rules yet</p></div>
          ) : rules.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="flex-1 font-mono text-sm text-white">{r.keyword}</div>
              <div className="w-28">
                <Badge variant={SEV_VARIANT[r.severity] ?? 'default'}>{r.severity}</Badge>
              </div>
              <div className="w-20">
                <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Yes' : 'No'}</Badge>
              </div>
              <div className="w-28 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => onDeactivate(r.id)}>Off</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={onClose} title={editing ? 'Edit Keyword Rule' : 'New Keyword Rule'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Keyword" placeholder="e.g. outage, crash, urgent" error={errors.keyword?.message} {...register('keyword')} />
          <Sel label="Severity" error={errors.severity?.message} {...register('severity')}>
            <option value="">Select severity…</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Sel>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" full loading={submitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};