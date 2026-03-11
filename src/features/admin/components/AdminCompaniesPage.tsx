import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { CompanyResponse, SubscriptionResponse, TierResponse, ProductResponse } from '../../../types';

const companySchema = z.object({
  name:   z.string().min(2, 'Min 2 chars'),
  domain: z.string().min(3, 'e.g. acme.com').optional().or(z.literal('')),
});
type CompanyForm = z.infer<typeof companySchema>;

const subSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  tier_id:    z.string().min(1, 'Select tier'),
});
type SubForm = z.infer<typeof subSchema>;

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">{label}</label>
    <select
      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white"
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const AdminCompaniesPage: React.FC = () => {
  const [companies, setCompanies]   = useState<CompanyResponse[]>([]);
  const [tiers, setTiers]           = useState<TierResponse[]>([]);
  const [products, setProducts]     = useState<ProductResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState<CompanyResponse | null>(null);
  const [subs, setSubs]             = useState<SubscriptionResponse[]>([]);
  const [showSub, setShowSub]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CompanyForm>({ resolver: zodResolver(companySchema) });
  const subForm = useForm<SubForm>({ resolver: zodResolver(subSchema) });

  const load = async () => {
    setLoading(true);
    try { setCompanies(await adminAuthService.listCompanies()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    adminAuthService.listTiers().then(setTiers);
    adminAuthService.listProducts().then(setProducts);
  }, []);

  const loadSubs = async (c: CompanyResponse) => {
    setSelected(c);
    setSubs(await adminAuthService.listSubscriptions(c.id));
  };

  const onCreate = async (d: CompanyForm) => {
    try {
      setSubmitting(true);
      await adminAuthService.createCompany({ name: d.name, domain: d.domain || undefined });
      toast.success('Company created');
      reset(); setShowCreate(false); load();
    } catch { toast.error('Failed to create company'); }
    finally { setSubmitting(false); }
  };

  const onAssignSub = async (d: SubForm) => {
    if (!selected) return;
    try {
      setSubmitting(true);
      await adminAuthService.assignSubscription(selected.id, d);
      toast.success('Subscription assigned');
      subForm.reset(); setShowSub(false); loadSubs(selected);
    } catch { toast.error('Failed to assign subscription'); }
    finally { setSubmitting(false); }
  };

  const onToggle = async (c: CompanyResponse) => {
    try {
      await adminAuthService.updateCompany(c.id, { is_active: !c.is_active });
      toast.success('Updated'); load();
    } catch { toast.error('Failed'); }
  };

  const onDeactivateSub = async (sub: SubscriptionResponse) => {
    if (!selected || !confirm('Deactivate this subscription?')) return;
    try {
      await adminAuthService.updateSubscription(selected.id, sub.id, { is_active: false });
      toast.success('Subscription deactivated');
      loadSubs(selected);
    } catch { toast.error('Failed'); }
  };

  return (  
    <MainLayout navItems={adminNav} pageTitle="Companies">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
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
            <div className="w-36" />
          </div>
          {loading ? <PageLoader /> : companies.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No companies yet</p></div>
          ) : companies.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
              <div className="flex-1">
                <button onClick={() => loadSubs(c)} className="text-sm font-medium text-white hover:text-zinc-300 text-left">
                  {c.name}
                </button>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">{c.id.slice(0,8)}…</p>
              </div>
              <div className="w-40 text-xs text-zinc-400">{(c as any).domain ?? '—'}</div>
              <div className="w-20">
                <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="w-36 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => loadSubs(c)}>Subs</Button>
                <Button size="sm" variant={c.is_active ? 'danger' : 'secondary'} onClick={() => onToggle(c)}>
                  {c.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create company */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Company">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Company Name" placeholder="Acme Corp" error={errors.name?.message} {...register('name')} />
          <Input label="Domain (optional)" placeholder="acme.com" error={errors.domain?.message} {...register('domain')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Subscriptions panel */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name} — Subscriptions`} maxW="max-w-xl">
        <div className="space-y-3">
          {subs.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No subscriptions yet</p>
          ) : subs.map(s => {
            const prod = products.find(p => p.id === s.product_id);
            const tier = tiers.find(t => t.id === s.tier_id);
            return (
              <div key={s.id} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-white">{prod?.name ?? s.product_id.slice(0,8)}</p>
                  <p className="text-xs text-zinc-500">{tier?.name ?? s.tier_id.slice(0,8)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.is_active ? 'success' : 'default'}>{s.is_active ? 'Active' : 'Off'}</Badge>
                  {s.is_active && (
                    <Button size="sm" variant="danger" onClick={() => onDeactivateSub(s)}>Off</Button>
                  )}
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={() => setShowSub(true)} full>+ Assign Subscription</Button>
        </div>
      </Modal>

      {/* Assign sub */}
      <Modal open={showSub} onClose={() => setShowSub(false)} title="Assign Subscription">
        <form onSubmit={subForm.handleSubmit(onAssignSub)} className="space-y-4" noValidate>
          <Select label="Product" error={subForm.formState.errors.product_id?.message} {...subForm.register('product_id')}>
            <option value="">Select product…</option>
            {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Tier" error={subForm.formState.errors.tier_id?.message} {...subForm.register('tier_id')}>
            <option value="">Select tier…</option>
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowSub(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Assign</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};