import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Input, Modal, PageLoader } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { ProductResponse, ProductConfigResponse } from '../../../types';
import { extractErrorMessage } from '../../../utils/errorUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITIES = ['critical', 'high', 'medium', 'low'];

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 ring-red-200',
  high:     'bg-orange-100 text-orange-700 ring-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 ring-yellow-200',
  low:      'bg-blue-100 text-blue-700 ring-blue-200',
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:        z.string().min(2, 'Min 2 chars'),
  code:        z.string().min(1, 'Required').max(100),
  description: z.string().min(1, 'Description is required').max(1000, 'Max 1000 chars'),
});
type ProductForm = z.infer<typeof productSchema>;

const editProductSchema = z.object({
  name:        z.string().min(2, 'Min 2 chars'),
  description: z.string().min(1, 'Description is required').max(1000, 'Max 1000 chars'),
});
type EditProductForm = z.infer<typeof editProductSchema>;

const configSchema = z.object({
  min_severity:     z.string().optional(),
  default_escalate: z.boolean(),
});
type ConfigForm = z.infer<typeof configSchema>;

// ─── Helper components ────────────────────────────────────────────────────────

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

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }> = ({
  label, error, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <textarea
      rows={3}
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminProductsPage: React.FC = () => {
  const [products,    setProducts]    = useState<ProductResponse[]>([]);
  const [configs,     setConfigs]     = useState<ProductConfigResponse[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Create
  const [showCreate,  setShowCreate]  = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  // Edit
  const [editTarget,     setEditTarget]     = useState<ProductResponse | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Config
  const [showConfig,   setShowConfig]   = useState(false);
  const [configTarget, setConfigTarget] = useState<ProductResponse | null>(null);
  const [editingCfg,   setEditingCfg]   = useState<ProductConfigResponse | null>(null);
  const [savingCfg,    setSavingCfg]    = useState(false);
  const [deletingCfg,  setDeletingCfg]  = useState<string | null>(null);

  // Forms
  const {
    register: regProduct,
    handleSubmit: handleProduct,
    reset: resetProduct,
    formState: { errors: productErrors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const {
    register: regEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditProductForm>({ resolver: zodResolver(editProductSchema) });

  const {
    register: regConfig,
    handleSubmit: handleConfig,
    reset: resetConfig,
    setValue: setConfigVal,
    watch: watchConfig,
  } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: { default_escalate: false },
  });

  const watchEscalate = watchConfig('default_escalate');

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        adminAuthService.listProducts(),
        adminTicketService.listProductConfigs(),
      ]);
      setProducts(p);
      setConfigs(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getConfig = (productId: string) =>
    configs.find(c => c.product_id === productId) ?? null;

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const onCreate = async (d: ProductForm) => {
    try {
      setSubmitting(true);
      await adminAuthService.createProduct(d);
      toast.success('Product created');
      resetProduct(); setShowCreate(false); load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: ProductResponse) => {
    setEditTarget(p);
    resetEdit({
      name:        p.name,
      description: p.description ?? '',
    });
  };

  const onEdit = async (d: EditProductForm) => {
    if (!editTarget) return;
    try {
      setEditSubmitting(true);
      await adminAuthService.updateProduct(editTarget.id, {
        name:        d.name,
        description: d.description,
      });
      toast.success('Product updated');
      setEditTarget(null); resetEdit(); load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDeleteProduct = async (p: ProductResponse) => {
    if (!confirm(`Permanently delete "${p.name}"?`)) return;
    try {
      setDeletingId(p.id);
      await adminAuthService.deleteProduct(p.id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Config CRUD ───────────────────────────────────────────────────────────

  const openConfigModal = (product: ProductResponse) => {
    const existing = getConfig(product.id);
    setConfigTarget(product);
    setEditingCfg(existing);
    resetConfig({
      min_severity:     existing?.min_severity ?? '',
      default_escalate: existing?.default_escalate ?? false,
    });
    setShowConfig(true);
  };

  const onSaveConfig = async (d: ConfigForm) => {
    if (!configTarget) return;
    try {
      setSavingCfg(true);
      await adminTicketService.upsertProductConfig(configTarget.id, {
        min_severity:     d.min_severity || undefined,
        default_escalate: d.default_escalate,
      });
      toast.success(editingCfg ? 'Config updated' : 'Config created');
      setShowConfig(false); setConfigTarget(null); setEditingCfg(null); load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingCfg(false);
    }
  };

  const onDeleteConfig = async (productId: string) => {
    if (!confirm('Remove config for this product?')) return;
    try {
      setDeletingCfg(productId);
      await adminTicketService.deleteProductConfig(productId);
      toast.success('Config removed');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingCfg(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <MainLayout navItems={adminNav} pageTitle="Products">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Products</h2>
            <p className="text-slate-500 text-sm mt-0.5">{products.length} total</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Product
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          {/* Table header */}
          <div className="grid grid-cols-[1fr_110px_220px_130px_140px_180px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Product</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Code</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Description</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Min Severity</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Auto-Escalate</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Actions</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No products yet</p>
            </div>
          ) : (
            products.map((p, idx) => {
              const cfg = getConfig(p.id);
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[1fr_110px_220px_130px_140px_180px] items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {/* Name */}
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>

                  {/* Code */}
                  <p className="text-sm font-mono text-slate-600">{p.code}</p>

                  {/* Description */}
                  <p
                    className="text-sm text-slate-500 truncate pr-4"
                    title={p.description ?? ''}
                  >
                    {p.description
                      ? p.description.length > 55
                        ? p.description.slice(0, 55) + '…'
                        : p.description
                      : <span className="text-slate-300">—</span>
                    }
                  </p>

                  {/* Min severity */}
                  <div>
                    {cfg?.min_severity ? (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 capitalize ${SEV_STYLE[cfg.min_severity] ?? 'bg-slate-100 text-slate-600'}`}>
                        {cfg.min_severity}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>

                  {/* Auto-escalate */}
                  <div>
                    {cfg ? (
                      cfg.default_escalate ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full ring-1 bg-amber-100 text-amber-700 ring-amber-200">
                          Enabled
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full ring-1 bg-slate-100 text-slate-500 ring-slate-200">
                          Disabled
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">

                    {/* Config button */}
                    <button
                      onClick={() => openConfigModal(p)}
                      className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {cfg ? 'Config' : '+ Config'}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                      title="Edit product"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 15H9v-3z" />
                      </svg>
                    </button>

                    {/* Remove config */}
                    {cfg && (
                      <button
                        onClick={() => onDeleteConfig(p.id)}
                        disabled={deletingCfg === p.id}
                        className="p-1.5 rounded-lg text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all disabled:opacity-40"
                        title="Remove config"
                      >
                        {deletingCfg === p.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Delete product */}
                    <button
                      onClick={() => onDeleteProduct(p)}
                      disabled={deletingId === p.id}
                      className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-40"
                      title="Delete product"
                    >
                      {deletingId === p.id ? (
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
              );
            })
          )}
        </div>
      </div>

      {/* ── Create Product Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetProduct(); }} title="New Product">
        <form onSubmit={handleProduct(onCreate)} className="space-y-4" noValidate>
          <Input
            label="Product Name *"
            placeholder="e.g. Cloud Platform"
            error={productErrors.name?.message}
            {...regProduct('name')}
          />
          <Input
            label="Code *"
            placeholder="e.g. CLOUD_PLT"
            error={productErrors.code?.message}
            {...regProduct('code')}
          />
          <Textarea
            label="Description *"
            placeholder="Describe this product…"
            error={productErrors.description?.message}
            {...regProduct('description')}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetProduct(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); resetEdit(); }}
        title={`Edit — ${editTarget?.name ?? ''}`}
      >
        <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4" noValidate>
          <Input
            label="Product Name *"
            placeholder="e.g. Cloud Platform"
            error={editErrors.name?.message}
            {...regEdit('name')}
          />
          <Textarea
            label="Description *"
            placeholder="Describe this product…"
            error={editErrors.description?.message}
            {...regEdit('description')}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setEditTarget(null); resetEdit(); }}
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

      {/* ── Product Config Modal ── */}
      <Modal
        open={showConfig}
        onClose={() => { setShowConfig(false); setConfigTarget(null); setEditingCfg(null); resetConfig(); }}
        title={editingCfg ? `Edit Config — ${configTarget?.name}` : `Add Config — ${configTarget?.name}`}
      >
        <form onSubmit={handleConfig(onSaveConfig)} className="space-y-4" noValidate>
          <Sel label="Min Severity (optional)" {...regConfig('min_severity')}>
            <option value="">No minimum</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </Sel>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
              Auto-Escalate
            </label>
            <button
              type="button"
              onClick={() => setConfigVal('default_escalate', !watchEscalate)}
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
              {watchEscalate
                ? 'All tickets for this product will be auto-escalated'
                : 'No auto-escalation'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowConfig(false); setConfigTarget(null); setEditingCfg(null); resetConfig(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCfg}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingCfg ? 'Saving…' : editingCfg ? 'Update Config' : 'Save Config'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};