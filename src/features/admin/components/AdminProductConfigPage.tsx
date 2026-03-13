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
import { ProductConfigResponse, ProductResponse } from '../../../types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 ring-red-200',
  high:     'bg-orange-100 text-orange-700 ring-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 ring-yellow-200',
  low:      'bg-blue-100 text-blue-700 ring-blue-200',
};

const schema = z.object({
  product_id:       z.string().min(1, 'Select product'),
  min_severity:     z.string().optional(),
  default_escalate: z.boolean(),
});
type Form = z.infer<typeof schema>;

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <select
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export const AdminProductConfigPage: React.FC = () => {
  const [configs,    setConfigs]    = useState<ProductConfigResponse[]>([]);
  const [products,   setProducts]   = useState<ProductResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<ProductConfigResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema), defaultValues: { default_escalate: false } });

  const watchEscalate = watch('default_escalate');

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        adminTicketService.listProductConfigs(),
        adminAuthService.listProducts(),   // ← direct from auth-service
      ]);
      setConfigs(c);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const productName = (id: string) =>
    products.find(p => p.id === id)?.name ?? id.slice(0, 8) + '…';

  const openCreate = () => {
    setEditing(null);
    reset({ default_escalate: false, product_id: '', min_severity: '' });
    setShowModal(true);
  };
  const openEdit = (c: ProductConfigResponse) => {
    setEditing(c);
    setValue('product_id',       c.product_id);
    setValue('min_severity',     c.min_severity ?? '');
    setValue('default_escalate', c.default_escalate);
    setShowModal(true);
  };
  const onClose = () => { setShowModal(false); setEditing(null); reset(); };

  const onSubmit = async (d: Form) => {
    try {
      setSubmitting(true);
      await adminTicketService.upsertProductConfig(d.product_id, {
        min_severity:     d.min_severity || undefined,
        default_escalate: d.default_escalate,
      });
      toast.success(editing ? 'Updated' : 'Created');
      onClose(); load();
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (productId: string) => {
    if (!confirm('Permanently delete this product config?')) return;
    try {
      setDeletingId(productId);
      await adminTicketService.deleteProductConfig(productId);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  // Products that don't have a config yet (for create dropdown)
  const configuredProductIds = configs.map(c => c.product_id);
  const availableProducts    = products.filter(p => !configuredProductIds.includes(p.id));

  return (
    <MainLayout navItems={adminNav} pageTitle="Product Config">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Product Config</h2>
            <p className="text-slate-500 text-sm mt-0.5">Min severity and escalation defaults per product</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Config
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">
          <div className="grid grid-cols-[1fr_160px_160px_120px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Product</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Min Severity</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Auto-Escalate</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Actions</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : configs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No product configs yet</p>
            </div>
          ) : (
            configs.map((c, idx) => (
              <div
                key={c.id}
                className={`grid grid-cols-[1fr_160px_160px_120px] items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {/* Product name */}
                <p className="text-sm font-semibold text-slate-900">{productName(c.product_id)}</p>

                {/* Min severity */}
                <div>
                  {c.min_severity ? (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 capitalize ${SEV_STYLE[c.min_severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.min_severity}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                {/* Auto-escalate */}
                <div>
                  {c.default_escalate ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full ring-1 bg-amber-100 text-amber-700 ring-amber-200">
                      Enabled
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full ring-1 bg-slate-100 text-slate-500 ring-slate-200">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(c.product_id)}
                    disabled={deletingId === c.product_id}
                    className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-40"
                    title="Delete config"
                  >
                    {deletingId === c.product_id ? (
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
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={onClose}
        title={editing ? 'Edit Product Config' : 'New Product Config'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

          {/* Product select — disabled when editing */}
          <Sel
            label="Product"
            disabled={!!editing}
            error={errors.product_id?.message}
            {...register('product_id')}
          >
            <option value="">Select product…</option>
            {editing
              ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              : availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </Sel>

          {/* Min severity */}
          <Sel label="Min Severity (optional)" {...register('min_severity')}>
            <option value="">No minimum</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </Sel>

          {/* Auto-escalate toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
              Auto-Escalate
            </label>
            <button
              type="button"
              onClick={() => setValue('default_escalate', !watchEscalate)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                watchEscalate ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  watchEscalate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <p className="text-xs text-slate-400 mt-1.5">
              {watchEscalate ? 'All tickets for this product will be auto-escalated' : 'No auto-escalation'}
            </p>
          </div>

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
              {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};