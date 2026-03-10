// src/features/admin/components/AdminCompaniesPage.tsx
// GET /admin/companies, POST /admin/companies, PATCH /admin/companies/{id}
// GET /admin/companies/{id}/subscriptions, POST, PATCH subscriptions
// GET /admin/tiers (auth-service)
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui/index';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { CompanyResponse, SubscriptionResponse, TierResponse, ProductResponse } from '../../../types';

const companySchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(3, 'e.g. acme.com'),
});
type CompanyForm = z.infer<typeof companySchema>;

const subSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  tier_id: z.string().min(1, 'Select tier'),
});
type SubForm = z.infer<typeof subSchema>;

export const AdminCompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [tiers, setTiers] = useState<TierResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<CompanyResponse | null>(null);
  const [subs, setSubs] = useState<SubscriptionResponse[]>([]);
  const [showSub, setShowSub] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });
  const subForm = useForm<SubForm>({ resolver: zodResolver(subSchema) });

  const load = () => adminAuthService.listCompanies().then(setCompanies).finally(() => setLoading(false));

  useEffect(() => {
    load();
    adminAuthService.listTiers().then(setTiers);
    adminAuthService.listProducts().then(setProducts);
  }, []);

  const loadSubs = (c: CompanyResponse) => {
    setSelected(c);
    adminAuthService.listSubscriptions(c.id).then(setSubs);
  };

  const onCreate = async (d: CompanyForm) => {
    try { setSubmitting(true); await adminAuthService.createCompany(d); toast.success('Company created'); reset(); setShowCreate(false); load(); }
    catch { toast.error('Failed to create company'); } finally { setSubmitting(false); }
  };

  const onAssignSub = async (d: SubForm) => {
    if (!selected) return;
    try { setSubmitting(true); await adminAuthService.assignSubscription(selected.id, d); toast.success('Subscription assigned'); subForm.reset(); setShowSub(false); loadSubs(selected); }
    catch { toast.error('Failed to assign subscription'); } finally { setSubmitting(false); }
  };

  const onToggle = async (c: CompanyResponse) => {
    try { await adminAuthService.updateCompany(c.id, { is_active: !c.is_active }); toast.success('Updated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Companies">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Companies</h2>
            <p className="text-zinc-500 text-sm mt-1">{companies.length} registered</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Company</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Company</div>
            <div className="w-40 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Domain</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-32" />
          </div>
          {loading ? <PageLoader /> : companies.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No companies yet</p></div>
          ) : companies.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
              <div className="flex-1">
                <button onClick={() => loadSubs(c)} className="text-sm font-medium text-white hover:text-zinc-300 text-left">{c.name}</button>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">{c.id.slice(0,8)}…</p>
              </div>
              <div className="w-40 text-xs text-zinc-400">{(c as any).domain ?? '—'}</div>
              <div className="w-20">
                <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="w-32 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => loadSubs(c)}>Subs</Button>
                <Button size="sm" variant={c.is_active ? 'danger' : 'secondary'} onClick={() => onToggle(c)}>
                  {c.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create company modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Company">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Company Name" placeholder="Acme Corp" error={errors.name?.message} {...register('name')} />
          <Input label="Domain" placeholder="acme.com" error={errors.domain?.message} {...register('domain')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Subscriptions modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name} — Subscriptions`} maxW="max-w-xl">
        <div className="space-y-4">
          {subs.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No subscriptions yet</p>
          ) : subs.map((s) => {
            const prod = products.find(p => p.id === s.product_id);
            const tier = tiers.find(t => t.id === s.tier_id);
            return (
              <div key={s.id} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-white">{prod?.name ?? s.product_id}</p>
                  <p className="text-xs text-zinc-500">{tier?.name ?? s.tier_id}</p>
                </div>
                <Badge variant={s.is_active ? 'success' : 'default'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={() => setShowSub(true)} full>+ Assign Subscription</Button>
        </div>
      </Modal>

      {/* Assign subscription modal */}
      <Modal open={showSub} onClose={() => setShowSub(false)} title="Assign Subscription">
        <form onSubmit={subForm.handleSubmit(onAssignSub)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Product</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...subForm.register('product_id')}>
              <option value="">Select product…</option>
              {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {subForm.formState.errors.product_id && <p className="text-xs text-red-400 mt-1">{subForm.formState.errors.product_id.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Tier</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...subForm.register('tier_id')}>
              <option value="">Select tier…</option>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {subForm.formState.errors.tier_id && <p className="text-xs text-red-400 mt-1">{subForm.formState.errors.tier_id.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowSub(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Assign</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};
