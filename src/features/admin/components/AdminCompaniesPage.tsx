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
import { extractErrorMessage } from '../../../utils/errorUtils';

// ── domain regex: acme.com, genworx.ai, kongu.edu, sec.ac.in, etc. ──────────
const DOMAIN_RE =
  /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

const companySchema = z.object({
  name:   z.string().min(2, 'Min 2 chars'),
  domain: z
    .string()
    .min(3, 'Domain is required')
    .regex(DOMAIN_RE, 'Enter a valid domain (e.g. acme.com, genworx.ai, kongu.edu, sec.ac.in)'),
});
type CompanyForm = z.infer<typeof companySchema>;

const editSchema = z.object({
  name:   z.string().min(2, 'Min 2 chars'),
  domain: z
    .string()
    .min(3, 'Domain is required')
    .regex(DOMAIN_RE, 'Enter a valid domain (e.g. acme.com, genworx.ai, kongu.edu, sec.ac.in)'),
});
type EditForm = z.infer<typeof editSchema>;

const subSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  tier_id:    z.string().min(1, 'Select tier'),
});
type SubForm = z.infer<typeof subSchema>;

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
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


export const AdminCompaniesPage: React.FC = () => {
  const [companies,  setCompanies]  = useState<CompanyResponse[]>([]);
  const [tiers,      setTiers]      = useState<TierResponse[]>([]);
  const [products,   setProducts]   = useState<ProductResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState<CompanyResponse | null>(null);
  const [subs,       setSubs]       = useState<SubscriptionResponse[]>([]);
  const [showSub,    setShowSub]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── edit state ────────────────────────────────────────────────────────────
  const [editTarget,  setEditTarget]  = useState<CompanyResponse | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  const subForm = useForm<SubForm>({ resolver: zodResolver(subSchema) });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

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

  // ── create ────────────────────────────────────────────────────────────────
  const onCreate = async (d: CompanyForm) => {
    try {
      setSubmitting(true);
      await adminAuthService.createCompany({ name: d.name, domain: d.domain });
      toast.success('Company created');
      reset();
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── open edit modal ───────────────────────────────────────────────────────
  const openEdit = (c: CompanyResponse) => {
    setEditTarget(c);
    editForm.reset({
      name:   c.name,
      domain: (c as any).domain ?? '',
    });
  };

  // ── submit edit ───────────────────────────────────────────────────────────
  const onEdit = async (d: EditForm) => {
    if (!editTarget) return;
    try {
      setEditSubmitting(true);
      await adminAuthService.updateCompany(editTarget.id, {
        name:   d.name,
        domain: d.domain,
      });
      toast.success('Company updated');
      setEditTarget(null);
      editForm.reset();
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── subscription actions ──────────────────────────────────────────────────
  const onAssignSub = async (d: SubForm) => {
    if (!selected) return;
    try {
      setSubmitting(true);
      await adminAuthService.assignSubscription(selected.id, d);
      toast.success('Subscription assigned');
      subForm.reset();
      setShowSub(false);
      loadSubs(selected);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteSub = async (sub: SubscriptionResponse) => {
    if (!selected || !confirm('Permanently delete this subscription?')) return;
    try {
      await adminAuthService.deleteSubscription(selected.id, sub.id);
      toast.success('Subscription deleted');
      loadSubs(selected);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const onDeleteCompany = async (c: CompanyResponse) => {
    if (!confirm(`Permanently delete "${c.name}"?`)) return;
    try {
      setDeletingId(c.id);
      await adminAuthService.deleteCompany(c.id);
      toast.success('Company deleted');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Companies">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Companies</h2>
            <p className="text-slate-500 text-sm mt-0.5">{companies.length} total</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Company
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          {/* Header row */}
          <div className="grid grid-cols-[1fr_200px_200px] px-6 py-3 bg-blue-600 border-slate-700">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Company</p>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Domain</p>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Actions</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : companies.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No companies yet</p>
            </div>
          ) : (
            companies.map((c, idx) => (
              <div
                key={c.id}
                className={`grid grid-cols-[1fr_200px_200px] items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                  !c.is_active ? 'bg-slate-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {/* Name */}
                <div>
                  <button
                    onClick={() => loadSubs(c)}
                    className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left"
                  >
                    {c.name}
                  </button>
                </div>

                {/* Domain */}
                <p className="text-sm text-slate-600 font-mono">{(c as any).domain ?? '—'}</p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadSubs(c)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Subscriptions
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => openEdit(c)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all"
                    title="Edit company"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 15H9v-3z" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  {c.is_active && (
                    <button
                      onClick={() => onDeleteCompany(c)}
                      disabled={deletingId === c.id}
                      className="bg-red-50 border border-red-200 hover:bg-red-600 hover:border-red-600 hover:text-white text-red-600 p-1.5 rounded-lg transition-all disabled:opacity-40"
                      title="Delete company"
                    >
                      {deletingId === c.id ? (
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
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Create Company Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Company">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input
            label="Company Name"
            placeholder="Acme Corp"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Domain *"
            placeholder="acme.com"
            error={errors.domain?.message}
            {...register('domain')}
          />
          <p className="text-xs text-slate-400 -mt-2">
            Examples: acme.com · genworx.ai · kongu.edu · sec.ac.in
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); reset(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Company'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Company Modal ── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); editForm.reset(); }}
        title="Edit Company"
      >
        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4" noValidate>
          <Input
            label="Company Name"
            placeholder="Acme Corp"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input
            label="Domain *"
            placeholder="acme.com"
            error={editForm.formState.errors.domain?.message}
            {...editForm.register('domain')}
          />
          <p className="text-xs text-slate-400 -mt-2">
            Examples: acme.com · genworx.ai · kongu.edu · sec.ac.in
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setEditTarget(null); editForm.reset(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {editSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Subscriptions Modal ── */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setSubs([]); }}
        title={selected?.name ?? ''}
        maxW="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Subscriptions
                </p>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {subs.length}
                </span>
              </div>

              {subs.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 text-sm">No subscriptions assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subs.map(s => {
                    const prod = products.find(p => p.id === s.product_id);
                    const tier = tiers.find(t => t.id === s.tier_id);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between rounded-xl p-4 border-2 ${
                          s.is_active
                            ? 'bg-white border-blue-100'
                            : 'bg-slate-50 border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {prod?.name ?? s.product_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {tier?.name ?? s.tier_id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        {s.is_active && (
                          <button
                            onClick={() => onDeleteSub(s)}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                            title="Delete subscription"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selected.is_active && (
              <button
                onClick={() => setShowSub(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign Subscription
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* ── Assign Subscription Modal ── */}
      <Modal open={showSub} onClose={() => { setShowSub(false); subForm.reset(); }} title="Assign Subscription">
        <form onSubmit={subForm.handleSubmit(onAssignSub)} className="space-y-4" noValidate>
          <Select label="Product" error={subForm.formState.errors.product_id?.message} {...subForm.register('product_id')}>
            <option value="">Select product…</option>
            {products.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select label="Tier" error={subForm.formState.errors.tier_id?.message} {...subForm.register('tier_id')}>
            <option value="">Select tier…</option>
            {tiers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowSub(false); subForm.reset(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};